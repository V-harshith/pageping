import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";

// ponytail: no @types/node in this project; Convex exposes deployment env vars via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

// ponytail: direct AgentMail REST instead of @agentmail/convex component — its FunctionReferences
// fail to resolve on real deployments ("Couldn't resolve agentmail.lib.createInbox"); swap back
// if the component library ships a fix.
const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

async function agentmailFetch(path: string, init?: { method?: string; body?: unknown }) {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) throw new Error("AGENTMAIL_API_KEY not set");
  const res = await fetch(AGENTMAIL_BASE + path, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`AgentMail API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? res.json() : null;
}

export const getConfigRow = internalQuery({
  args: {},
  returns: v.union(v.null(), v.object({ key: v.string(), value: v.string() })),
  handler: async (ctx) => {
    const row = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "agentmail_inbox"))
      .unique();
    return row ? { key: row.key, value: row.value } : null;
  },
});

export const saveConfig = internalMutation({
  args: { value: v.string() },
  returns: v.null(),
  handler: async (ctx, { value }) => {
    const existing = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "agentmail_inbox"))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { value });
    else await ctx.db.insert("config", { key: "agentmail_inbox", value });
    return null;
  },
});

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { to, subject, text }) => {
    const cfg = await ctx.runQuery(internal.mail.getConfigRow, {});
    let inboxId = cfg ? cfg.value.split("|")[0] : undefined;
    if (!inboxId) {
      // Reuse an existing inbox when possible — free plan caps inbox creation at 3.
      // ponytail: list is permission-capped on some API keys (403); fall through to create.
      let inbox: { inbox_id?: unknown; email?: string } | undefined;
      try {
        const listed = await agentmailFetch("/inboxes");
        const arr: Array<{ inbox_id?: unknown; email?: string }> = Array.isArray(listed)
          ? listed
          : ((listed?.inboxes ?? []) as Array<{ inbox_id?: unknown; email?: string }>);
        inbox = arr[0];
      } catch {
        inbox = undefined;
      }
      const chosen =
        inbox && (inbox.inbox_id !== undefined || inbox.email !== undefined)
          ? inbox
          : await agentmailFetch("/inboxes", { method: "POST", body: {} });
      inboxId = String(chosen.inbox_id ?? chosen.email);
      await ctx.runMutation(internal.mail.saveConfig, {
        value: `${chosen.inbox_id ?? chosen.email}|${chosen.email ?? chosen.inbox_id}`,
      });
    }
    await agentmailFetch(`/inboxes/${inboxId}/messages/send`, {
      method: "POST",
      body: { to, subject, text },
    });
    return null;
  },
});
