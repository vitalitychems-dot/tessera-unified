import { ADMIN_EMAIL } from "../business";
import { getSql } from "../db";
import { runAsAdminBootstrap } from "./bootstrap-context.server";
import { auth, authConfigured } from "./server";

export type AdminBootstrapResult = {
  status: "skipped" | "exists" | "created";
};

const globalRef = globalThis as typeof globalThis & {
  __vitalityAdminBootstrapPromise__?: Promise<AdminBootstrapResult>;
  __vitalityAdminPasswordWarningLogged__?: boolean;
};

async function bootstrapAdminAccount(): Promise<AdminBootstrapResult> {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) {
    if (!globalRef.__vitalityAdminPasswordWarningLogged__) {
      globalRef.__vitalityAdminPasswordWarningLogged__ = true;
      console.warn("[auth] ADMIN_PASSWORD not set — staff account not bootstrapped");
    }
    return { status: "skipped" };
  }
  if (!authConfigured) {
    throw new Error(
      "[auth] Cannot bootstrap the staff account without DATABASE_URL and SESSION_SECRET (or BETTER_AUTH_SECRET).",
    );
  }

  const sql = await getSql();
  const existing = await sql<{ id: string }>`
    select "id" from "user" where lower("email") = ${ADMIN_EMAIL} limit 1
  `;
  if (existing.length) return { status: "exists" };

  try {
    await runAsAdminBootstrap(() =>
      auth.api.signUpEmail({
        body: {
          email: ADMIN_EMAIL,
          password,
          name: "Vitality Chems",
        },
      }),
    );
  } catch (error) {
    const raced = await sql<{ id: string }>`
      select "id" from "user" where lower("email") = ${ADMIN_EMAIL} limit 1
    `;
    if (raced.length) return { status: "exists" };
    throw error;
  }

  await sql`
    update "user" set "emailVerified" = true, "updatedAt" = now()
    where lower("email") = ${ADMIN_EMAIL}
  `;
  return { status: "created" };
}

export function ensureAdminAccount(): Promise<AdminBootstrapResult> {
  globalRef.__vitalityAdminBootstrapPromise__ ??= bootstrapAdminAccount().catch(
    (error) => {
      globalRef.__vitalityAdminBootstrapPromise__ = undefined;
      throw error;
    },
  );
  return globalRef.__vitalityAdminBootstrapPromise__;
}