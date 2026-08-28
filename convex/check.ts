import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { FirecrawlClient } from "@firecrawl/firecrawl-convex";
import { extractPrice, evaluate, normalizeContent, sha256Hex } from "../src/lib/engine";

// ponytail: no @types/node in this project; deployment env vars come via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

export const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MAX_FAILURES = 5;
const SNAPSHOT_CAP = 20;

export function isDueWatch(
  w: { status: string; lastCheckedAt?: number; paused?: boolean },
  now: number,
  intervalMs = CHECK_INTERVAL_MS,
): boolean {
  return (
    w.status === "active" &&
    w.paused !== true &&
    (w.lastCheckedAt === undefined || now - w.lastCheckedAt >= intervalMs)
  );
}

type AlertKind = NonNullable<ReturnType<typeof evaluate>["alert"]>;

export function snapshotIdsToDelete(
  snaps: { id: string; checkedAt: number }[],
  cap = SNAPSHOT_CAP,
): string[] {
  const excess = Math.max(0, snaps.length - cap);
  return [...snaps]
    .sort((a, b) => a.checkedAt - b.checkedAt)
    .slice(0, excess)
    .map((s) => s.id);
}

// ponytail: module-level client, structural-cast mirrors the auth.ts pattern
const firecrawl = new FirecrawlClient(components.firecrawl);
const scrapeCtx = (ctx: unknown): Parameters<typeof firecrawl.scrape>[0] => ctx as never;

/** Active watches whose check is overdue (never-checked count as overdue). */
export const dueWatches = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.object({ watchId: v.id("watches") })),
  handler: async (ctx, { limit }) => {
    // ponytail: collects all actives then filters in JS; swap to an indexed range scan if watch volume ever matters
    const actives = await ctx.db
      .query("watches")
      .withIndex("by_due", (q) => q.eq("status", "active"))
      .collect();
    const now = Date.now();
    return actives
      .filter((w) => isDueWatch({ status: "active", lastCheckedAt: w.lastCheckedAt }, now))
      .slice(0, Math.max(0, Math.min(limit, 50)))
      .map((w) => ({ watchId: w._id }));
  },
});

/** Stamp lastCheckedAt BEFORE scraping so overlapping runs don't pile up. */
export const claimWatch = internalMutation({
  args: { watchId: v.id("watches") },
  returns: v.null(),
  handler: async (ctx, { watchId }) => {
    await ctx.db.patch(watchId, { lastCheckedAt: Date.now() });
    return null;
  },
});

export const loadWatch = internalQuery({
  args: { watchId: v.id("watches") },
  returns: v.union(v.null(), v.object({ url: v.string(), title: v.string() })),
  handler: async (ctx, { watchId }) => {
    const w = await ctx.db.get(watchId);
    if (!w || w.status !== "active" || w.paused === true) return null;
    return { url: w.url, title: w.title };
  },
});

export const runCheck = internalAction({
  args: { watchId: v.id("watches") },
  returns: v.null(),
  handler: async (ctx, { watchId }) => {
    const w = await ctx.runQuery(internal.check.loadWatch, { watchId });
    if (!w) return null;
    try {
      const doc = await firecrawl.scrape(scrapeCtx(ctx), w.url, {
        formats: ["markdown", "screenshot"],
        onlyMainContent: true,
        maxAge: 0,
      });
      const markdown = doc.markdown ?? "";
      if (!markdown.trim()) throw new Error("empty scrape result");
      const found = extractPrice(markdown);
      let screenshotId: string | undefined;
      const shot = (doc as { screenshot?: string }).screenshot;
      if (shot) {
        try {
          const bytes = shot.startsWith("data:")
            ? base64Bytes(shot.slice(shot.indexOf(",") + 1))
            : await (await fetch(shot)).arrayBuffer();
          screenshotId = await ctx.storage.store(new Blob([bytes]));
        } catch (err) {
          console.warn("[check] screenshot capture failed:", err);
        }
      }
      await ctx.runMutation(internal.check.recordCheck, {
        watchId,
        markdown,
        title: doc.metadata?.title?.trim() || w.title,
        price: found?.price,
        currency: found?.currency,
        ...(screenshotId ? { screenshotId: screenshotId as never } : {}),
      });
    } catch (err) {
      console.warn(`[check] scrape failed for ${watchId}:`, err);
      await ctx.runMutation(internal.check.recordFailure, { watchId });
    }
    return null;
  },
});

