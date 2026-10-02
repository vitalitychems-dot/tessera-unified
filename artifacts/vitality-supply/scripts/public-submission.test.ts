import assert from "node:assert/strict";
import test from "node:test";
import { boundedText, canonicalEmail } from "../src/lib/public-input";

test("canonicalEmail creates a stable case-insensitive abuse key", () => {
  assert.equal(canonicalEmail("  Researcher@Example.COM "), "researcher@example.com");
  assert.equal(canonicalEmail("not-an-email"), null);
  assert.equal(canonicalEmail("a@b.c"), "a@b.c");
  assert.equal(canonicalEmail(`a${"x".repeat(260)}@example.com`), null);
});

test("boundedText rejects oversized and control-bearing public fields", () => {
  assert.equal(boundedText("  laboratory  ", 20, true), "laboratory");
  assert.equal(boundedText("", 20, true), null);
  assert.equal(boundedText("x".repeat(21), 20), null);
  assert.equal(boundedText("safe\nnotes", 20), "safe\nnotes");
  assert.equal(boundedText("bad\u0000input", 20), null);
});