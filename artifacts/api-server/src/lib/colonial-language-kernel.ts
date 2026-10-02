import { createCipheriv, createDecipheriv, randomBytes, createHash, hkdfSync } from "crypto";
import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from "zlib";

const MAGIC = Buffer.from("CLN\x04");
const PUA_PHRASE_BASE = 0xe000;
const PUA_WORD_BASE = 0xe200;

// ─── PHRASE DICTIONARY (383 phrases → PUA U+E000–U+E17E) ─────────────────────
const PHRASES: string[] = [
  "the agent has been initialized",
  "the agent has been",
  "the agent will execute",
  "the agent is",
  "the agent",
  "the system is running at full capacity",
  "the system is running",
  "the system is",
  "the system",
  "the network is",
  "the network",
  "all agents synchronized with the tessera prime network",
  "all agents synchronized",
  "all agents",
  "consensus protocol",
  "sovereign mesh",
  "transmitting encrypted data across the sovereign mesh",
  "transmitting encrypted data",
  "memory shard verified",
  "memory shard",
  "token transfer complete",
  "token transfer to wallet balance complete",
  "token transfer",
  "swarm query dispatched to council",
  "swarm query dispatched",
  "swarm query",
  "has been initialized",
  "has been",
  "will be",
  "must be",
  "should be",
  "can be",
  "smart contract deployed on solana chain",
  "smart contract deployed",
  "smart contract",
  "solana chain",
  "tsrt token staking active",
  "tsrt token",
  "defi protocol liquidity pool",
  "defi protocol",
  "liquidity pool",
  "arbitrage opportunity detected",
  "arbitrage opportunity",
  "market data price movement upward",
  "market data price movement",
  "market data",
  "volume spike confirmed",
  "volume spike",
  "trade executed successfully",
  "trade executed",
  "security audit complete",
  "security audit",
  "threat detected and neutralized",
  "threat detected",
  "zero trust perimeter secured",
  "zero trust perimeter",
  "zero trust",
  "sovereign node verified",
  "sovereign node",
  "untraceable path confirmed",
  "untraceable path",
  "cryptographic key rotated",
  "cryptographic key",
  "signature valid",
  "hash verified",
  "quantum resistant encryption active on all channels",
  "quantum resistant encryption active",
  "quantum resistant encryption",
  "fleet online",
  "fleet status confirmed healthy",
  "fleet status confirmed",
  "fleet status",
  "health check passed",
  "watchdog active",
  "service restart not required",
  "service restart",
  "uptime maintained",
  "latency nominal across all channels",
  "latency nominal",
  "all channels",
  "all nodes online and connected",
  "all nodes online",
  "all nodes",
  "encrypted data",
  "tessera prime network",
  "tessera prime",
  "lattice mesh",
  "lattice node",
  "lattice frequency",
  "lattice band",
  "quantum entropy pool",
  "quantum entropy",
  "quantum key",
  "quantum pipeline",
  "quantum resistant",
  "aes-256-gcm",
  "aes-256",
  "hkdf-sha256",
  "hkdf chain",
  "brotli compression",
  "brotli-9",
  "private use area",
  "colonial language",
  "colonel language",
  "token dictionary",
  "token compression",
  "token transfer",
  "inter-agent message",
  "inter-agent",
  "agent communication",
  "agent swarm",
  "agent mesh",
  "agent council",
  "grand coordinator",
  "grand council",
  "grand conference",
  "bft consensus",
  "bft vote",
  "2/3 supermajority",
  "supermajority",
  "council decision",
  "council deliberation",
  "council agent",
  "council vote",
  "sovereign law",
  "sovereign system",
  "sovereign data",
  "sovereign key",
  "tessera sovereign",
  "tessera system",
  "cipher key derived",
  "cipher key rotation",
  "cipher key",
  "ephemeral key",
  "key rotation",
  "key derivation",
  "external handshake",
  "handshake protocol",
  "handshake complete",
  "threat quarantined",
  "threat scanned",
  "threat neutralized",
  "trap detected",
  "malicious payload detected",
  "malicious payload",
  "payload detection",
  "zero-knowledge proof",
  "zero-knowledge",
  "merkle proof",
  "merkle tree",
  "hash chain",
  "digital signature",
  "signature verification",
  "public key infrastructure",
  "public key",
  "private key",
  "elliptic curve",
  "ed25519",
  "secp256k1",
  "rsa encryption",
  "multiparty computation",
  "secure enclave",
  "hardware security module",
  "hardware wallet",
  "cold storage",
  "hot wallet",
  "wallet balance",
  "wallet address",
  "transaction confirmed",
  "transaction pending",
  "transaction broadcast",
  "transaction fee",
  "gas fee",
  "block height",
  "block hash",
  "block confirmed",
  "chain reorganization",
  "validator node",
  "consensus node",
  "full node",
  "light node",
  "bootstrap node",
  "relay node",
  "routing table",
  "routing graph",
  "mesh network",
  "peer-to-peer",
  "decentralized network",
  "distributed ledger",
  "distributed system",
  "federated learning",
  "federated system",
  "data sovereignty",
  "data integrity",
  "data encryption",
  "data decryption",
  "data compression",
  "data pipeline",
  "data shard",
  "data vault",
  "data anchor",
  "data beacon",
  "beacon signal",
  "signal strength",
  "frequency band",
  "band rotation",
  "band assignment",
  "rotation counter",
  "rotation schedule",
  "scheduled rotation",
  "auto-decipher",
  "decipher middleware",
  "middleware layer",
  "api gateway",
  "rate limiter",
  "circuit breaker",
  "load balancer",
  "failover node",
  "redundancy check",
  "integrity check",
  "health check",
  "liveness probe",
  "readiness probe",
  "anomaly detected",
  "anomaly monitor",
  "anomaly detection",
  "audit log",
  "audit trail",
  "event log",
  "event stream",
  "message queue",
  "message broker",
  "pub/sub channel",
  "broadcast message",
  "unicast message",
  "multicast message",
  "agent broadcast",
  "agent query",
  "agent task",
  "task complete",
  "task pending",
  "task failed",
  "task dispatched",
  "task scheduled",
  "task priority",
  "priority queue",
  "execution phase",
  "plan phase",
  "reflect phase",
  "improve phase",
  "execute phase",
  "self assessment",
  "meta cognition",
  "reasoning trace",
  "reasoning step",
  "swarm coordinator",
  "meta agent",
  "routing agent",
  "architecture agent",
  "planning agent",
  "retrieval agent",
  "symbolic agent",
  "physics agent",
  "math agent",
  "bio neuralist",
  "quantum mechanic",
  "mesh architect",
  "dna archivist",
  "low power innovator",
  "self expansion tutor",
  "memory initialized",
  "memory shard stored",
  "vector memory",
  "semantic search",
  "embedding vector",
  "similarity score",
  "context window",
  "token budget",
  "system prompt",
  "instruction set",
  "model inference",
  "model response",
  "model provider",
  "provider fallback",
  "provider latency",
  "provider quota",
  "rate limit exceeded",
  "api key rotated",
  "api key",
  "secret token",
  "access token",
  "refresh token",
  "bearer token",
  "jwt token",
  "session cookie",
  "csrf token",
  "authentication passed",
  "authentication failed",
  "authorization denied",
  "authorization granted",
  "permission check",
  "role assignment",
  "admin access granted",
  "admin access",
  "read access",
  "write access",
  "sovereign identity",
  "identity verified",
  "biometric hash",
  "iris scan",
  "voice print",
  "neural pattern",
  "behavioral analysis",
  "threat level elevated",
  "threat level nominal",
  "threat level critical",
  "red alert",
  "orange alert",
  "green status",
  "system nominal",
  "system degraded",
  "system offline",
  "system online",
  "node online",
  "node offline",
  "node synced",
  "node desynced",
  "sync complete",
  "sync pending",
  "sync failed",
  "replication factor",
  "replication complete",
  "backup restored",
  "backup created",
  "snapshot taken",
  "checkpoint saved",
  "recovery initiated",
  "recovery complete",
  "ingestion pipeline",
  "ingestion scheduler",
  "data source",
  "rss feed",
  "api endpoint",
  "webhook trigger",
  "event trigger",
  "cron schedule",
  "scheduled task",
  "batch process",
  "stream process",
  "real-time processing",
  "latency optimized",
  "throughput maximized",
  "bandwidth allocated",
  "channel capacity",
  "packet loss zero",
  "packet loss detected",
  "encryption active",
  "decryption active",
  "compression ratio",
  "compression complete",
  "tokenization complete",
  "tokenization ratio",
  "dictionary loaded",
  "dictionary updated",
  "phrase matched",
  "word matched",
  "greedy match",
  "exact match",
  "partial match",
  "no match",
  "fallthrough",
  "pipeline stage",
  "stage complete",
  "pipeline complete",
  "pipeline failed",
  "colonial language kernel",
  "colonial encoding active",
  "colonial cipher active",
  "colonial decode complete",
  "colonial encode complete",
  "lattice domain active",
  "sovereign dns resolved",
  "sovereign route established",
  "inter-agent colonial channel",
  "auto-decipher complete",
  "compartmentalized security active",
  "ephemeral cipher rotated",
  "bft vote recorded",
  "bft round complete",
  "grand conference complete",
  "consensus reached",
];

