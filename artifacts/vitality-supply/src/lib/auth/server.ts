import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { ADMIN_EMAIL } from "../business";
import { getPool } from "../db-pool.server";
import { isAdminBootstrapContext } from "./bootstrap-context.server";
import { DEV_HOST_PATTERNS, SITE_HOSTNAMES } from "./site-hosts.server";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value || undefined;
};

const databaseUrl = env("DATABASE_URL");
const authSecret = env("BETTER_AUTH_SECRET") ?? env("SESSION_SECRET");
const explicitBaseURL = env("BETTER_AUTH_URL");
const localPort = env("PORT") ?? "8080";

export const authConfigured = Boolean(databaseUrl) && Boolean(authSecret);

// Exact deployment hosts in production; Replit preview wildcards only in dev.
const allowedHosts = [
  ...DEV_HOST_PATTERNS,
  ...SITE_HOSTNAMES,
  "localhost",
  "127.0.0.1",
  "[::1]",
];

const trustedOrigins = [
  ...DEV_HOST_PATTERNS.map((pattern) => `https://${pattern}`),
  ...SITE_HOSTNAMES.map((hostname) => `https://${hostname}`),
  "http://localhost:*",
  "http://127.0.0.1:*",
  "http://[::1]:*",
  ...(explicitBaseURL ? [explicitBaseURL] : []),
];

// Replit deployments terminate TLS at Google's external HTTP(S) frontend. The
// frontend appends the original client address and its own address to
// X-Forwarded-For. Keep this list limited to Google's documented frontend
// ranges: trusting arbitrary/private ranges would let a directly connected
// caller spoof the address used for rate limiting.
const trustedProxyCidrs = ["35.191.0.0/16", "130.211.0.0/22"];

const baseURL =
  explicitBaseURL ??
  ({
    allowedHosts,
    protocol: "auto" as const,
    fallback: `http://localhost:${localPort}`,
  } as const);

const configuredAuth = authConfigured
  ? betterAuth({
      baseURL,
      secret: authSecret as string,
      // Same pool as app queries — one bounded set of connections per process.
      database: getPool(),
      trustedOrigins,
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        requireEmailVerification: true,
        autoSignIn: false,
      },
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
          // Keep Better Auth responsible for token creation and verification.
          // This callback only renders and delivers the signed link.
          const { sendAuthVerificationEmail } = await import("./email.server");
          await sendAuthVerificationEmail({ user, url });
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
      },
      databaseHooks: {
        user: {
          create: {
            before: async (user) => {
              if (
                user.email.trim().toLowerCase() === ADMIN_EMAIL &&
                !isAdminBootstrapContext()
              ) {
                throw new APIError("FORBIDDEN", {
                  message:
                    "Staff accounts are provisioned by the owner. Sign in instead.",
                });
              }
            },
          },
        },
      },
      advanced: {
        ipAddress: {
          // Better Auth rejects multi-hop X-Forwarded-For chains unless the
          // proxy hops are explicitly trusted. Do not add client-controlled
          // alternatives such as X-Real-IP here.
          ipAddressHeaders: ["x-forwarded-for"],
          trustedProxies: trustedProxyCidrs,
        },
        useSecureCookies: false,
        cookiePrefix: "vs-auth",
        defaultCookieAttributes: {
          secure: true,
          sameSite: "none",
          partitioned: true,
          path: "/",
        },
      },
      plugins: [
        bearer(),
        // Must remain last so Set-Cookie headers reach TanStack Start responses.
        tanstackStartCookies(),
      ],
    })
  : null;

type AuthInstance = NonNullable<typeof configuredAuth>;

const unavailableMessage =
  "[auth] Authentication is unavailable. Configure DATABASE_URL and SESSION_SECRET (or BETTER_AUTH_SECRET).";

const unavailableAuth = {
  handler: async () =>
    new Response(JSON.stringify({ error: unavailableMessage }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    }),
  api: {
    getSession: async () => null,
  },
} as unknown as AuthInstance;

export const auth: AuthInstance = configuredAuth ?? unavailableAuth;