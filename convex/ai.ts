import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ponytail: OpenAI-compatible endpoint via env; set OPENAI_API_KEY (+ optional OPENAI_BASE_URL, OPENAI_MODEL)
declare const process: { env: Record<string, string | undefined> };

export const setAiSummary = internalMutation({
  args: { snapshotId: v.id("snapshots"), summary: v.string() },
  returns: v.null(),
  handler: async (ctx, { snapshotId, summary }) => {
    await ctx.db.patch(snapshotId, { aiSummary: summary });
    return null;
  },
});

export const summarize = internalAction({
  args: {
    snapshotId: v.id("snapshots"),
    title: v.string(),
    url: v.string(),
    markdown: v.string(),
    kind: v.string(),
    price: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { snapshotId, title, url, markdown, kind, price }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const event =
      kind === "price"
        ? `the price dropped to ${price ?? "unknown"}`
        : kind === "keyword"
          ? "a watched keyword appeared on the page"
          : "the page content changed";
    const prompt = `A user watches the webpage "${title}" (${url}). A check found that ${event}. Page content:\n"""\n${markdown}\n"""\nIn under 40 words of plain text, say WHAT changed and why someone watching this page would care. No preamble.`;
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 120,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const summary = data.choices?.[0]?.message?.content?.trim();
      if (summary) await ctx.runMutation(internal.ai.setAiSummary, { snapshotId, summary });
    } catch (err) {
      console.warn("[ai] summarize failed:", err);
    }
    return null;
  },
});