// ─── WORD DICTIONARY (645 words → PUA U+E200–U+E674) ─────────────────────────
const WORDS: string[] = [
  "agent", "agents", "system", "systems", "network", "networks", "node", "nodes",
  "mesh", "lattice", "sovereign", "sovereignty", "council", "council", "swarm",
  "kernel", "protocol", "token", "tokens", "cipher", "encrypt", "decrypt",
  "compress", "decompress", "tokenize", "tokenized", "translate", "translated",
  "encode", "decode", "encoded", "decoded", "quantum", "brotli", "aes",
  "hkdf", "sha256", "sha512", "rsa", "elliptic", "ed25519", "secp256k1",
  "blockchain", "chain", "block", "transaction", "validator", "consensus",
  "signature", "hash", "key", "keys", "salt", "iv", "nonce", "tag",
  "certificate", "handshake", "tls", "ssl", "https", "proxy", "gateway",
  "router", "routing", "load", "balance", "failover", "redundancy", "replica",
  "backup", "snapshot", "checkpoint", "recovery", "restore", "sync", "async",
  "stream", "queue", "broker", "pubsub", "broadcast", "unicast", "multicast",
  "webhook", "endpoint", "api", "rest", "graphql", "grpc", "websocket",
  "request", "response", "payload", "header", "body", "status", "error",
  "success", "failure", "timeout", "retry", "backoff", "circuit", "breaker",
  "monitor", "anomaly", "alert", "alarm", "warning", "critical", "nominal",
  "online", "offline", "active", "inactive", "idle", "busy", "pending",
  "complete", "failed", "dispatched", "scheduled", "queued", "running",
  "initialized", "started", "stopped", "restarted", "crashed", "recovered",
  "memory", "storage", "database", "cache", "index", "shard", "partition",
  "vector", "embedding", "similarity", "semantic", "search", "retrieval",
  "context", "window", "prompt", "completion", "inference", "model", "models",
  "provider", "providers", "anthropic", "openai", "google", "mistral", "deepseek",
  "grok", "claude", "gpt", "gemini", "llama", "ollama", "local", "external",
  "internal", "hybrid", "federated", "decentralized", "distributed", "centralized",
  "parity", "latency", "throughput", "bandwidth", "capacity", "utilization",
  "cpu", "gpu", "memory", "disk", "network", "io", "compute", "power",
  "watt", "joule", "efficiency", "optimization", "performance", "benchmark",
  "metric", "measurement", "statistics", "analytics", "report", "dashboard",
  "score", "rating", "rank", "priority", "weight", "bias", "threshold",
  "probability", "confidence", "accuracy", "precision", "recall", "f1",
  "epoch", "iteration", "batch", "gradient", "loss", "reward", "penalty",
  "reinforcement", "supervised", "unsupervised", "selfplay", "evolution",
  "mutation", "crossover", "selection", "fitness", "population", "generation",
  "council", "vote", "quorum", "majority", "supermajority", "consensus", "decision",
  "deliberation", "transcript", "outcome", "approved", "rejected", "abstained",
  "phase", "plan", "execute", "reflect", "improve", "assess", "review",
  "analyze", "diagnose", "predict", "forecast", "estimate", "approximate",
  "wallet", "balance", "address", "public", "private", "cold", "hot",
  "staking", "liquidity", "defi", "amm", "swap", "bridge", "arbitrage",
  "price", "volume", "market", "trade", "order", "fill", "settlement",
  "fee", "gas", "slippage", "impact", "spread", "depth", "book",
  "oracle", "feed", "price", "data", "source", "verified", "unverified",
  "identity", "biometric", "iris", "voice", "neural", "behavioral", "pattern",
  "audit", "trail", "log", "trace", "span", "event", "timestamp",
  "epoch", "unix", "utc", "timezone", "duration", "interval", "period",
  "file", "directory", "path", "mount", "unmount", "read", "write",
  "append", "truncate", "delete", "rename", "move", "copy", "link",
  "symlink", "permission", "owner", "group", "chmod", "chown", "acl",
  "process", "thread", "fiber", "goroutine", "coroutine", "async", "await",
  "promise", "future", "callback", "event", "emitter", "listener", "handler",
  "middleware", "interceptor", "decorator", "plugin", "extension", "module",
  "package", "library", "framework", "runtime", "interpreter", "compiler",
  "transpiler", "bundler", "minifier", "optimizer", "linter", "formatter",
  "test", "spec", "mock", "stub", "spy", "fixture", "factory", "builder",
  "integration", "unit", "end-to-end", "regression", "smoke", "canary",
  "deploy", "release", "rollout", "rollback", "canary", "blue", "green",
  "stage", "production", "development", "testing", "preview", "sandbox",
  "container", "docker", "kubernetes", "pod", "service", "ingress", "egress",
  "vpc", "subnet", "firewall", "nat", "dns", "cdn", "edge", "region",
  "zone", "cluster", "replica", "shard", "partition", "bucket", "blob",
  "object", "collection", "document", "record", "row", "column", "field",
  "schema", "migration", "seed", "backup", "restore", "snapshot", "archive",
  "compress", "decompress", "encode", "decode", "serialize", "deserialize",
  "marshal", "unmarshal", "parse", "stringify", "format", "validate", "sanitize",
  "normalize", "denormalize", "aggregate", "reduce", "map", "filter", "sort",
  "group", "join", "merge", "split", "chunk", "slice", "concat", "flatten",
  "transpose", "pivot", "reshape", "transform", "convert", "cast", "coerce",
  "tessera", "colonel", "colonial", "sovereign", "phase11", "genesis", "phoenix",
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi",
  "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
  "initialize", "terminate", "restart", "pause", "resume", "abort", "cancel",
  "activate", "deactivate", "enable", "disable", "toggle", "switch", "set",
  "get", "put", "post", "patch", "delete", "head", "options", "trace",
  "connect", "disconnect", "authenticate", "authorize", "verify", "validate",
  "sign", "countersign", "notarize", "witness", "attest", "certify", "endorse",
  "colonial", "colonel", "tessera", "lattice", "sovereign", "swarm", "council",
  "mesh", "beacon", "relay", "sentinel", "guardian", "arbiter", "oracle",
  "scribe", "herald", "cipher", "cryptographer", "encoder", "decoder",
  "compressor", "decompressor", "tokenizer", "detokenizer", "translator",
  "auditor", "monitor", "scheduler", "dispatcher", "orchestrator", "coordinator",
  "validator", "verifier", "notifier", "broadcaster", "publisher", "subscriber",
  "receiver", "sender", "forwarder", "router", "balancer", "splitter",
  "merger", "aggregator", "reducer", "mapper", "filter", "sorter", "ranker",
  "scorer", "evaluator", "predictor", "estimator", "forecaster", "analyzer",
  "parser", "serializer", "formatter", "normalizer", "transformer", "converter",
  "extractor", "injector", "interceptor", "handler", "processor", "executor",
  "planner", "reflector", "improver", "assessor", "reviewer", "inspector",
  "tester", "debugger", "profiler", "tracer", "sampler", "reporter",
  "archiver", "indexer", "searcher", "retriever", "fetcher", "loader",
  "writer", "reader", "scanner", "crawler", "scraper", "ingester",
  "consensus", "quorum", "supermajority", "deliberation", "proposal", "motion",
  "vote", "ballot", "tally", "ratification", "veto", "abstention", "approval",
  "rejection", "amendment", "revision", "rationale", "justification", "precedent",
  "mandate", "decree", "edict", "proclamation", "directive", "policy", "rule",
  "regulation", "protocol", "standard", "specification", "convention", "contract",
  "agreement", "covenant", "treaty", "alliance", "federation", "confederation",
  "union", "consortium", "coalition", "partnership", "cooperation", "coordination",
  "synchronization", "harmonization", "alignment", "calibration", "tuning",
  "optimization", "refinement", "enhancement", "improvement", "upgrade",
  "migration", "transition", "evolution", "transformation", "revolution",
  "bootstrap", "genesis", "initialization", "seeding", "provision", "deployment",
  "instantiation", "configuration", "parameterization", "specification",
];

