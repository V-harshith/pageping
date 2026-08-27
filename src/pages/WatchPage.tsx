import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import DiffView from "../components/DiffView";
import AddWatchForm from "../components/AddWatchForm";
import { nav, getSession } from "../lib/session";
import { money } from "../lib/money";

function ago(ts: number) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export default function WatchPage({ id }: { id: string }) {
  const valid = /^[0-9a-z]{20,}$/.test(id);
  const data = useQuery(
    api.watches.getPublic,
    valid ? { watchId: id as Id<"watches"> } : "skip",
  );
  const session = getSession();

  if (!valid || data === null)
    return (
      <Shell>
        <p>Watch not found.</p>
        <BackLink />
      </Shell>
    );
  if (data === undefined)
    return (
      <Shell>
        <p className="text-zinc-500">Loading…</p>
      </Shell>
    );

  const { watch, snapshots } = data;
  const latest = snapshots[0];
  const previous = snapshots[1];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="cursor-pointer text-xl font-bold" onClick={() => nav("/")}>
          PagePing
        </h1>
        <span
          className={`rounded-full px-2 py-1 text-xs ${watch.status === "active" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"}`}
        >
          {watch.status}
        </span>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-semibold">{watch.title || watch.url}</h2>
        <a href={watch.url} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 underline">
          {watch.url}
        </a>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {watch.currentPrice != null && (
            <span>
              Price now:{" "}
              <b className="text-emerald-400">
                {money(watch.currency)}
                {watch.currentPrice}
              </b>
            </span>
          )}
          {watch.targetPrice != null && (
            <span className="text-zinc-400">
              Target: {money(watch.currency)}
              {watch.targetPrice}
            </span>
          )}
          {watch.keyword && <span className="text-zinc-400">Watching for: "{watch.keyword}"</span>}
          <span className="text-zinc-500">
            {watch.lastCheckedAt ? `Checked ${ago(watch.lastCheckedAt)}` : "First check pending…"}
          </span>
        </div>
      </section>

      {watch.status === "dead" && (
        <p className="mt-3 rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
          This site stopped responding — checks are paused.
        </p>
      )}

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Latest change</h3>
        {latest && previous ? (
          <>
            <p className="mb-2 text-xs text-zinc-500">
              {ago(previous.checkedAt)} → {ago(latest.checkedAt)}
            </p>
            <DiffView oldText={previous.markdown} newText={latest.markdown} />
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            {latest ? "Only one snapshot so far — no change detected yet." : "No snapshots yet."}
          </p>
        )}
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          History ({snapshots.length} recent changes)
        </h3>
        <ol className="space-y-1 text-sm text-zinc-400">
          {snapshots.map((s) => (
            <li key={s.contentHash + s.checkedAt} className="flex justify-between border-b border-zinc-800 py-1">
              <span>Change detected</span>
              <span className="text-zinc-500">{ago(s.checkedAt)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-xl border border-dashed border-zinc-700 p-4">
        <h3 className="mb-2 font-semibold">Want updates like this?</h3>
        <AddWatchForm presetUrl={watch.url} />
      </section>

      {session && <BackLink />}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-8">
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={() => nav("/dashboard")}>
      Back to dashboard
    </button>
  );
}