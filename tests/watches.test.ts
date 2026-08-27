// @ts-expect-error Node types are intentionally not part of the app dependency set.
import assert from "node:assert/strict";
// @ts-expect-error Node types are intentionally not part of the app dependency set.
import test from "node:test";

import { makePublicId, titleFromUrl, validateWatchUrl } from "../convex/watches";

test("validateWatchUrl accepts http and https and trims whitespace", () => {
  assert.equal(validateWatchUrl("  https://example.com/page "), "https://example.com/page");
  assert.equal(validateWatchUrl("http://example.com"), "http://example.com");
});

test("validateWatchUrl throws instead of silently fixing missing scheme or garbage", () => {
  assert.throws(() => validateWatchUrl("example.com/page"));
  assert.throws(() => validateWatchUrl("ftp://example.com/file"));
  assert.throws(() => validateWatchUrl(""));
  assert.throws(() => validateWatchUrl("https://"));
});

test("makePublicId is always 8 url-safe chars and varies between calls", () => {
  const ids = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const id = makePublicId();
    assert.match(id, /^[A-Za-z0-9_-]{8}$/);
    ids.add(id);
  }
  assert.ok(ids.size > 1, "randomness expected across calls");
});

test("titleFromUrl returns the hostname", () => {
  assert.equal(titleFromUrl("https://Example.com:443/path?q=1"), "example.com");
});