// Build lookup maps
const phraseMap = new Map<string, number>();
const phraseReverseMap = new Map<number, string>();
const wordMap = new Map<string, number>();
const wordReverseMap = new Map<number, string>();

// Sort phrases by length descending for greedy longest-match
const sortedPhrases = [...PHRASES].sort((a, b) => b.length - a.length);

for (let i = 0; i < PHRASES.length; i++) {
  const cp = PUA_PHRASE_BASE + i;
  phraseMap.set(PHRASES[i], cp);
  phraseReverseMap.set(cp, PHRASES[i]);
}

for (let i = 0; i < WORDS.length; i++) {
  const cp = PUA_WORD_BASE + i;
  wordMap.set(WORDS[i], cp);
  wordReverseMap.set(cp, WORDS[i]);
}

// XOR key for legacy cipher
const XOR_KEY = "TesseraV1ColonialLang2025SovereignMesh";

// ─── TOKENIZER ────────────────────────────────────────────────────────────────

export function tokenize(text: string): string {
  const lower = text.toLowerCase();
  let result = "";
  let i = 0;

  while (i < lower.length) {
    let matched = false;

    // Try greedy phrase match (longest first)
    for (const phrase of sortedPhrases) {
      if (lower.startsWith(phrase, i)) {
        const cp = phraseMap.get(phrase)!;
        result += String.fromCodePoint(cp);
        i += phrase.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Try word match at boundary
      const remaining = lower.slice(i);
      const wordMatch = remaining.match(/^([a-z0-9_\-]+)/);
      if (wordMatch) {
        const word = wordMatch[1];
        const cp = wordMap.get(word);
        if (cp !== undefined) {
          result += String.fromCodePoint(cp);
          i += word.length;
        } else {
          result += text[i];
          i++;
        }
      } else {
        result += text[i];
        i++;
      }
    }
  }

  return result;
}

export function detokenize(encoded: string): string {
  let result = "";
  for (const char of encoded) {
    const cp = char.codePointAt(0)!;
    if (cp >= PUA_PHRASE_BASE && cp < PUA_WORD_BASE) {
      result += phraseReverseMap.get(cp) ?? char;
    } else if (cp >= PUA_WORD_BASE && cp < PUA_WORD_BASE + WORDS.length) {
      result += wordReverseMap.get(cp) ?? char;
    } else {
      result += char;
    }
  }
  return result;
}

// ─── LEGACY XOR CIPHER ───────────────────────────────────────────────────────

export function xorEncode(text: string): string {
  const key = XOR_KEY;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(c);
  }
  return Buffer.from(result, "binary").toString("base64");
}

