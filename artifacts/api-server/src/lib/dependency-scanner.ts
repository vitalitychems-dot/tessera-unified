import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";
import { storeMemory } from "./vector-memory";
import { runQuarantineGate } from "./quarantine-gate";

export interface DependencyKnowledge {
  name: string;
  version?: string;
  description?: string;
  apiSurface: string[];
  patterns: string[];
  capabilities: string[];
  embeddingId?: number;
  scannedAt: Date;
}

const scannedDeps: Map<string, DependencyKnowledge> = new Map();
let scanComplete = false;
let scanRunning = false;

function findPackageJson(startDir: string): string | null {
  const candidates = [
    path.join(startDir, "package.json"),
    path.join(startDir, "artifacts/api-server/package.json"),
    path.join(startDir, "../../package.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function extractReadmeSummary(readmePath: string): string {
  try {
    const content = fs.readFileSync(readmePath, "utf8");
    const lines = content.split("\n").filter(l => l.trim());
    const summary = lines
      .filter(l => !l.startsWith("#") || l.startsWith("## "))
      .slice(0, 20)
      .join(" ")
      .replace(/[*#`\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000);
    return summary;
  } catch {
    return "";
  }
}

function extractTypesSummary(typesPath: string): string[] {
  try {
    const content = fs.readFileSync(typesPath, "utf8");
    const exports: string[] = [];

    const exportMatches = content.matchAll(/export\s+(?:function|class|const|type|interface|enum)\s+(\w+)/g);
    for (const m of exportMatches) {
      exports.push(m[1]);
    }

    const declareMatches = content.matchAll(/declare\s+(?:function|class|const)\s+(\w+)/g);
    for (const m of declareMatches) {
      exports.push(m[1]);
    }

    return [...new Set(exports)].slice(0, 50);
  } catch {
    return [];
  }
}

const DEP_KNOWLEDGE: Record<string, { patterns: string[]; capabilities: string[]; apiSurface: string[] }> = {
  "express": {
    patterns: ["Router pattern", "Middleware chain", "Request/Response cycle", "Route parameters", "Error handling middleware"],
    capabilities: ["HTTP server", "REST API", "Middleware", "Routing", "Static files", "JSON parsing", "CORS"],
    apiSurface: ["express()", "app.use()", "app.get()", "app.post()", "app.put()", "app.delete()", "Router()", "req.params", "req.body", "req.query", "res.json()", "res.status()", "res.send()"],
  },
  "drizzle-orm": {
    patterns: ["Query builder pattern", "Schema-first design", "Type-safe queries", "Migrations", "Relations"],
    capabilities: ["PostgreSQL ORM", "Type-safe SQL", "Schema migrations", "Query building", "Relations", "Transactions"],
    apiSurface: ["pgTable()", "serial()", "text()", "integer()", "jsonb()", "timestamp()", "db.select()", "db.insert()", "db.update()", "db.delete()", "db.execute()", "eq()", "desc()", "sql``"],
  },
  "ws": {
    patterns: ["WebSocket server pattern", "Broadcast pattern", "Heartbeat pattern", "Message queue pattern"],
    capabilities: ["WebSocket server", "Real-time communication", "Binary data", "Client management", "Event-driven"],
    apiSurface: ["new WebSocket.Server()", "wss.on('connection')", "ws.send()", "ws.on('message')", "ws.on('close')", "ws.readyState", "WebSocket.OPEN"],
  },
  "pino": {
    patterns: ["Structured logging", "Child logger pattern", "Log levels", "JSON output"],
    capabilities: ["Fast structured logging", "Multiple transports", "Child loggers", "Log levels", "Pretty printing"],
    apiSurface: ["pino()", "logger.info()", "logger.error()", "logger.warn()", "logger.debug()", "logger.child()", "logger.level"],
  },
  "openai": {
    patterns: ["Chat completion pattern", "Streaming pattern", "Function calling pattern", "Embedding pattern"],
    capabilities: ["Chat completions", "Text embeddings", "Image generation", "Speech to text", "Function calling", "Streaming"],
    apiSurface: ["new OpenAI()", "client.chat.completions.create()", "client.embeddings.create()", "client.images.generate()", "model", "messages", "stream"],
  },
  "zod": {
    patterns: ["Schema validation", "Type inference", "Error handling", "Transformation"],
    capabilities: ["Runtime type validation", "TypeScript type inference", "Schema composition", "Error messages", "Transformations"],
    apiSurface: ["z.string()", "z.number()", "z.object()", "z.array()", "z.union()", "z.optional()", ".parse()", ".safeParse()", ".refine()", ".transform()"],
  },
  "cors": {
    patterns: ["CORS middleware pattern", "Origin whitelist", "Preflight handling"],
    capabilities: ["Cross-Origin Resource Sharing", "Origin control", "Header management", "Preflight responses"],
    apiSurface: ["cors()", "cors({ origin })", "cors({ credentials })", "cors({ methods })"],
  },
  "@tanstack/react-query": {
    patterns: ["Query caching pattern", "Mutation pattern", "Optimistic updates", "Polling pattern"],
    capabilities: ["Server state management", "Caching", "Background refetching", "Pagination", "Infinite scroll"],
    apiSurface: ["useQuery()", "useMutation()", "useQueryClient()", "QueryClient", "QueryClientProvider", "queryKey", "queryFn", "refetchInterval"],
  },
  "react": {
    patterns: ["Component pattern", "Hooks pattern", "Context pattern", "Composition pattern"],
    capabilities: ["UI rendering", "State management", "Side effects", "Context propagation", "Event handling"],
    apiSurface: ["useState()", "useEffect()", "useContext()", "useRef()", "useCallback()", "useMemo()", "React.FC", "JSX"],
  },
};

async function scanDependency(name: string, nodeModulesPath: string): Promise<DependencyKnowledge | null> {
  const depPath = path.join(nodeModulesPath, name);
  if (!fs.existsSync(depPath)) return null;

  const known = DEP_KNOWLEDGE[name];
  const apiSurface = known?.apiSurface || [];
  const patterns = known?.patterns || [];
  const capabilities = known?.capabilities || [];

  let description = `${name} npm package`;

  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(depPath, "package.json"), "utf8"));
    description = pkgJson.description || description;
  } catch {}

  const readmeCandidates = ["README.md", "readme.md", "README.txt"];
  let readmeSummary = "";
  for (const rname of readmeCandidates) {
    const rpath = path.join(depPath, rname);
    if (fs.existsSync(rpath)) {
      readmeSummary = extractReadmeSummary(rpath);
      break;
    }
  }

  const typesCandidates = [
    path.join(depPath, "index.d.ts"),
    path.join(depPath, "dist", "index.d.ts"),
    path.join(depPath, "types", "index.d.ts"),
  ];
  let typedExports: string[] = [];
  for (const tp of typesCandidates) {
    if (fs.existsSync(tp)) {
      typedExports = extractTypesSummary(tp);
      break;
    }
  }

  const finalApiSurface = [...new Set([...apiSurface, ...typedExports])].slice(0, 60);

  const knowledgeContent = [
    `Package: ${name}`,
    `Description: ${description}`,
    readmeSummary ? `Overview: ${readmeSummary}` : "",
    capabilities.length ? `Capabilities: ${capabilities.join(", ")}` : "",
    patterns.length ? `Design patterns: ${patterns.join(", ")}` : "",
    finalApiSurface.length ? `Key API surface: ${finalApiSurface.slice(0, 20).join(", ")}` : "",
  ].filter(Boolean).join(". ");

  return {
    name,
    description,
    apiSurface: finalApiSurface,
    patterns,
    capabilities,
    scannedAt: new Date(),
  };
}

function readDepsFromPackageJson(): string[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "package.json"),
    path.join(cwd, "artifacts/api-server/package.json"),
    "/home/runner/workspace/artifacts/api-server/package.json",
    "/home/runner/workspace/package.json",
  ];

  const allDeps = new Set<string>();

  for (const pkgPath of candidates) {
    try {
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      for (const dep of Object.keys(pkg.dependencies || {})) {
        if (!dep.startsWith("@workspace/")) allDeps.add(dep);
      }
      for (const dep of Object.keys(pkg.devDependencies || {})) {
        if (!dep.startsWith("@workspace/")) allDeps.add(dep);
      }
    } catch {}
  }

  return [...allDeps];
}

