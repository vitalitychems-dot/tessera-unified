import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { canonicalProductionRedirect } from "@/lib/auth/site-hosts.server";

const hostCanonicalizer = createMiddleware().server(({ next, request }) => {
  const redirect = canonicalProductionRedirect(request);
  return redirect ?? next();
});

/**
 * Serves the IndexNow key file at `/<key>.txt`. The key is derived from
 * SESSION_SECRET on the server, so the module is loaded lazily inside the
 * handler and never reaches the client bundle.
 */
const indexNowKeyFile = createMiddleware().server(async ({ next, request }) => {
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && /^\/[a-f0-9]{32}\.txt$/.test(pathname)) {
    const { indexNowKeyFileResponse } = await import("@/lib/content/indexnow.server");
    const response = indexNowKeyFileResponse(pathname);
    if (response) return response;
  }
  return next();
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, hostCanonicalizer, indexNowKeyFile],
}));