function base64Bytes(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function describeAlert(kind: AlertKind, opts: {
  title: string;
  url: string;
  publicId: string;
  keyword?: string;
  targetPrice?: number;
  price?: number | null;
  currency?: string | null;
}): { subject: string; text: string } {
  const site = process.env.CONVEX_SITE_URL ?? "";
  const link = `${site}/w/${opts.publicId}`;
  if (kind === "keyword") {
    return {
      subject: `[PagePing] Found "${opts.keyword}" on ${opts.title}`,
      text: `Your keyword "${opts.keyword}" now appears on:\n${opts.url}\n\nView diff: ${link}`,
    };
  }
  if (kind === "price" && opts.price != null && opts.targetPrice != null) {
    const shown = `${opts.currency ?? ""}${opts.price}`;
    return {
      subject: `[PagePing] Price drop on ${opts.title}`,
      text: `${shown} ≤ target ${opts.targetPrice}\n${opts.url}\n\nView: ${link}`,
    };
  }
  return {
    subject: `[PagePing] Page changed: ${opts.title}`,
    text: `Content changed on:\n${opts.url}\n\nView diff: ${link}`,
  };
}

export const recordCheck = internalMutation({
  args: {
    watchId: v.id("watches"),
    markdown: v.string(),
    title: v.string(),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    screenshotId: v.optional(v.id("_storage")),
  },
  returns: v.object({
    changed: v.boolean(),
    alert: v.union(v.null(), v.literal("change"), v.literal("keyword"), v.literal("price")),
  }),
  handler: async (ctx, { watchId, markdown, title, price, currency, screenshotId }) => {
    const w = await ctx.db.get(watchId);
    if (!w) return { changed: false, alert: null };

    const normalized = normalizeContent(markdown);
    const nextHash = await sha256Hex(normalized);
    const latestSnap = await ctx.db
      .query("snapshots")
      .withIndex("by_watch_time", (q) => q.eq("watchId", watchId))
      .order("desc")
      .first();
    // Plan-mandated derivation: keyword present in the previous snapshot's content.
    const prevHadKeyword =
      w.condition === "keyword" &&
      !!w.keyword &&
      !!latestSnap &&
      latestSnap.markdown.toLowerCase().includes((w.keyword ?? "").toLowerCase());

    const out = evaluate({
      condition: w.condition,
      keyword: w.keyword,
      targetPrice: w.targetPrice,
      prevHash: w.lastHash ?? null,
      prevHadKeyword,
      nextHash,
      nextText: normalized,
      nextPrice: price ?? null,
      lastAlertedAt: w.lastAlertedAt ?? null,
      lastAlertedPrice: w.lastAlertedPrice ?? null,
      now: Date.now(),
    });

    const patch: Record<string, unknown> = {
      failureCount: 0,
      title,
      status: "active",
      deadNotified: false,
    };
    if (price != null) patch.currentPrice = price;
    if (currency != null) patch.currency = currency;
    await ctx.db.patch(watchId, patch);

    let snapId: Id<"snapshots"> | undefined;
    if (out.changed && normalized) {
      const checkedAt = Date.now();
      snapId = await ctx.db.insert("snapshots", {
        watchId,
        checkedAt,
        contentHash: nextHash,
        markdown: normalized,
        ...(price != null ? { price } : {}),
        ...(screenshotId ? { screenshotId } : {}),
      });
      const snaps = await ctx.db
        .query("snapshots")
        .withIndex("by_watch_time", (q) => q.eq("watchId", watchId))
        .collect();
      for (const id of snapshotIdsToDelete(snaps.map((s) => ({ id: s._id, checkedAt: s.checkedAt })))) {
        await ctx.db.delete(id as never);
      }
      await ctx.db.patch(watchId, { lastHash: nextHash });
    }

    if (out.alert) {
      const now = Date.now();
      await ctx.db.insert("alertLog", { watchId, kind: out.alert, sentAt: now });
      const pricePatch: Record<string, unknown> = { lastAlertedAt: now };
      if (out.alert === "price" && price != null) pricePatch.lastAlertedPrice = price;
      await ctx.db.patch(watchId, pricePatch);
      const msg = describeAlert(out.alert, {
        title,
        url: w.url,
        publicId: w.publicId,
        keyword: w.keyword,
        targetPrice: w.targetPrice,
        price,
        currency,
      });
      await ctx.scheduler.runAfter(0, internal.alerts.sendAlert, {
        to: w.ownerEmail,
        subject: msg.subject,
        body: msg.text,
      });
      if (w.webhookUrl) {
        await ctx.scheduler.runAfter(0, internal.webhooks.deliver, {
          url: w.webhookUrl,
          payload: {
            event: out.alert,
            publicId: w.publicId,
            title,
            pageUrl: w.url,
            ...(price != null ? { price } : {}),
            ...(currency ? { currency } : {}),
            checkedAt: now,
          },
        });
      }
      if (snapId) {
        await ctx.scheduler.runAfter(0, internal.ai.summarize, {
          snapshotId: snapId,
          title,
          url: w.url,
          markdown: normalized.slice(0, 3000),
          kind: out.alert,
          ...(price != null ? { price } : {}),
        });
      }
    }

    return { changed: out.changed, alert: out.alert };
  },
});

export const recordFailure = internalMutation({
  args: { watchId: v.id("watches") },
  returns: v.null(),
  handler: async (ctx, { watchId }) => {
    const w = await ctx.db.get(watchId);
    if (!w) return null;
    const failures = (w.failureCount ?? 0) + 1;
    if (failures >= MAX_FAILURES && w.status === "active") {
      await ctx.db.patch(watchId, { failureCount: failures, status: "dead" });
      if (!w.deadNotified) {
        await ctx.db.patch(watchId, { deadNotified: true });
        await ctx.scheduler.runAfter(0, internal.alerts.sendAlert, {
          to: w.ownerEmail,
          subject: `[PagePing] Watch paused: ${w.title}`,
          body: `We could not reach ${w.url} after ${failures} consecutive attempts, so this watch is paused.\nIt revives automatically once a later scrape succeeds.`,
        });
      }
    } else {
      await ctx.db.patch(watchId, { failureCount: failures });
    }
    return null;
  },
});
