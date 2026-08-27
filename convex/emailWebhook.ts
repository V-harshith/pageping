import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { upsertUser } from "./auth";
import { makePublicId } from "./watches";

// ponytail: no @types/node here; deployment env vars come via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

const MAX_WATCHES_PER_USER = 25;

function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)>"]+/);
  return m ? m[0] : null;
}

/**
 * Inbound-mail automation: an email whose body contains a URL becomes an
 * any-change watch for that sender. Payload shape per @agentmail/convex README;
 * reply rides the existing alerts.sendAlert (warn-skips without API key).
 */
export const onMessageReceived = internalMutation({
  args: { message: v.any(), thread: v.any(), eventId: v.string() },
  returns: v.null(),
  handler: async (ctx, { message }) => {
    const text: string = message?.text ?? "";
    const from = message?.from ?? "";
    const url = firstUrl(text);
    const userEmail = from.trim().toLowerCase();
    if (!from.includes("@") || !url) return null;

    // ponytail: upsertUser takes a loose {db:any}; db.get falls back to untyped rows here
    const userId = await upsertUser(ctx as { db: any }, userEmail);
    const user = (await ctx.db.get(userId)) as unknown;
    if (!user) return null;
    // ponytail: O(n) scan bounded by MAX_WATCHES_PER_USER=25 rows
    const mine = await ctx.db
      .query("watches")
      .withIndex("by_owner", (q) => q.eq("ownerEmail", userEmail))
      .collect();
    if (mine.length >= MAX_WATCHES_PER_USER) return null;
    const dup = mine.find((w) => w.url === url && w.status === "active");
    let publicId = dup?.publicId;
    if (!publicId) {
      publicId = makePublicId();
      await ctx.db.insert("watches", {
        ownerEmail: userEmail,
        url,
        title: "",
        condition: "any-change",
        status: "active",
        deadNotified: false,
        failureCount: 0,
        lastCheckedAt: 0,
        createdAt: Date.now(),
        publicId,
      });
    }

    await ctx.scheduler.runAfter(0, internal.alerts.sendAlert, {
      to: from,
      subject: `Now watching: ${url}`,
      body: `PagePing is now watching ${url}\nTrack live: ${process.env.CONVEX_SITE_URL ?? ""}/w/${publicId}`,
    });
    return null;
  },
});
