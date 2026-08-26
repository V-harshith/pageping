// @ts-expect-error Node types are intentionally not part of the app dependency set.
import assert from "node:assert/strict";
// @ts-expect-error Node types are intentionally not part of the app dependency set.
import test from "node:test";

import {
  ALERT_MIN_GAP_MS,
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
  assert.equal(extractPrice("Now only ₹1,299.50"), 1299.5);
  assert.equal(extractPrice("Was $42"), 42);
  assert.equal(extractPrice("€10 then £5"), 10);
  assert.equal(extractPrice("No listed price"), null);
  assert.equal(extractPrice("$10,000,001"), null);
  assert.equal(extractPrice("$0"), null);
});

test("any-change alerts on first check and changes, but not the same hash", () => {
  assert.deepEqual(evaluate({ condition: "any-change", previousHash: null, nextHash: "a", now: 0 }), { changed: true, alert: true });
  assert.deepEqual(evaluate({ condition: "any-change", previousHash: "a", nextHash: "b", now: 0 }), { changed: true, alert: true });
  assert.deepEqual(evaluate({ condition: "any-change", previousHash: "a", nextHash: "a", now: 0 }), { changed: false, alert: false });
});

test("keyword alerts once per appearance episode, case-insensitively", () => {
  assert.deepEqual(evaluate({ condition: "keyword", previousHash: "a", nextHash: "b", content: "BACK in stock", keyword: "back IN stock", prevHadKeyword: false, now: 0 }), { changed: true, alert: true });
  assert.deepEqual(evaluate({ condition: "keyword", previousHash: "b", nextHash: "c", content: "back in stock", keyword: "BACK IN STOCK", prevHadKeyword: true, now: 0 }), { changed: true, alert: false });
  assert.deepEqual(evaluate({ condition: "keyword", previousHash: "c", nextHash: "d", content: "sold out", keyword: "back in stock", prevHadKeyword: false, now: 0 }), { changed: true, alert: false });
});

test("price alerts at threshold and only below the prior alerted price", () => {
  assert.deepEqual(evaluate({ condition: "price-below", previousHash: "a", nextHash: "b", nextPrice: 100, targetPrice: 100, previousAlertedPrice: null, now: 0 }), { changed: true, alert: true });
  assert.deepEqual(evaluate({ condition: "price-below", previousHash: "b", nextHash: "c", nextPrice: 90, targetPrice: 100, previousAlertedPrice: 95, now: 0 }), { changed: true, alert: true });
  assert.deepEqual(evaluate({ condition: "price-below", previousHash: "c", nextHash: "d", nextPrice: 95, targetPrice: 100, previousAlertedPrice: 95, now: 0 }), { changed: true, alert: false });
  assert.deepEqual(evaluate({ condition: "price-below", previousHash: "d", nextHash: "e", nextPrice: null, targetPrice: 100, previousAlertedPrice: null, now: 0 }), { changed: true, alert: false });
});

test("minimum alert gap allows the exact boundary", () => {
  const base = { condition: "any-change" as const, previousHash: "a", nextHash: "b", lastAlertAt: 1_000 };
  assert.deepEqual(evaluate({ ...base, now: 1_000 + ALERT_MIN_GAP_MS - 1 }), { changed: true, alert: false });
  assert.deepEqual(evaluate({ ...base, now: 1_000 + ALERT_MIN_GAP_MS }), { changed: true, alert: true });
});

test("buildDiff returns added and removed rows", () => {
  assert.deepEqual(buildDiff("same\nold\n", "same\nnew\n"), [
    { type: " ", text: "same" },
    { type: "-", text: "old" },
    { type: "+", text: "new" },
  ]);
});
