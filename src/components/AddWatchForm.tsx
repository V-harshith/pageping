import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSession } from "../lib/session";
import { toast } from "../App";

function errMsg(e: unknown): string {
  const d = (e as { data?: unknown })?.data;
  return typeof d === "string" ? d : "Something went wrong.";
}

const inputCls =
  "rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500";

export default function AddWatchForm() {
  const create = useMutation(api.watches.create);
  const [url, setUrl] = useState("");
  const [condition, setCondition] = useState<"any-change" | "keyword" | "price-below">("any-change");
  const [keyword, setKeyword] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
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
      });
      setUrl(""); setKeyword(""); setTargetPrice("");
      toast("Watching.");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <input
        className={inputCls}
        placeholder="https://any-store.com/product-page"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex gap-2">
        {(["any-change", "keyword", "price-below"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCondition(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${condition === c ? "bg-emerald-600" : "bg-zinc-800 hover:bg-zinc-700"}`}
          >
            {c === "any-change" ? "Any change" : c === "keyword" ? "Keyword appears" : "Price drops below"}
          </button>
        ))}
      </div>
      {condition === "keyword" && (
        <input
          className={inputCls}
          placeholder='e.g. "in stock"'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      )}
      {condition === "price-below" && (
        <input
          className={inputCls}
          placeholder="Target price e.g. 999"
          inputMode="decimal"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
        />
      )}
      <button
        className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
        disabled={busy || !url.trim()}
        onClick={() => void submit()}
      >
        Start watching
      </button>
    </div>
  );
}
