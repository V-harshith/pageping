import { useState } from "react";
import { useMutation } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { getSession, nav } from "../lib/session";
import { toast } from "../App";
import { SITE_URL } from "../lib/site";
import { money } from "../lib/money";
import { BTN_DANGER, BTN_GHOST, CARD } from "../lib/ui";

type WatchView = FunctionReturnType<typeof api.watches.list>[number];

const LABELS = {
  "any-change": "Any change",
  keyword: "Keyword",
  "price-below": "Price \u2264",
} as const;


export default function WatchCard({ w }: { w: WatchView }) {
  const del = useMutation(api.watches.remove);
  const upd = useMutation(api.watches.update);
  const [busy, setBusy] = useState(false);
  const sid = getSession();

  async function togglePaused() {
    if (!sid) return;
    try {
      await upd({ token: sid, id: w._id, paused: w.paused !== true });
      toast(w.paused ? "Watch resumed." : "Watch paused.", "success");
    } catch {
      toast("Something went wrong.");
    }
  }

  async function refresh() {
    if (!sid) return;
    setBusy(true);
    try {
      const res = await fetch(`${SITE_URL}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: w.publicId }),
      });
      if (res.ok) toast("Queued — updating shortly.", "success");
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
    <div className={w.status === "dead" ? "rounded-xl border border-red-900 bg-red-950/40 p-4" : CARD}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{w.title || w.url}</p>
          <a
            href={w.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-stone-500 underline"
          >
            {w.url}
          </a>
        </div>
        {w.currentPrice != null && (
          <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-1 text-sm font-bold text-emerald-800">
            {money(w.currency)}
            {w.currentPrice}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {LABELS[w.condition]}
        {w.keyword ? `: "${w.keyword}"` : ""}
        {w.condition === "price-below" ? ` ${w.targetPrice}` : ""}
        {" · "}
        checked{" "}
        {w.lastCheckedAt != null
          ? `${Math.max(1, Math.round((Date.now() - w.lastCheckedAt) / 60000))}m ago`
          : "never"}
        {w.status === "dead" && " · DEAD (site unreachable)"}
        {w.paused && " · paused"}
        {" · "}
        <span className="font-mono text-stone-400">id {w.publicId}</span>
      </p>
      {w.condition === "price-below" && w.currentPrice == null && (
        <p className="mt-1 text-xs text-amber-500">
          ⚠ No price found on this page yet — price alerts won't fire.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button className={BTN_GHOST} onClick={() => nav(`/w/${w._id}`)}>
          Open
        </button>
        <button
          className={BTN_GHOST}
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh now
        </button>
        <button className={BTN_GHOST} onClick={() => void togglePaused()}>
          {w.paused ? "Resume" : "Pause"}
        </button>
        <button
          className={`ml-auto ${BTN_DANGER}`}
          onClick={() => void remove()}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
