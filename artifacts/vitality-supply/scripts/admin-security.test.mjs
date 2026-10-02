import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const storeApi = await readFile(new URL("../src/lib/store-api.ts", import.meta.url), "utf8");
const adminRoute = await readFile(new URL("../src/routes/admin.tsx", import.meta.url), "utf8");

test("admin authorization requires a verified staff account", () => {
  const requireAdmin = storeApi.slice(
    storeApi.indexOf("export async function requireAdmin"),
    storeApi.indexOf("function num"),
  );
  assert.match(requireAdmin, /"emailVerified"/);
  assert.match(requireAdmin, /emailVerified !== true/);
  assert.match(requireAdmin, /isAdminEmail/);
});

test("customer detail output never selects or serializes credentials", () => {
  const detail = storeApi.slice(
    storeApi.indexOf("export const loadAdminCustomer"),
    storeApi.indexOf("export const validatePromo"),
  );
  assert.doesNotMatch(detail, /\bpassword\b/i);
  assert.doesNotMatch(detail, /\baccount\b/i);
  assert.match(detail, /limit \$\{pageSize\} offset \$\{offset\}/);
  assert.match(detail, /emailVerified/);
  assert.match(adminRoute, /Passwords cannot be viewed by staff/);
});

test("customer listing has bounded pagination and admin middleware", () => {
  const list = storeApi.slice(
    storeApi.indexOf("export const listAdminCustomers"),
    storeApi.indexOf("export const loadAdminCustomer"),
  );
  assert.match(list, /\.middleware\(\[authMiddleware\]\)/);
  assert.match(list, /Math\.min\(50/);
  assert.match(list, /limit \$\{pageSize\} offset \$\{offset\}/);
  assert.match(list, /where \(/);
});