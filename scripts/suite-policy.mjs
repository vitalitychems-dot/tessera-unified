const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

function normalizeHost(host) {
  return String(host).trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function parseDatabaseTarget(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("A non-empty PostgreSQL URL is required");
  }
  const url = new URL(value.trim());
  if (!POSTGRES_PROTOCOLS.has(url.protocol)) {
    throw new TypeError("Only postgres:// or postgresql:// URLs are supported");
  }
  if (url.searchParams.has("service")) {
    throw new TypeError("PostgreSQL service-file URLs are not allowed by the suite runner");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!database || database.includes("/") || database.includes("\\") || database.includes("\0")) {
    throw new TypeError("The PostgreSQL URL must name exactly one database");
  }

  const hostInputs = [url.hostname, ...url.searchParams.getAll("host"), ...url.searchParams.getAll("hostaddr")];
  const hosts = hostInputs.flatMap((value) => String(value).split(",").map(normalizeHost));
  if (hosts.some((host) => host === "")) {
    throw new TypeError("Every PostgreSQL connection host must be explicit");
  }

  const queryPorts = url.searchParams.getAll("port");
  if (queryPorts.length > 1) throw new TypeError("Multiple PostgreSQL port overrides are not allowed");
  const rawPort = queryPorts.at(-1) || url.port || "5432";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError("The PostgreSQL port must be in the range 1-65535");
  }

  return { hosts: [...new Set(hosts)].sort(), port, database };
}

export function isLoopbackPostgresUrl(value) {
  try {
    return parseDatabaseTarget(value).hosts.every((host) => LOOPBACK_HOSTS.has(host));
  } catch {
    return false;
  }
}

export function samePostgresDatabase(first, second) {
  try {
    const a = parseDatabaseTarget(first);
    const b = parseDatabaseTarget(second);
    return a.port === b.port && a.database === b.database && a.hosts.length === b.hosts.length && a.hosts.every((host, index) => host === b.hosts[index]);
  } catch {
    return false;
  }
}

export function assertUniqueServicePorts(services) {
  const owners = new Map();
  for (const service of services) {
    const port = Number(service.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new TypeError(`${service.label} has an invalid TCP port`);
    }
    if (owners.has(port)) {
      throw new Error(`Port ${port} is assigned to both ${owners.get(port)} and ${service.label}`);
    }
    owners.set(port, service.label);
  }
  return true;
}
