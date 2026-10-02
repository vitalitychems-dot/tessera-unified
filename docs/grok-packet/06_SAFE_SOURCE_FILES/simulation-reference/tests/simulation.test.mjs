import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PrivateStore } from "../src/store.mjs";
import { createService, hasAnyConfiguredProvider } from "../src/server.mjs";
import { createSimulationGateway } from "../src/simulation.mjs";

const signingKey = "simulation-test-key-with-more-than-32-characters";
const config = { keys: { local: signingKey }, dummyKey: "dummy", owners: new Set(["owner"]) };
const env = { TESSERA_XAI_API_KEY: "TEST_ONLY_NOT_A_REAL_KEY", TESSERA_XAI_MODEL: "simulation-test-model" };

test("service startup accepts a single configured provider for its own capability", () => {
  assert.equal(hasAnyConfiguredProvider({}), false);
  assert.equal(hasAnyConfiguredProvider({
    TESSERA_XAI_API_KEY: "TEST_ONLY_NOT_A_REAL_KEY",
    TESSERA_XAI_MODEL: "simulation-test-model",
  }), true);
  assert.equal(hasAnyConfiguredProvider({
    TESSERA_XAI_API_KEY: "TEST_ONLY_NOT_A_REAL_KEY",
  }), false);
  assert.equal(hasAnyConfiguredProvider({
    TESSERA_PROVIDER_API_KEY: "test-only",
    TESSERA_PROVIDER_MODEL: "manager-test-model",
  }), true);
});

async function fixture(generate) {
  const directory = mkdtempSync(join(tmpdir(), "tessera-simulation-test-"));
  chmodSync(directory, 0o700);
  const store = new PrivateStore(join(directory, "private.sqlite"));
  const simulation = createSimulationGateway({ env, generate });
  const server = createService({ store, config, simulation });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    store,
    url: `http://127.0.0.1:${server.address().port}/v1/gateway`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

async function signed(url, method, payload = {}, staffUserId = "owner") {
  const body = JSON.stringify({
    version: 1,
    method,
    staffUserId,
    requestId: randomUUID(),
    timestamp: Date.now(),
    nonce: randomUUID(),
    payload,
  });
  const signature = createHmac("sha256", signingKey).update(body).digest("hex");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tessera-key-id": "local",
      "x-tessera-signature": `sha256=${signature}`,
    },
    body,
  });
  return { status: response.status, result: await response.json() };
}

test("synthetic simulation create, chat handoff, return-home, and deletion stay inside the fake provider", async (t) => {
  const calls = [];
  const f = await fixture(async (input) => {
    assert.equal(typeof input.prompt, "string");
    calls.push(input);
    return {
      title: "Fictional Valley Observatory",
      summary: "A small team studies changing light over a quiet valley.",
      narrative: `Simulation response to: ${input.prompt}`,
      agents: [{
        name: "Mira",
        role: "Observatory researcher",
        description: "Tracks observations in the fictional setting.",
        state: "Preparing a new observation.",
      }],
      citations: [{ url: "https://example.org/simulation-reference", title: "example.org" }],
      model: "simulation-test-model",
      provider: "Grok (xAI)",
    };
  });
  t.after(() => f.close());

  const initialStatus = await signed(f.url, "simulation.status");
  assert.equal(initialStatus.status, 200);
  assert.equal(initialStatus.result.data.state, "configured_unverified");
  assert.equal(initialStatus.result.data.sourceCoverageComplete, false);

  const created = await signed(f.url, "simulation.create", { prompt: "A fictional observatory in a valley." });
  assert.equal(created.status, 200);
  const initialWorld = created.result.data.world;
  assert.equal(initialWorld.mode, "home");
  assert.equal(initialWorld.version, 1);
  assert.equal(initialWorld.events.length, 1);
  assert.equal(initialWorld.events[0].kind, "world");

  const entered = await signed(f.url, "simulation.enterChat", {
    worldId: initialWorld.id,
    expectedVersion: initialWorld.version,
  });
  assert.equal(entered.status, 200);
  const chatWorld = entered.result.data.world;
  assert.equal(chatWorld.mode, "chat");
  assert.equal(chatWorld.version, 2);

  const replied = await signed(f.url, "simulation.chat", {
    worldId: chatWorld.id,
    expectedVersion: chatWorld.version,
    prompt: "What does the fictional team notice tonight?",
  });
  assert.equal(replied.status, 200);
  const savedWorld = replied.result.data.world;
  assert.equal(savedWorld.mode, "chat");
  assert.equal(savedWorld.version, 3);
  assert.equal(savedWorld.events.filter((event) => event.kind === "chat").length, 1);
  assert.equal(replied.result.data.event.kind, "chat");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.mode), ["create", "chat"]);
  assert.equal(calls[1].world.title, initialWorld.title);
  assert.equal(calls[1].knowledge.length, 0);
  assert.equal(calls[1].prompt, "What does the fictional team notice tonight?");

  const readBack = await signed(f.url, "simulation.get", { worldId: savedWorld.id });
  assert.equal(readBack.status, 200);
  assert.equal(readBack.result.data.world.events.filter((event) => event.kind === "chat").length, 1);

  const returned = await signed(f.url, "simulation.returnHome", {
    worldId: savedWorld.id,
    expectedVersion: savedWorld.version,
  });
  assert.equal(returned.status, 200);
  assert.equal(returned.result.data.world.mode, "home");
  assert.equal(returned.result.data.world.version, 4);
  assert.equal(calls.length, 2, "mode switching must not make a provider call");

  const deleted = await signed(f.url, "simulation.delete", {
    worldId: savedWorld.id,
    expectedVersion: returned.result.data.world.version,
  });
  assert.equal(deleted.status, 200);
  assert.deepEqual(deleted.result.data, { deleted: true });
  assert.deepEqual((await signed(f.url, "simulation.list")).result.data.worlds, []);
  assert.equal((await signed(f.url, "simulation.get", { worldId: savedWorld.id })).status, 404);
});

test("simulation chat rejects wrong mode, stale versions, and non-owner requests before generation", async (t) => {
  let generated = 0;
  const f = await fixture(async () => {
    generated++;
    return {
      title: "Fictional Valley Observatory",
      summary: "A small team studies changing light over a quiet valley.",
      narrative: "A synthetic observation.",
      agents: [],
      citations: [{ url: "https://example.org/simulation-reference", title: "example.org" }],
      model: "simulation-test-model",
      provider: "Grok (xAI)",
    };
  });
  t.after(() => f.close());

  const created = await signed(f.url, "simulation.create", { prompt: "A fictional observatory." });
  const world = created.result.data.world;
  assert.equal((await signed(f.url, "simulation.chat", {
    worldId: world.id, expectedVersion: world.version, prompt: "Send before entering chat.",
  })).status, 409);
  assert.equal((await signed(f.url, "simulation.create", {
    prompt: "A fictional observatory.", 
  }, "another-staff-user")).status, 403);
  assert.equal((await signed(f.url, "simulation.advance", {
    worldId: world.id, expectedVersion: world.version + 1, prompt: "Stale update.",
  })).status, 409);
  assert.equal(generated, 1, "only the initial create prompt reaches the fake generator");
});