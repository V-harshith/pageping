import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSession } from "../lib/session";
import { toast } from "../App";
import { BTN_PRIMARY, CARD, FOCUS_RING, INPUT, U_TRANSITION } from "../lib/ui";

function errMsg(e: unknown): string {
  const d = (e as { data?: unknown })?.data;
  return typeof d === "string" ? d : "Something went wrong.";
}

export default function AddWatchForm({ presetUrl = "" }: { presetUrl?: string }) {
  const create = useMutation(api.watches.create);
  const [url, setUrl] = useState(presetUrl);
  const [condition, setCondition] = useState<"any-change" | "keyword" | "price-below">("any-change");
  const [keyword, setKeyword] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const token = getSession();
    if (!token) return toast("Sign in first.");
    if (condition === "keyword" && !keyword.trim()) return toast("KEYWORD_REQUIRED");
    const tp = parseFloat(targetPrice);
    if (condition === "price-below" && (!Number.isFinite(tp) || tp <= 0))
      return toast("TARGET_REQUIRED");
    setBusy(true);
    try {
      await create({
        token,
        url: url.trim(),
        condition,
        ...(condition === "keyword" ? { keyword } : {}),
        ...(condition === "price-below"
          ? { targetPrice: tp, currency: "USD" }
          : {}),
        ...(webhookUrl.trim() ? { webhookUrl: webhookUrl.trim() } : {}),
      });
      setUrl(""); setKeyword(""); setTargetPrice(""); setWebhookUrl("");
      toast("Watching.", "success");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={CARD}>
      <input
        className={INPUT}
        placeholder="https://any-store.com/product-page"
        aria-label="URL to watch"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        {(["any-change", "keyword", "price-below"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCondition(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${condition === c ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"} ${FOCUS_RING} ${U_TRANSITION}`}
          >
            {c === "any-change" ? "Any change" : c === "keyword" ? "Keyword appears" : "Price drops below"}
          </button>
        ))}
      </div>
      {condition === "keyword" && (
        <input
          className={`mt-2 ${INPUT}`}
          placeholder='e.g. "in stock"'
          aria-label="Keyword to watch for"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      )}
      {condition === "price-below" && (
        <input
          className={`mt-2 ${INPUT}`}
          placeholder="Target price e.g. 999"
          aria-label="Target price"
          inputMode="decimal"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
        />
      )}
      <input
        className={`mt-2 ${INPUT}`}
        placeholder="Optional webhook URL — POSTs JSON on every alert"
        aria-label="Webhook URL (optional)"
        value={webhookUrl}
        onChange={(e) => setWebhookUrl(e.target.value)}
      />
      <button
        className={`mt-3 ${BTN_PRIMARY} w-full`}
        disabled={busy || !url.trim()}
        onClick={() => void submit()}
      >
        Start watching
      </button>
    </div>
  );
}
