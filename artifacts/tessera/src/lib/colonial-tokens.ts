const PUA_PHRASE_BASE = 0xe000;
const PUA_WORD_BASE = 0xe200;

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
  "tessera sovereign",
  "tessera system",
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
  "mesh network",
  "peer-to-peer",
  "decentralized network",
  "distributed system",
  "vector memory",
  "semantic search",
  "model inference",
  "model response",
  "model provider",
  "provider latency",
  "system nominal",
  "system degraded",
  "system offline",
  "system online",
  "node online",
  "node offline",
  "sync complete",
  "sync pending",
  "recovery complete",
  "task complete",
  "task pending",
  "task failed",
  "task dispatched",
  "pipeline complete",
  "pipeline failed",
  "routing agent",
  "architecture agent",
  "planning agent",
  "retrieval agent",
  "symbolic agent",
  "physics agent",
  "math agent",
  "meta agent",
  "swarm coordinator",
  "task priority",
  "priority queue",
  "execution phase",
  "self assessment",
  "reasoning trace",
  "mathematical proof",
  "mathematical operation",
  "mathematical function",
  "equation solved",
  "equation verified",
  "theorem proved",
  "proof complete",
  "proof verified",
  "calculation result",
  "calculation complete",
  "compute derivative",
  "compute integral",
  "matrix multiplication",
  "vector addition",
  "scalar product",
  "division algorithm",
  "modular arithmetic",
  "prime factorization",
  "greatest common divisor",
  "least common multiple",
];

const WORDS: string[] = [
  "agent", "agents", "system", "systems", "network", "networks", "node", "nodes",
  "mesh", "lattice", "sovereign", "sovereignty", "council", "swarm",
  "kernel", "protocol", "token", "tokens", "cipher", "encrypt", "decrypt",
  "compress", "decompress", "tokenize", "tokenized", "translate", "encode", "decode",
  "quantum", "brotli", "aes", "hkdf", "sha256", "blockchain", "chain", "block",
  "transaction", "validator", "consensus", "signature", "hash", "key", "keys",
  "handshake", "proxy", "gateway", "router", "routing", "load", "balance",
  "failover", "backup", "recovery", "sync", "stream", "queue", "broadcast",
  "endpoint", "api", "request", "response", "payload", "status", "error",
  "success", "failure", "timeout", "retry", "monitor", "anomaly", "alert",
  "online", "offline", "active", "inactive", "idle", "busy", "pending",
  "complete", "failed", "dispatched", "scheduled", "running", "initialized",
  "memory", "storage", "database", "cache", "index", "shard", "vector",
  "embedding", "similarity", "semantic", "search", "retrieval", "context",
  "prompt", "completion", "inference", "model", "provider", "anthropic", "openai",
  "google", "mistral", "deepseek", "claude", "gpt", "gemini", "local", "external",
  "internal", "federated", "decentralized", "distributed", "latency", "throughput",
  "bandwidth", "capacity", "cpu", "gpu", "compute", "efficiency", "performance",
  "benchmark", "metric", "score", "priority", "weight", "probability", "confidence",
  "epoch", "iteration", "batch", "gradient", "reward", "penalty", "reinforcement",
  "vote", "quorum", "majority", "decision", "deliberation", "outcome", "approved",
  "rejected", "phase", "plan", "execute", "reflect", "improve", "assess",
  "wallet", "balance", "address", "staking", "liquidity", "defi", "swap",
  "arbitrage", "price", "volume", "market", "trade", "fee", "gas",
  "identity", "audit", "trail", "log", "trace", "event", "timestamp",
  "file", "directory", "path", "read", "write", "delete", "permission",
  "process", "thread", "async", "await", "promise", "callback", "handler",
  "middleware", "module", "package", "library", "framework", "runtime",
  "tessera", "colonel", "colonial", "phase11", "genesis", "phoenix",
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma",
  "tau", "phi", "chi", "psi", "omega", "initialize", "terminate", "restart",
  "activate", "deactivate", "enable", "disable", "authenticate", "authorize",
  "verify", "validate", "sign", "certify", "deploy", "release", "rollback",
  "container", "cluster", "replica", "object", "collection", "document",
  "schema", "migration", "serialize", "deserialize", "parse", "format",
  "normalize", "aggregate", "transform", "convert", "broadcast", "unicast",
  "addition", "subtraction", "multiplication", "division", "equation", "theorem",
  "proof", "axiom", "conjecture", "formula", "derivative", "integral",
  "function", "variable", "constant", "coefficient", "exponent", "logarithm",
  "matrix", "vector", "scalar", "dimension", "angle", "radius",
  "diameter", "circumference", "area", "volume", "surface", "vertex",
  "factorial", "permutation", "combination", "sequence", "series", "convergence",
  "divergence", "polynomial", "quadratic", "linear", "exponential", "fraction",
  "numerator", "denominator", "remainder", "quotient", "product", "sum",
  "difference", "absolute", "infinity", "limit", "tangent", "cosine", "sine",
];

const phraseMap = new Map<string, number>();
const phraseReverseMap = new Map<number, string>();
const wordMap = new Map<string, number>();
const wordReverseMap = new Map<number, string>();

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

export function colonialTokenize(text: string): string {
  const lower = text.toLowerCase();
  let result = "";
  let i = 0;

  while (i < lower.length) {
    let matched = false;

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

export function colonialDetokenize(encoded: string): string {
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

export function colonialEncodeMessage(content: string, fromAgentId: string): {
  encoded: string;
  nonce: string;
  keyId: string;
} {
  const nonce = Math.random().toString(36).slice(2, 18) + Date.now().toString(36);
  const keyId = `ack-${fromAgentId}-${nonce.slice(0, 8)}`;
  const tokenized = colonialTokenize(content);
  return { encoded: tokenized, nonce, keyId };
}

export function colonialDecodeMessage(encoded: string): string {
  return colonialDetokenize(encoded);
}