export async function runDependencyScan(force = false): Promise<{ scanned: number; stored: number; errors: string[] }> {
  if (scanRunning) return { scanned: 0, stored: 0, errors: ["Scan already running"] };
  if (scanComplete && !force) return { scanned: scannedDeps.size, stored: scannedDeps.size, errors: [] };

  scanRunning = true;
  const errors: string[] = [];
  let stored = 0;

  try {
    const cwd = process.cwd();
    const nodeModulesCandidates = [
      path.join(cwd, "node_modules"),
      path.join(cwd, "../../node_modules"),
      "/home/runner/workspace/node_modules",
    ];

    let nodeModulesPath = "";
    for (const p of nodeModulesCandidates) {
      if (fs.existsSync(p)) { nodeModulesPath = p; break; }
    }

    const realDeps = readDepsFromPackageJson();
    const knownDeps = Object.keys(DEP_KNOWLEDGE);
    const depsToScan = [...new Set([...realDeps, ...knownDeps])];

    logger.info({ realDeps: realDeps.length, knownDeps: knownDeps.length, total: depsToScan.length }, "Dependency scanner: enumerating from package.json");

    for (const depName of depsToScan) {
      try {
        const knowledge = await scanDependency(depName, nodeModulesPath || "/home/runner/workspace/node_modules");
        if (!knowledge) continue;

        const content = [
          `Package: ${knowledge.name}`,
          `Description: ${knowledge.description}`,
          knowledge.capabilities.length ? `Capabilities: ${knowledge.capabilities.join(", ")}` : "",
          knowledge.patterns.length ? `Design patterns: ${knowledge.patterns.join(", ")}` : "",
          knowledge.apiSurface.length ? `API surface: ${knowledge.apiSurface.slice(0, 20).join(", ")}` : "",
        ].filter(Boolean).join(". ");

        const quarantineResult = await runQuarantineGate(content, `dependency-scanner:${depName}`);
        if (quarantineResult.decision !== "rejected") {
          const embeddingId = await storeMemory({
            content: quarantineResult.content,
            source: "dependency-scanner",
            category: "dependency-knowledge",
            metadata: { packageName: depName, apiSurfaceCount: knowledge.apiSurface.length, patternCount: knowledge.patterns.length },
          });
          knowledge.embeddingId = embeddingId;
          stored++;
        }

        scannedDeps.set(depName, knowledge);
      } catch (err) {
        errors.push(`${depName}: ${(err as Error).message}`);
      }
    }

    scanComplete = true;
    logger.info({ scanned: scannedDeps.size, stored, errors: errors.length }, "Dependency scan complete");
  } catch (err) {
    errors.push(`Scan error: ${(err as Error).message}`);
  } finally {
    scanRunning = false;
  }

  return { scanned: scannedDeps.size, stored, errors };
}

export function getScannedDependencies(): DependencyKnowledge[] {
  return Array.from(scannedDeps.values());
}

export function getDependencyKnowledge(name: string): DependencyKnowledge | undefined {
  return scannedDeps.get(name);
}

export function isDependencyScanComplete(): boolean {
  return scanComplete;
}