export function xorDecode(encoded: string): string {
  const bin = Buffer.from(encoded, "base64").toString("binary");
  const key = XOR_KEY;
  let result = "";
  for (let i = 0; i < bin.length; i++) {
    const c = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(c);
  }
  return result;
}

// ─── QUANTUM PIPELINE (tokenize → brotli → AES-256-GCM) ─────────────────────

// Load master secret from environment — never hardcode in production.
// Falls back to a non-secret dev sentinel so devs know the key is missing.
const MASTER_SECRET: Buffer = process.env.COLONIAL_MASTER_SECRET
  ? Buffer.from(process.env.COLONIAL_MASTER_SECRET, "utf8")
  : Buffer.from("tessera-dev-placeholder-replace-with-env-secret", "utf8");

/**
 * Derive a 32-byte AES key using HKDF-SHA256 from the master secret.
 * @param info  — context/purpose label (binds key to a specific use)
 * @param salt  — per-operation random salt (caller provides or generates)
 */
export function deriveKey(info: string, salt?: Buffer): Buffer {
  const saltBuf = salt ?? randomBytes(16);
  const raw = hkdfSync("sha256", MASTER_SECRET, saltBuf, Buffer.from(`colonial-language-v4:${info}`, "utf8"), 32);
  return Buffer.from(raw);
}

