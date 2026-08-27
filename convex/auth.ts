import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { AgentMail } from "@agentmail/convex";
import { sha256Hex } from "../src/lib/engine";

// ponytail: no @types/node in this project; Convex exposes deployment env vars via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

// action ctx satisfies the component client structurally at runtime; `as never` skips its stricter copy of Convex types
const inboxCtx = (ctx: unknown): Parameters<AgentMail["createInbox"]>[0] => ctx as never;
const sendCtx = (ctx: unknown): Parameters<AgentMail["sendMessage"]>[0] => ctx as never;

// ponytail: module-level client, only uses sendMessage/createInbox APIs
const agentmail = new AgentMail(components.agentmail);

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cleanEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function randomSixDigitCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const b of bytes) code += String(b % 10);
  return code;
}

async function upsertUser(ctx: { db: any }, email: string) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .unique();
  if (existing) return existing;
  const userId = await ctx.db.insert("users", { email, createdAt: Date.now() });
  return ctx.db.get(userId);
}

/** Provision-and-send lives here so requestOtp stays a fast transactional mutation. */
export const sendOtpEmail = internalAction({
  args: { email: v.string(), code: v.string() },
  returns: v.null(),
  handler: async (ctx, { email, code }) => {
    try {
      if (!process.env.AGENTMAIL_API_KEY) {
        console.warn("[auth] AGENTMAIL_API_KEY not set; skipping OTP email");
        return null;
      }
      const cfg = await ctx.runQuery(internal.auth.getConfigRow, {});
      let inboxId: string | undefined = cfg ? cfg.value.split("|")[0] : undefined;
      if (!inboxId) {
        const inbox = await agentmail.createInbox(inboxCtx(ctx));
        inboxId = String(inbox.inbox_id);
        await ctx.runMutation(internal.auth.saveConfig, {
          value: `${inbox.inbox_id}|${inbox.email}`,
        });
      }
      await agentmail.sendMessage(sendCtx(ctx), inboxId, {
        to: email,
        subject: "Your PagePing login code",
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
      });
    } catch (err) {
      console.warn("[auth] OTP email skipped:", err);
    }
    return null;
  },
});

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

/**
 * Creates a fresh 6-digit code for `email`, invalidating prior codes,
 * and schedules delivery via AgentMail. Never throws on mail failure.
 */
export const requestOtp = internalMutation({
  args: { email: v.string() },
  returns: v.union(v.object({}), v.object({ debugCode: v.string() })),
  handler: async (ctx, { email }) => {
    const clean = cleanEmail(email);
    if (!clean.includes("@")) throw new ConvexError("INVALID_EMAIL");

    const prior = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q) => q.eq("email", clean))
      .collect();
    for (const row of prior) await ctx.db.delete(row._id);

    const code = randomSixDigitCode();
    await ctx.db.insert("otpCodes", {
      email: clean,
      codeHash: await sha256Hex(code),
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    await ctx.scheduler.runAfter(0, internal.auth.sendOtpEmail, {
      email: clean,
      code,
    });

    // Dev escape hatch so the positive path is testable without real mail delivery.
    if (process.env.AUTH_DEBUG === "true") return { debugCode: code };
    return {};
  },
});

export const verifyOtp = mutation({
  args: { email: v.string(), code: v.string() },
  returns: v.object({ token: v.string(), email: v.string() }),
  handler: async (ctx, { email, code }) => {
    const clean = cleanEmail(email);
    const normalized = code.trim();

    const otp = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q) => q.eq("email", clean))
      .order("desc")
      .first();
    if (!otp || otp.expiresAt < Date.now()) throw new ConvexError("OTP_EXPIRED");
    if ((await sha256Hex(normalized)) !== otp.codeHash) {
      throw new ConvexError("WRONG_CODE");
    }

    await ctx.db.delete(otp._id);

    const user = await upsertUser(ctx, clean);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return { token, email: clean };
  },
});

export const getSession = query({
  args: { token: v.string() },
  returns: v.union(v.null(), v.object({ email: v.string() })),
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return { email: user.email };
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return null;
  },
});
