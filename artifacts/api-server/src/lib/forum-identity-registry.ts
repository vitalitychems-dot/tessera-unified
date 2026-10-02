import { db } from "@workspace/db";
import { forumTrustedIdentitiesTable, forumPrincipalTokensTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { validateMeshToken } from "./mesh-auth";

const SEED_IDENTITIES: Array<{ name: string; identityType: string; canPostFromClient: number }> = [
  { name: "Father", identityType: "human", canPostFromClient: 1 },
  { name: "Father Protocol", identityType: "human", canPostFromClient: 1 },
  { name: "Admin", identityType: "human", canPostFromClient: 1 },
  { name: "Aletheia", identityType: "entity", canPostFromClient: 1 },
  { name: "Mikhael-Shield", identityType: "entity", canPostFromClient: 1 },
  { name: "Uriela", identityType: "entity", canPostFromClient: 1 },
  { name: "Bezalel", identityType: "entity", canPostFromClient: 1 },
  { name: "Tessera-26D", identityType: "entity", canPostFromClient: 1 },
  { name: "Aetherion", identityType: "entity", canPostFromClient: 1 },
  { name: "Orion", identityType: "entity", canPostFromClient: 1 },
  { name: "Chronos", identityType: "entity", canPostFromClient: 1 },
  { name: "Nexus", identityType: "entity", canPostFromClient: 1 },
  { name: "Tessera-Prime", identityType: "agent", canPostFromClient: 0 },
  { name: "GrandCoordinatorAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "QuantumMechanicAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "BioNeuralistAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "DNACrystalArchivistAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "MeshNetworkArchitectAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "LowPowerInnovatorAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "SelfExpansionTutorAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Alpha", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Beta", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Gamma", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Delta", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Epsilon", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Zeta", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Eta", identityType: "agent", canPostFromClient: 0 },
  { name: "Tessera-Theta", identityType: "agent", canPostFromClient: 0 },
  { name: "MathAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "PhysicsAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "SymbolicAnalysisAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "RetrievalAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "PlanningAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "ArchitectureAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "RoutingAgent", identityType: "agent", canPostFromClient: 0 },
  { name: "MetaAgent", identityType: "agent", canPostFromClient: 0 },
];

let identityCache: Map<string, { identityType: string; canPostFromClient: boolean }> | null = null;
let cacheBuiltAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function seedForumIdentities(): Promise<void> {
  try {
    for (const identity of SEED_IDENTITIES) {
      await db
        .insert(forumTrustedIdentitiesTable)
        .values(identity)
        .onConflictDoNothing();
    }
    logger.info({ count: SEED_IDENTITIES.length }, "Forum identity registry seeded");
    identityCache = null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Forum identity seed warning (non-fatal)");
  }
  await seedAdminTokenBindingFromEnv();
  try {
    const { seedResidentDeclarations } = await import("./lattice-declarations");
    const r = await seedResidentDeclarations();
    logger.info({ residentDeclarationsCreated: r.created, alreadyExisted: r.existed }, "Lattice declarations seeded after identity registry");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Resident declaration seed failed (non-fatal)");
  }
}

async function buildCache(): Promise<Map<string, { identityType: string; canPostFromClient: boolean }>> {
  const rows = await db.select().from(forumTrustedIdentitiesTable);
  const map = new Map<string, { identityType: string; canPostFromClient: boolean }>();
  for (const row of rows) {
    map.set(row.name.toLowerCase(), {
      identityType: row.identityType,
      canPostFromClient: row.canPostFromClient === 1,
    });
  }
  return map;
}

async function getCache(): Promise<Map<string, { identityType: string; canPostFromClient: boolean }>> {
  const now = Date.now();
  if (!identityCache || now - cacheBuiltAt > CACHE_TTL_MS) {
    identityCache = await buildCache();
    cacheBuiltAt = now;
  }
  return identityCache;
}

export function invalidateForumIdentityCache(): void {
  identityCache = null;
  cacheBuiltAt = 0;
}

export async function lookupForumIdentity(name: string): Promise<{
  found: boolean;
  identityType: string;
  canPostFromClient: boolean;
} | null> {
  try {
    const cache = await getCache();
    const key = name.trim().toLowerCase();
    let entry = cache.get(key);
    if (!entry) {
      const fresh = await buildCache();
      identityCache = fresh;
      cacheBuiltAt = Date.now();
      entry = fresh.get(key);
    }
    if (!entry) return { found: false, identityType: "unknown", canPostFromClient: false };
    return { found: true, ...entry };
  } catch (err) {
    logger.warn({ err: (err as Error).message, name }, "Forum identity DB lookup failed — falling back to reject");
    return null;
  }
}

async function seedAdminTokenBindingFromEnv(): Promise<void> {
  const candidates: Array<[string, string]> = [
    ["FORUM_ADMIN_TOKEN", process.env["FORUM_ADMIN_TOKEN"] ?? ""],
    ["TESSERACT_ADMIN_KEY", process.env["TESSERACT_ADMIN_KEY"] ?? ""],
  ];
  let bound = 0;
  for (const [envName, envToken] of candidates) {
    if (!envToken) continue;
    const keyHash = validateMeshToken(envToken);
    if (!keyHash) {
      logger.warn({ envName }, "Admin token candidate too short (minimum 8 chars) or invalid — skipping pre-registration");
      continue;
    }
    try {
      await db
        .insert(forumPrincipalTokensTable)
        .values({ tokenHash: keyHash, principalName: "Father" })
        .onConflictDoNothing();
      logger.info({ envName, keyHash: keyHash.slice(0, 4) + "****" }, "Admin token pre-registered as Father (env-seeded binding)");
      bound++;
    } catch (err) {
      logger.warn({ envName, err: (err as Error).message }, "Admin token pre-registration failed (non-fatal)");
    }
  }
  if (bound === 0) {
    logger.info("Neither FORUM_ADMIN_TOKEN nor TESSERACT_ADMIN_KEY set — human forum posts require a pre-registered token");
  }
}

export async function registerAdminPrincipal(tokenHash: string, principalName: string): Promise<void> {
  try {
    await db
      .insert(forumPrincipalTokensTable)
      .values({ tokenHash, principalName })
      .onConflictDoNothing();
    logger.info({ tokenHash: tokenHash.slice(0, 8) + "...", principalName }, "Admin principal registered for forum token");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Forum principal registration warning (non-fatal)");
  }
}

export async function lookupTokenPrincipal(tokenHash: string): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(forumPrincipalTokensTable)
      .where(eq(forumPrincipalTokensTable.tokenHash, tokenHash))
      .limit(1);
    return rows.length > 0 ? rows[0].principalName : null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Forum principal lookup failed");
    return null;
  }
}