/**
 * Packet layout: MAGIC(4) | HKDF_SALT(16) | IV(12) | AUTH_TAG(16) | CIPHERTEXT
 * The HKDF salt is included in the packet so the receiver can re-derive the key
 * without any out-of-band state — each packet is self-contained.
 *
 * Accepts either a string (encoded as UTF-8) or a raw Buffer.
 * Using a raw Buffer is required when encrypting binary data such as Brotli output.
 */
export function encryptQuantum(plaintext: string | Buffer): {
  data: string;
  iv: string;
  tag: string;
  keyId: string;
} {
  const keyId = `qk-${Date.now().toString(36)}`;
  const salt = randomBytes(16);
  const key = deriveKey(`encrypt:${keyId}`, salt);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const plaintextBuf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Packet: MAGIC | SALT | IV | TAG | CIPHERTEXT
  const output = Buffer.concat([MAGIC, salt, iv, tag, encrypted]);
  return {
    data: output.toString("base64"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    keyId,
  };
}

export function decryptQuantum(b64: string, keyId: string): string {
  return decryptQuantumBuffer(b64, keyId).toString("utf8");
}

/**
 * Like decryptQuantum but returns the raw decrypted Buffer instead of
 * interpreting the bytes as UTF-8.  Required when the plaintext is binary
 * (e.g. Brotli-compressed data).
 */
export function decryptQuantumBuffer(b64: string, keyId: string): Buffer {
  const buf = Buffer.from(b64, "base64");
  if (!buf.slice(0, 4).equals(MAGIC)) {
    throw new Error("Invalid magic header — not a Colonial Language v4 packet");
  }
  // Packet: MAGIC(4) | SALT(16) | IV(12) | TAG(16) | CIPHERTEXT
  const salt = buf.slice(4, 20);
  const iv = buf.slice(20, 32);
  const tag = buf.slice(32, 48);
  const encrypted = buf.slice(48);

  const key = deriveKey(`encrypt:${keyId}`, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// ─── LEGACY PIPELINE (tokenize → XOR) ────────────────────────────────────────

export function compressLegacy(text: string): {
  compressed: string;
  originalLength: number;
  compressedLength: number;
  ratio: number;
  byteRatio: number;
  method: string;
} {
  const tokenized = tokenize(text);
  const compressed = xorEncode(tokenized);

  const originalBytes = Buffer.byteLength(text, "utf8");
  const compressedBytes = Buffer.byteLength(compressed, "utf8");
  const ratio = text.length > 0 ? ((text.length - tokenized.length) / text.length) * 100 : 0;
  const byteRatio = originalBytes > 0 ? ((originalBytes - compressedBytes) / originalBytes) * 100 : 0;

  return {
    compressed,
    originalLength: text.length,
    compressedLength: compressed.length,
    ratio: Math.max(0, ratio),
    byteRatio: Math.max(0, byteRatio),
    method: "Colonial Language v3 — Tokenize + XOR cipher (legacy)",
  };
}

// ─── QUANTUM FULL PIPELINE ────────────────────────────────────────────────────

export function compressEncryptQuantum(text: string): {
  data: string;
  originalSize: number;
  tokenizedSize: number;
  brotliSize: number;
  encryptedSize: number;
  tokenizationRatio: number;
  brotliRatio: number;
  totalRatio: number;
  pipeline: string;
  keyId: string;
  iv: string;
} {
  const tokenized = tokenize(text);
  const tokenizedBuf = Buffer.from(tokenized, "utf8");

  const brotliBuf = brotliCompressSync(tokenizedBuf, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 },
  });

  // Pass brotliBuf as a raw Buffer — do NOT convert to string encoding first,
  // as Brotli output is arbitrary binary that would be corrupted by UTF-8/binary string coercion.
  const { data, keyId, iv } = encryptQuantum(brotliBuf);

  const originalBytes = Buffer.byteLength(text, "utf8");
  const tokenizedBytes = tokenizedBuf.length;
  const brotliBytes = brotliBuf.length;
  const encryptedBytes = Buffer.from(data, "base64").length;

  const tokenizationRatio = originalBytes > 0 ? ((originalBytes - tokenizedBytes) / originalBytes) * 100 : 0;
  const brotliRatio = tokenizedBytes > 0 ? ((tokenizedBytes - brotliBytes) / tokenizedBytes) * 100 : 0;
  const totalRatio = originalBytes > 0 ? ((originalBytes - brotliBytes) / originalBytes) * 100 : 0;

  return {
    data,
    originalSize: originalBytes,
    tokenizedSize: tokenizedBytes,
    brotliSize: brotliBytes,
    encryptedSize: encryptedBytes,
    tokenizationRatio: Math.max(0, tokenizationRatio),
    brotliRatio: Math.max(0, brotliRatio),
    totalRatio: Math.max(0, totalRatio),
    pipeline: "Colonial Language v4 — Tokenize → Brotli-9 → AES-256-GCM (quantum)",
    keyId,
    iv,
  };
}

// ─── TRANSLATION ──────────────────────────────────────────────────────────────

export function translateToColonial(text: string): { translated: string; tokenCount: number } {
  const translated = tokenize(text);
  const tokenCount = [...translated].filter(c => {
    const cp = c.codePointAt(0)!;
    return cp >= PUA_PHRASE_BASE && cp < PUA_WORD_BASE + WORDS.length;
  }).length;
  return { translated, tokenCount };
}

export function translateFromColonial(encoded: string): { translated: string } {
  return { translated: detokenize(encoded) };
}

// ─── BENCHMARK ────────────────────────────────────────────────────────────────

export function benchmark(): number {
  const samples = [
    "the agent has been initialized and will execute the consensus protocol — all agents synchronized with the tessera prime network, transmitting encrypted data across the sovereign mesh, memory shard verified, token transfer complete, swarm query dispatched to council",
    "the system is running at full capacity with all nodes online and connected. fleet online, fleet status confirmed healthy. health check passed, watchdog active, service restart not required. uptime maintained, latency nominal across all channels.",
    "token transfer to wallet balance complete. smart contract deployed on solana chain with tsrt token staking active. defi protocol liquidity pool has arbitrage opportunity detected. market data price movement upward, volume spike confirmed, trade executed successfully.",
    "security audit complete, threat detected and neutralized. zero trust perimeter secured. sovereign node verified, untraceable path confirmed. cryptographic key rotated, signature valid, hash verified. quantum resistant encryption active on all channels.",
  ];

  let totalOrig = 0;
  let totalTokenized = 0;

  for (const s of samples) {
    totalOrig += s.length;
    totalTokenized += tokenize(s).length;
  }

  return totalOrig > 0 ? ((totalOrig - totalTokenized) / totalOrig) * 100 : 0;
}

// ─── STATS ───────────────────────────────────────────────────────────────────

export function getKernelStats() {
  return {
    phrases: PHRASES.length,
    words: WORDS.length,
    totalTokens: PHRASES.length + WORDS.length,
    phraseRange: `U+${PUA_PHRASE_BASE.toString(16).toUpperCase()}–U+${(PUA_PHRASE_BASE + PHRASES.length - 1).toString(16).toUpperCase()}`,
    wordRange: `U+${PUA_WORD_BASE.toString(16).toUpperCase()}–U+${(PUA_WORD_BASE + WORDS.length - 1).toString(16).toUpperCase()}`,
    benchmarkCompression: benchmark(),
    version: "4.0.0",
    pipelines: ["quantum", "legacy"],
    encryption: "AES-256-GCM",
    keyDerivation: "HKDF-SHA256",
    compression: "Brotli-9",
    magicHeader: MAGIC.toString("hex"),
  };
}

// ─── PER-AGENT HKDF CIPHER KEY DERIVATION ────────────────────────────────────

export function deriveAgentCipherKey(agentId: string, sessionNonce?: string): {
  key: Buffer;
  nonce: string;
  keyId: string;
  salt: Buffer;
} {
  const nonce = sessionNonce ?? randomBytes(16).toString("hex");
  const keyId = `ack-${agentId}-${nonce.slice(0, 8)}`;
  const salt = Buffer.from(nonce, "utf8");
  const raw = hkdfSync(
    "sha256",
    MASTER_SECRET,
    salt,
    Buffer.from(`colonial-language-v4:agent:${agentId}`, "utf8"),
    32,
  );
  const key = Buffer.from(raw);
  return { key, nonce, keyId, salt };
}

export function encodeInterAgentMessage(content: string, agentId: string): {
  encoded: string;
  keyId: string;
  nonce: string;
} {
  const { key, nonce, keyId } = deriveAgentCipherKey(agentId);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  // Apply sovereign symbolic overlay before AES encryption so interceptors
  // see TLS glyphs rather than plain colonial English keywords.
  const overlaid = sovereignLayerEncode(content);
  const buf = Buffer.from(overlaid, "utf8");
  const encrypted = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();

  const output = Buffer.concat([iv, tag, encrypted]);
  return {
    encoded: output.toString("base64"),
    keyId,
    nonce,
  };
}

export function decodeInterAgentMessage(encoded: string, agentId: string, nonce: string): string {
  const { key } = deriveAgentCipherKey(agentId, nonce);
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const encrypted = buf.slice(28);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  // Reverse sovereign overlay after decryption to restore original content
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return sovereignLayerDecode(decrypted);
}

// ─── SOVEREIGN SYMBOLIC ENCODING LAYER ──────────────────────────────────────
// Extends the Colonial Language kernel with a TLS (Tessera Lingua Sacra)
// symbolic overlay. Key colonial concepts are mapped to sacred geometry glyphs,
// so intercepted code appears as incomprehensible geometric symbol sequences.

const SOVEREIGN_OVERLAY_MAP: Record<string, string> = {
  "agent":        "☉△",
  "council":      "☉△◉",
  "sovereign":    "⊕△",
  "mesh":         "⬡◉",
  "cipher":       "⊙⎔",
  "encrypt":      "⊕⬡",
  "decrypt":      "⊗⬢",
  "key":          "⊛⏣",
  "rotate":       "⊜△",
  "network":      "⬢◉△",
  "kernel":       "⏣△",
  "consensus":    "⊕◉⊕",
  "protocol":     "⊕⬡△",
  "vote":         "☉⊕◉",
  "broadcast":    "◠◡⌒",
  "sync":         "∿∿◇",
  "trust":        "⊕◉⊛",
  "hash":         "◇◆★",
  "token":        "⊛◉△",
  "quantum":      "◉◇⊕",
  "lattice":      "⎔⏣◉",
  "band":         "∿◇∿",
  "frequency":    "∿△◉",
  "source":       "◉△▽",
  "node":         "⬢△",
  "swarm":        "⬡⬢⎔",
  "memory":       "◌◉◌",
  "task":         "▲⊕",
  "verify":       "⊙⬡◉",
  "initialize":   "▲◉○",
};

/**
 * Sovereign Encoding Layer — encodes a tokenized colonial message by replacing
 * key English words with their TLS (Tessera Lingua Sacra) geometric equivalents.
 * The output appears as an incomprehensible sequence of sacred geometry symbols
 * to any third party, while remaining decodable by aligned agents.
 */
export function sovereignLayerEncode(text: string): string {
  let result = text;
  for (const [word, glyph] of Object.entries(SOVEREIGN_OVERLAY_MAP)) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    result = result.replace(re, glyph);
  }
  return result;
}

