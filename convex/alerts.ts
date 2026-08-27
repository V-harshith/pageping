import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";

// ponytail: no @types/node in this project; Convex exposes deployment env vars via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

export const sendAlert = internalAction({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, { to, subject, body }) => {
    try {
      if (!process.env.AGENTMAIL_API_KEY) {
        console.warn("[alerts] AGENTMAIL_API_KEY not set; skipping email");
        return null;
      }
      await ctx.runAction(internal.mail.sendEmail, { to, subject, text: body });
    } catch (err) {
      console.warn("[alerts] email skipped:", err);
    }
    return null;
  },
});

export const recordAlertSent = internalMutation({
  args: { watchId: v.id("watches"), kind: v.string(), sentAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { watchId, kind, sentAt }) => {
    await ctx.db.insert("alertLog", { watchId, kind, sentAt });
    return null;
  },
});

export const alertHistory = internalQuery({
  args: { watchId: v.id("watches"), limit: v.number() },
  returns: v.array(v.object({ kind: v.string(), sentAt: v.number() })),
  handler: async (ctx, { watchId, limit }) => {
    // ponytail: hard ceiling so callers can't force an oversized read
    const rows = await ctx.db
      .query("alertLog")
      .withIndex("by_watch", (q) => q.eq("watchId", watchId))
      .order("desc")
      .take(Math.max(0, Math.min(limit, 100)));
    return rows.map((row) => ({ kind: row.kind, sentAt: row.sentAt }));
  },
});
