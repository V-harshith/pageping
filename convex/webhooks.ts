import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const deliver = internalAction({
  args: {
    url: v.string(),
    payload: v.object({
      event: v.string(),
      publicId: v.string(),
      title: v.string(),
      pageUrl: v.string(),
      price: v.optional(v.number()),
      currency: v.optional(v.string()),
      checkedAt: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (_ctx, { url, payload }) => {
    if (!/^https?:\/\//i.test(url)) return null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, source: "pageping" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) console.warn(`[webhook] ${url} responded ${res.status}`);
    } catch (err) {
      console.warn(`[webhook] delivery failed for ${url}:`, err);
    }
    return null;
  },
});
