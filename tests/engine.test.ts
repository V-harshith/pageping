// @ts-expect-error Node types are intentionally not part of the app dependency set.
import assert from "node:assert/strict";
// @ts-expect-error Node types are intentionally not part of the app dependency set.
import test from "node:test";

import {
  ALERT_MIN_GAP_MS,
  type EvalInput,
  type EvalOutput,
  buildDiff,
  evaluate,
  extractPrice,
  normalizeContent,
  sha256Hex,
} from "../src/lib/engine";

test("normalizeContent trims lines and drops empty lines", () => {
  assert.equal(normalizeContent("  first  \n\n  \n second\t\n"), "first\nsecond");
});

test("sha256Hex is stable and changes with the input", async () => {
  const first = await sha256Hex("page");
  assert.equal(first, await sha256Hex("page"));
  assert.notEqual(first, await sha256Hex("other page"));
  assert.match(first, /^[0-9a-f]{64}$/);
});

test("extractPrice parses rupees, dollars, and commas, otherwise null", () => {
  assert.deepEqual(extractPrice("Now only ₹1,299.50"), { price: 1299.5, currency: "₹" });
  assert.deepEqual(extractPrice("Was $42"), { price: 42, currency: "$" });
  assert.deepEqual(extractPrice("€10 then £5"), { price: 10, currency: "€" });
  assert.equal(extractPrice("No listed price"), null);
  assert.equal(extractPrice("$10,000,001"), null);
  assert.equal(extractPrice("$0"), null);
});

test("any-change alerts on first check and changes, but not the same hash", () => {
  const input: EvalInput = { condition: "any-change", prevHash: null, prevHadKeyword: false, nextHash: "a", nextText: "", nextPrice: null, now: 0 };
  const output: EvalOutput = evaluate(input);
  assert.deepEqual(output, { changed: true, alert: "change" });
  assert.deepEqual(evaluate({ ...input, prevHash: "a", nextHash: "b" }), { changed: true, alert: "change" });
  assert.deepEqual(evaluate({ ...input, prevHash: "a", nextHash: "a" }), { changed: false, alert: null });
});

test("keyword alerts once per appearance episode, case-insensitively", () => {
  const input: EvalInput = { condition: "keyword", keyword: "back IN stock", prevHash: "a", nextHash: "b", nextText: "BACK in stock", prevHadKeyword: false, nextPrice: null, now: 0 };
  assert.deepEqual(evaluate(input), { changed: true, alert: "keyword" });
  assert.deepEqual(evaluate({ ...input, prevHash: "b", nextHash: "c", prevHadKeyword: true }), { changed: true, alert: null });
  assert.deepEqual(evaluate({ ...input, prevHash: "a", nextHash: "a", nextText: "BACK in stock" }), { changed: false, alert: "keyword" });
});

test("empty keywords never alert", () => {
  assert.deepEqual(evaluate({
    condition: "keyword",
    keyword: "",
    prevHash: "a",
    nextHash: "b",
    nextText: "anything",
    prevHadKeyword: false,
    nextPrice: null,
    now: 0,
  }), { changed: true, alert: null });
});

test("price alerts at threshold and only below the prior alerted price", () => {
  const input: EvalInput = { condition: "price-below", prevHash: "a", nextHash: "a", nextText: "", nextPrice: 100, targetPrice: 100, lastAlertedPrice: null, prevHadKeyword: false, now: 0 };
  assert.deepEqual(evaluate(input), { changed: false, alert: "price" });
  assert.deepEqual(evaluate({ ...input, prevHash: "b", nextHash: "c", nextPrice: 90, lastAlertedPrice: 95 }), { changed: true, alert: "price" });
  assert.deepEqual(evaluate({ ...input, nextPrice: 95, lastAlertedPrice: 95 }), { changed: false, alert: null });
  assert.deepEqual(evaluate({ ...input, nextPrice: null }), { changed: false, alert: null });
});

test("minimum alert gap allows the exact boundary", () => {
  const base: EvalInput = { condition: "any-change", prevHash: "a", nextHash: "b", lastAlertedAt: 1_000, prevHadKeyword: false, nextText: "", nextPrice: null, now: 0 };
  assert.deepEqual(evaluate({ ...base, now: 1_000 + ALERT_MIN_GAP_MS - 1 }), { changed: true, alert: null });
  assert.deepEqual(evaluate({ ...base, now: 1_000 + ALERT_MIN_GAP_MS }), { changed: true, alert: "change" });
});

test("buildDiff returns added and removed rows", () => {
  assert.deepEqual(buildDiff("same\nold\n", "same\nnew\n"), [
    { type: " ", line: "same" },
    { type: "-", line: "old" },
    { type: "+", line: "new" },
  ]);
});
