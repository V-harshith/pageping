import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { AgentMail } from "@agentmail/convex";

// ponytail: no @types/node in this project; Convex exposes deployment env vars via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

// action ctx satisfies the component client structurally at runtime; `as never` skips its stricter copy of Convex types
const inboxCtx = (ctx: unknown): Parameters<AgentMail["createInbox"]>[0] => ctx as never;
const sendCtx = (ctx: unknown): Parameters<AgentMail["sendMessage"]>[0] => ctx as never;

// ponytail: module-level client, only uses sendMessage/createInbox APIs
const agentmail = new AgentMail(components.agentmail);

/** Reuse (or lazily provision) the single AgentMail inbox, same dance as auth.sendOtpEmail. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveInbox(ctx: any): Promise<string | undefined> {
  const cfg = await ctx.runQuery(internal.auth.getConfigRow, {});
  let inboxId = cfg ? cfg.value.split("|")[0] : undefined;
  if (!inboxId) {
    const inbox = await agentmail.createInbox(inboxCtx(ctx));
    inboxId = String(inbox.inbox_id);
    await ctx.runMutation(internal.auth.saveConfig, {
      value: `${inbox.inbox_id}|${inbox.email}`,
    });
  }
  return inboxId;
}

export const sendAlert = internalAction({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, { to, subject, body }) => {
    try {
      if (!process.env.AGENTMAIL_API_KEY) {
        console.warn("[alerts] AGENTMAIL_API_KEY not set; skipping email");
        return null;
      }
      const inboxId = await resolveInbox(ctx);
      if (!inboxId) return null;
      await agentmail.sendMessage(sendCtx(ctx), inboxId, {
        to,
        subject,
        text: body,
      });
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
