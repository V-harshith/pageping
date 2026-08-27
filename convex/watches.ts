import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

const PUBLIC_ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** 8-char url-safe id (64-char alphabet, byte%64 is uniform since 256%64==0). */
export function makePublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let id = "";
  for (const b of bytes) id += PUBLIC_ID_ALPHABET[b % 64];
  return id;
}

/** Throws with a readable message instead of silently fixing bad input. */
export function validateWatchUrl(raw: string): string {
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new ConvexError("URL must start with http:// or https://");
  }
  try {
    new URL(url);
  } catch {
    throw new ConvexError("URL is malformed");
  }
  return url;
}

export function titleFromUrl(url: string): string {
  return new URL(url).hostname;
}

async function requireEmail(ctx: { db: any }, token: string): Promise<string> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("UNAUTHORIZED");
  }
  const user = await ctx.db.get(session.userId);
  if (!user) throw new ConvexError("UNAUTHORIZED");
  return user.email;
}

function conditionArgsValid(
  condition: "any-change" | "keyword" | "price-below",
  keyword?: string,
  targetPrice?: number,
): boolean {
  if (condition === "keyword") return !!keyword && keyword.trim().length > 0;
  if (condition === "price-below") return targetPrice != null && targetPrice > 0;
  return true;
}

const watchView = {
  _id: v.id("watches"),
  publicId: v.string(),
  url: v.string(),
  title: v.string(),
  condition: v.union(
    v.literal("any-change"),
    v.literal("keyword"),
    v.literal("price-below"),
  ),
  keyword: v.optional(v.string()),
  targetPrice: v.optional(v.number()),
  currency: v.optional(v.string()),
  currentPrice: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("dead")),
  deadNotified: v.boolean(),
  failureCount: v.number(),
  lastCheckedAt: v.optional(v.number()),
  lastAlertedAt: v.optional(v.number()),
  lastAlertedPrice: v.optional(v.number()),
  lastHash: v.optional(v.string()),
  createdAt: v.number(),
};

const conditionArg = v.union(
  v.literal("any-change"),
  v.literal("keyword"),
  v.literal("price-below"),
);

export const create = mutation({
  args: {
    token: v.string(),
    url: v.string(),
    title: v.optional(v.string()),
    condition: conditionArg,
    keyword: v.optional(v.string()),
    targetPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  returns: v.object({ id: v.id("watches"), publicId: v.string() }),
  handler: async (ctx, { token, url, title, condition, keyword, targetPrice, currency }) => {
    const email = await requireEmail(ctx, token);
    const cleanUrl = validateWatchUrl(url);
    if (!conditionArgsValid(condition, keyword, targetPrice)) {
      throw new ConvexError(
        condition === "keyword"
          ? "keyword is required and must be non-empty"
          : "targetPrice must be greater than 0",
      );
    }
    const publicId = makePublicId();
    const id = await ctx.db.insert("watches", {
      ownerEmail: email,
      url: cleanUrl,
      title: title && title.trim() ? title.trim() : titleFromUrl(cleanUrl),
      publicId,
      condition,
      keyword: condition === "keyword" ? keyword!.trim() : undefined,
      targetPrice: condition === "price-below" ? targetPrice : undefined,
      currency,
      status: "active",
      deadNotified: false,
      failureCount: 0,
      createdAt: Date.now(),
    });
    return { id, publicId };
  },
});

export const list = query({
  args: { token: v.string() },
  returns: v.array(v.object(watchView)),
  handler: async (ctx, { token }) => {
    const email = await requireEmail(ctx, token);
    const docs = await ctx.db
      .query("watches")
      .withIndex("by_owner", (q) => q.eq("ownerEmail", email))
      .order("desc")
      .collect();
    return docs.map(({ _creationTime: _ct, ownerEmail: _oe, ...rest }) => rest);
  },
});

export const get = query({
  args: { token: v.string(), id: v.id("watches") },
  returns: v.union(v.null(), v.object(watchView)),
  handler: async (ctx, { token, id }) => {
    const email = await requireEmail(ctx, token);
    const doc = await ctx.db.get(id);
    if (!doc || doc.ownerEmail !== email) return null;
    const { _creationTime: _ct, ownerEmail: _oe, ...rest } = doc;
    return rest;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("watches"),
    title: v.optional(v.string()),
    condition: v.optional(conditionArg),
    keyword: v.optional(v.string()),
    targetPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("dead"))),
  },
  returns: v.union(v.null(), v.object(watchView)),
  handler: async (ctx, { token, id, ...fields }) => {
    const email = await requireEmail(ctx, token);
    const doc = await ctx.db.get(id);
    // Not-found and not-yours look identical on purpose.
    if (!doc || doc.ownerEmail !== email) return null;

    const condition = fields.condition ?? doc.condition;
    const keyword = fields.keyword ?? doc.keyword;
    const targetPrice = fields.targetPrice ?? doc.targetPrice;
    if (!conditionArgsValid(condition, keyword, targetPrice)) {
      throw new ConvexError(
        condition === "keyword"
          ? "keyword is required and must be non-empty"
          : "targetPrice must be greater than 0",
      );
    }

    // ponytail: fields can't be cleared back to unset (v.optional means "absent");
    // changing keyword/targetPrice values works, removal would need sentinel support later.
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch);

    const fresh = await ctx.db.get(id);
    if (!fresh) return null;
    const { _creationTime: _ct, ownerEmail: _oe, ...rest } = fresh;
    return rest;
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("watches") },
  returns: v.boolean(),
  handler: async (ctx, { token, id }) => {
    const email = await requireEmail(ctx, token);
    const doc = await ctx.db.get(id);
    if (!doc || doc.ownerEmail !== email) return false;

    const snaps = await ctx.db
      .query("snapshots")
      .withIndex("by_watch_time", (q) => q.eq("watchId", id))
      .collect();
    for (const s of snaps) await ctx.db.delete(s._id);

    const alerts = await ctx.db
      .query("alertLog")
      .withIndex("by_watch", (q) => q.eq("watchId", id))
      .collect();
    for (const a of alerts) await ctx.db.delete(a._id);

    await ctx.db.delete(id);
    return true;
  },
});
