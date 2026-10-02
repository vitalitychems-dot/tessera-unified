const API_BASE = "/api";

function route(method: string, path: string) {
  return { method, path: `${API_BASE}${path}` };
}

export const api = {
  conversations: {
    list: route("GET", "/conversations"),
    get: route("GET", "/conversations/:id"),
    create: route("POST", "/conversations"),
    delete: route("DELETE", "/conversations/:id"),
  },
  messages: {
    list: route("GET", "/conversations/:conversationId/messages"),
    create: route("POST", "/conversations/:conversationId/messages"),
  },
  repos: {
    list: route("GET", "/repos"),
    create: route("POST", "/repos"),
    delete: route("DELETE", "/repos/:id"),
  },
  agents: {
    list: route("GET", "/agents"),
    get: route("GET", "/agents/:id"),
  },
  knowledge: {
    list: route("GET", "/knowledge"),
    get: route("GET", "/knowledge/:id"),
  },
  economy: {
    dashboard: route("GET", "/economy/dashboard"),
  },
  admin: {
    check: route("GET", "/admin/check"),
    configure: route("POST", "/admin/configure"),
  },
  security: {
    audit: route("GET", "/security/audit"),
    allowlist: route("GET", "/security/allowlist"),
    integrity: route("GET", "/security/integrity"),
  },
};

export function buildUrl(
  template: string,
  params: Record<string, string | number>
): string {
  let url = template;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return url;
}
