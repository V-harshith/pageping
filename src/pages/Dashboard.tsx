import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSession, clearSession, nav } from "../lib/session";
import AddWatchForm from "../components/AddWatchForm";
import WatchCard from "../components/WatchCard";
import Logo from "../components/Logo";
import { CARD, FOCUS_RING, SKELETON, U_TRANSITION } from "../lib/ui";

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = getSession();
    if (!t) nav("/login");
    setToken(t);
  }, []);
  // Live ownership check: null session (expired/deleted) bounces to /login.
  const session = useQuery(api.auth.getSession, token ? { token } : "skip");
  const watches = useQuery(api.watches.list, token ? { token } : "skip");

  if (token === null) return null; // redirecting in effect
  if (session === undefined || (session !== null && watches === undefined)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-8 flex items-center justify-between">
          <Logo />
          <span className={`h-5 w-16 ${SKELETON}`} />
        </header>
        <div className={`h-32 ${SKELETON}`} />
        <div className="mt-6 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${CARD} space-y-2`}>
              <div className={`h-4 w-2/3 ${SKELETON}`} />
              <div className={`h-3 w-1/2 ${SKELETON}`} />
              <div className={`h-8 w-40 ${SKELETON}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (session === null) {
    clearSession();
    nav("/login");
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1>
          <Logo onClick={() => nav("/")} />
        </h1>
        <button
          className={`text-xs text-zinc-400 hover:text-zinc-200 ${FOCUS_RING} rounded px-1 ${U_TRANSITION}`}
          onClick={() => {
            clearSession();
            nav("/");
          }}
        >
          Sign out
        </button>
      </header>
      {session && <AddWatchForm />}
      <div className="mt-6 grid gap-3">
        {watches?.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <p aria-hidden="true" className="text-3xl text-zinc-600">↑</p>
            <p className="mt-2 text-sm text-zinc-500">
              Nothing watched yet — paste a URL above.
            </p>
          </div>
        )}
        {watches?.map((w) => <WatchCard key={w._id} w={w} />)}
      </div>
      <footer className="mt-8 text-center text-xs text-zinc-500">
        Free forever · open source · powered by Convex + Firecrawl + AgentMail
      </footer>
    </div>
  );
}
