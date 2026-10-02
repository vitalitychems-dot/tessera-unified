import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const authServer = readFileSync(join(root, "src", "lib", "auth", "server.ts"), "utf8");
const storeApi = readFileSync(join(root, "src", "lib", "store-api.ts"), "utf8");
const login = readFileSync(join(root, "src", "routes", "login.tsx"), "utf8");

test("email/password accounts require verification before a session is created", () => {
  assert.match(authServer, /requireEmailVerification:\s*true/);
  assert.match(authServer, /autoSignIn:\s*false/);
});

test("account history never claims guest orders by email", () => {
  const accountHandler = storeApi.match(
    /export const loadMyAccount[\s\S]*?\nexport \{/,
  )?.[0];
  assert.ok(accountHandler, "loadMyAccount handler should exist");
  assert.match(accountHandler, /where user_id = \$\{context\.userId\}/);
  assert.doesNotMatch(accountHandler, /lower\(email\)/);
  assert.doesNotMatch(accountHandler, /verifiedEmail/);
  assert.doesNotMatch(storeApi, /lower\(email\) = \$\{email\}/);
});

test("signup keeps an unverified user on the verification prompt", () => {
  assert.match(login, /setNeedsVerification\(true\)/);
  assert.match(login, /verify your email before signing in/);
  assert.doesNotMatch(
    login,
    /Unverified accounts remain usable for ordinary account access/,
  );
});