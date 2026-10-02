import test from "node:test";
import assert from "node:assert/strict";
import {
  assertUniqueServicePorts,
  isLoopbackPostgresUrl,
  samePostgresDatabase,
} from "./suite-policy.mjs";

test("accepts explicit loopback PostgreSQL URLs with a database name", () => {
  assert.equal(isLoopbackPostgresUrl("postgresql://test:pw@localhost:5432/tessera_test"), true);
  assert.equal(isLoopbackPostgresUrl("postgres://test:pw@127.0.0.1/tessera_test"), true);
  assert.equal(isLoopbackPostgresUrl("postgresql://test:pw@[::1]:5433/tessera_test"), true);
});

test("rejects empty hosts, missing database names, non-PostgreSQL protocols, and remote hosts", () => {
  assert.equal(isLoopbackPostgresUrl("postgresql:///tessera_test?host=localhost"), false);
  assert.equal(isLoopbackPostgresUrl("postgresql://localhost"), false);
  assert.equal(isLoopbackPostgresUrl("https://localhost/tessera_test"), false);
  assert.equal(isLoopbackPostgresUrl("postgresql://db.example.com/tessera_test"), false);
});

test("rejects remote host and hostaddr query overrides even when the URL hostname is local", () => {
  assert.equal(isLoopbackPostgresUrl("postgresql://localhost/tessera_test?host=db.example.com"), false);
  assert.equal(isLoopbackPostgresUrl("postgresql://localhost/tessera_test?hostaddr=10.0.0.4"), false);
  assert.equal(isLoopbackPostgresUrl("postgresql://localhost/tessera_test?host=localhost,10.0.0.4"), false);
});

test("rejects service-file indirection and malformed ports", () => {
  assert.equal(isLoopbackPostgresUrl("postgresql://localhost/tessera_test?service=production"), false);
  assert.equal(isLoopbackPostgresUrl("postgresql://localhost:99999/tessera_test"), false);
  assert.equal(isLoopbackPostgresUrl("postgresql://localhost/tessera_test?port=5432&port=5433"), false);
});

test("detects the same database target regardless of credentials or postgres scheme alias", () => {
  assert.equal(
    samePostgresDatabase("postgres://user1:pw1@localhost:5432/tessera", "postgresql://user2:pw2@localhost/tessera"),
    true,
  );
  assert.equal(samePostgresDatabase("postgresql://localhost/tessera", "postgresql://localhost/other"), false);
  assert.equal(samePostgresDatabase("postgresql://localhost/tessera", "postgresql://127.0.0.1/tessera"), false);
});

test("rejects duplicate service ports before starting any child process", () => {
  assert.equal(assertUniqueServicePorts([{ label: "web", port: "3000" }, { label: "api", port: 5000 }]), true);
  assert.throws(
    () => assertUniqueServicePorts([{ label: "web", port: "3000" }, { label: "api", port: 3000 }]),
    /assigned to both web and api/,
  );
  assert.throws(() => assertUniqueServicePorts([{ label: "bad", port: 0 }]), /invalid TCP port/);
});
