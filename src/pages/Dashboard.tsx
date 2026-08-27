import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSession, clearSession, nav } from "../lib/session";
import AddWatchForm from "../components/AddWatchForm";
import WatchCard from "../components/WatchCard";

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = getSession();
    if (!t) nav("/login");
    setToken(t);
  }, []);
  const watches = useQuery(api.watches.list, token ? { token } : "skip");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="cursor-pointer text-xl font-bold" onClick={() => nav("/")}>
          PagePing
        </h1>
        <button
          className="text-xs text-zinc-400 hover:text-zinc-200"
          onClick={() => {
            clearSession();
            nav("/");
          }}
        >
          Sign out
        </button>
      </header>
      <AddWatchForm />
      <div className="mt-6 grid gap-3">
        {watches === undefined && <p className="text-sm text-zinc-500">Loading…</p>}
        {watches?.length === 0 && (
          <p className="text-sm text-zinc-500">Nothing watched yet. Paste a URL above.</p>
        )}
        {watches?.map((w) => <WatchCard key={w._id} w={w} />)}
      </div>
      <footer className="mt-8 text-center text-xs text-zinc-600">
        Free forever · open source · powered by Convex + Firecrawl + AgentMail
      </footer>
    </div>
  );
}
