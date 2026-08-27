// @ts-expect-error Node types are intentionally not part of the app dependency set.
import assert from "node:assert/strict";
// @ts-expect-error Node types are intentionally not part of the app dependency set.
import test from "node:test";

import { CHECK_INTERVAL_MS, isDueWatch, snapshotIdsToDelete } from "../convex/check";

test("never-checked active watch is due, freshly checked is not", () => {
  const now = 1_000_000;
  assert.equal(isDueWatch({ status: "active" }, now), true);
  assert.equal(isDueWatch({ status: "active", lastCheckedAt: now - CHECK_INTERVAL_MS }, now), true);
  assert.equal(isDueWatch({ status: "active", lastCheckedAt: now - CHECK_INTERVAL_MS + 1 }, now), false);
});

test("dead watches are never due regardless of lastCheckedAt", () => {
  assert.equal(isDueWatch({ status: "dead" }, Date.now()), false);
});

test("trim keeps the newest snapshots up to cap", () => {
  const snaps = Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, checkedAt: i * 1000 }));
  const toDelete = snapshotIdsToDelete(snaps, 20);
  assert.equal(toDelete.length, 5);
  assert.deepEqual(toDelete, ["s0", "s1", "s2", "s3", "s4"]);
});

test("trim is a no-op at or under cap and stable with equal timestamps", () => {
  assert.deepEqual(snapshotIdsToDelete([], 20), []);
  const exact = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, checkedAt: i * 10 }));
  assert.deepEqual(snapshotIdsToDelete(exact, 20), []);
  const tied = [
    { id: "a", checkedAt: 500 },
    { id: "b", checkedAt: 500 },
    { id: "c", checkedAt: 900 },
  ];
  assert.equal(snapshotIdsToDelete(tied, 2).length, 1);
});
