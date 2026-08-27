import { httpRouter } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { httpAction, internalMutation } from "./_generated/server";
import { AgentMail } from "@agentmail/convex";
import { CHECK_INTERVAL_MS } from "./check";

// action ctx satisfies the component handler structurally at runtime; `as never` skips its stricter copy
const hookCtx = (ctx: unknown): Parameters<AgentMail["handleWebhook"]>[0] => ctx as never;

// README "React to inbound mail": this instance owns webhook dispatch.
const agentmail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.emailWebhook.onMessageReceived,
});

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Claim an instant recheck: stamps lastCheckedAt only when stale, like crons.claimAndRun. */
export const recheckClaimed = internalMutation({
  args: { publicId: v.string() },
  returns: v.union(v.literal("ok"), v.literal("missing"), v.literal("recent")),
  handler: async (ctx, { publicId }) => {
    // by_publicId + unguessable id only; add rate-limit table before opening this to scraping at scale
    const w = await ctx.db
      .query("watches")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .unique();
    if (!w || w.status !== "active") return "missing";
    const now = Date.now();
    if (now - (w.lastCheckedAt ?? 0) < CHECK_INTERVAL_MS) return "recent";
    await ctx.db.patch(w._id, { lastCheckedAt: now });
    await ctx.scheduler.runAfter(0, internal.check.runCheck, { watchId: w._id });
    return "ok";
  },
});

const http = httpRouter();

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => agentmail.handleWebhook(hookCtx(ctx), req)),
});

http.route({
  path: "/api/check",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "invalid JSON body" });
    }
    const publicId = (body as { publicId?: unknown })?.publicId;
    if (typeof publicId !== "string" || !publicId) {
      return json(400, { error: "publicId required" });
    }
    const result = await ctx.runMutation(internal.http.recheckClaimed, { publicId });
    if (result === "ok") return json(200, { ok: true });
    if (result === "recent") return json(429, { ok: false, reason: "checked recently" });
    return json(404, { ok: false, reason: "unknown watch" });
  }),
});

export default http;