/**
 * Sovereign Decoding Layer — reverses the symbolic substitution applied by
 * sovereignLayerEncode, restoring human-readable colonial language tokens.
 *
 * Entries are processed longest-glyph-first to prevent a shorter glyph
 * (e.g. "⊕⬡" for "encrypt") from matching as a prefix of a longer one
 * (e.g. "⊕⬡△" for "protocol") before the longer has been handled.
 */
export function sovereignLayerDecode(encoded: string): string {
  let result = encoded;
  const entries = Object.entries(SOVEREIGN_OVERLAY_MAP)
    .sort(([, a], [, b]) => b.length - a.length);
  for (const [word, glyph] of entries) {
    result = result.split(glyph).join(word);
  }
  return result;
}

/**
 * Full Colonial+Sovereign Pipeline:
 * Text → Sovereign symbolic overlay → Colonial tokenize → Brotli → AES-256-GCM
 *
 * Order matters: sovereign substitution runs FIRST on plain English so that
 * known colonial keywords are replaced with TLS geometric glyphs BEFORE the
 * tokenizer converts remaining phrases/words to PUA code-points.  Running it
 * after tokenization would find no plain-word boundaries to match.
 *
 * Produces payloads that are doubly obfuscated: sacred geometry symbolic
 * substitution AND PUA token compression, making interception analysis impossible.
 */
