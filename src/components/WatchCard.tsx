import { useState } from "react";
import { useMutation } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { getSession, nav } from "../lib/session";
import { toast } from "../App";
import { SITE_URL } from "../lib/site";

type WatchView = FunctionReturnType<typeof api.watches.list>[number];

const LABELS = {
  "any-change": "Any change",
  keyword: "Keyword",
  "price-below": "Price \u2264",
} as const;


export default function WatchCard({ w }: { w: WatchView }) {
  const del = useMutation(api.watches.remove);
  const [busy, setBusy] = useState(false);
  const sid = getSession();

  async function refresh() {
    if (!sid) return;
    setBusy(true);
    try {
      const res = await fetch(`${SITE_URL}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: w.publicId }),
      });
      if (res.ok) toast("Queued — updating shortly.");
      else if (res.status === 429) toast("TOO_SOON");
      else toast("NOT_FOUND");
    } catch {
      toast("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!sid || !window.confirm(`Delete watch on ${w.url}?`)) return;
    try {
      await del({ token: sid, id: w._id });
    } catch {
      toast("Something went wrong.");
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 ${w.status === "dead" ? "border-red-900 bg-red-950/40" : "border-zinc-800 bg-zinc-900"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{w.title || w.url}</p>
          <a
            href={w.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-zinc-500 underline"
          >
            {w.url}
          </a>
        </div>
        {w.currentPrice != null && (
          <span className="shrink-0 rounded-md bg-emerald-950 px-2 py-1 text-sm font-bold text-emerald-400">
            {w.currency ?? "$"}
            {w.currentPrice}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {LABELS[w.condition]}
        {w.keyword ? `: "${w.keyword}"` : ""}
        {w.condition === "price-below" ? ` ${w.targetPrice}` : ""}
        {" · "}
        checked{" "}
        {w.lastCheckedAt != null
          ? `${Math.max(1, Math.round((Date.now() - w.lastCheckedAt) / 60000))}m ago`
          : "never"}
        {w.status === "dead" && " · DEAD (site unreachable)"}
        {" · "}
        <span className="font-mono text-zinc-500">id {w.publicId}</span>
      </p>
      {w.condition === "price-below" && w.currentPrice == null && (
        <p className="mt-1 text-xs text-amber-500">
          ⚠ No price found on this page yet — price alerts won't fire.
        </p>
      )}
      <div className="mt-3 flex gap-2 text-xs">
        <button
          className="rounded-md bg-zinc-800 px-2 py-1 hover:bg-zinc-700"
          onClick={() => nav(`/w/${w._id}`)}
        >
          Open
        </button>
        <button
          className="rounded-md bg-zinc-800 px-2 py-1 hover:bg-zinc-700 disabled:opacity-50"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh now
        </button>
        <button
          className="ml-auto rounded-md bg-red-900/70 px-2 py-1 hover:bg-red-800"
          onClick={() => void remove()}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
