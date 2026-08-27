import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  otpCodes: defineTable({
    email: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  watches: defineTable({
    ownerEmail: v.string(),
    url: v.string(),
    title: v.string(),
    publicId: v.string(),
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
  })
    .index("by_owner", ["ownerEmail"])
    .index("by_due", ["status", "lastCheckedAt"])
    .index("by_owner_url", ["ownerEmail", "url"]),

  snapshots: defineTable({
    watchId: v.id("watches"),
    checkedAt: v.number(),
    contentHash: v.string(),
    markdown: v.string(),
    price: v.optional(v.number()),
  }).index("by_watch_time", ["watchId", "checkedAt"]),

  alertLog: defineTable({
    watchId: v.id("watches"),
    kind: v.string(),
    sentAt: v.number(),
  }).index("by_watch", ["watchId"]),

  config: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