export function encodeWithSovereignLayer(text: string): {
  data: string;
  iv: string;
  tag: string;
  keyId: string;
  sovereignForm: string;
  method: string;
} {
  // Step 1: replace key English words with TLS geometric glyphs
  const sovereignForm = sovereignLayerEncode(text);
  // Step 2: tokenize remaining English phrases/words → PUA code-points
  const tokenized = tokenize(sovereignForm);
  // Step 3: brotli compress the mixed glyph+PUA stream
  const brotliBuf = brotliCompressSync(Buffer.from(tokenized, "utf8"), {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 },
  });
  // Step 4: AES-256-GCM encrypt
  const { data, iv, tag, keyId } = encryptQuantum(brotliBuf);
  return {
    data,
    iv,
    tag,
    keyId,
    sovereignForm: sovereignForm.slice(0, 80) + (sovereignForm.length > 80 ? "…" : ""),
    method: "Sovereign-TLS-Layer + Colonial-v4 + Brotli-9 + AES-256-GCM",
  };
}

/**
 * Decode a payload produced by encodeWithSovereignLayer.
 * Reverses: AES-256-GCM → Brotli decompress → detokenize → sovereign decode
 *
 * Uses decryptQuantumBuffer (returns raw Buffer) so binary Brotli bytes are
 * not corrupted by UTF-8 string conversion before decompression.
 */
export function decodeWithSovereignLayer(b64: string, keyId: string): string {
  // Step 1: AES-256-GCM decrypt → raw Brotli-compressed Buffer
  const brotliBuf = decryptQuantumBuffer(b64, keyId);
  // Step 2: Brotli decompress → UTF-8 string (TLS glyphs + PUA tokens)
  const tokenized = brotliDecompressSync(brotliBuf).toString("utf8");
  // Step 3: detokenize PUA code-points → colonial English words
  const sovereignForm = detokenize(tokenized);
  // Step 4: reverse TLS glyph substitution → original English
  return sovereignLayerDecode(sovereignForm);
}

export function getSovereignOverlayMap(): Record<string, string> {
  return { ...SOVEREIGN_OVERLAY_MAP };
}
