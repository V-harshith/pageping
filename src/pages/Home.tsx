import { useEffect, useState } from "react";
import { getSession, nav } from "../lib/session";
import AddWatchForm from "../components/AddWatchForm";

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(!!getSession()), []);
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <header className="mb-16 flex items-center justify-between">
        <span className="text-lg font-bold">👁️ PagePing</span>
        {signedIn ? (
          <button className="text-sm text-emerald-400 hover:underline" onClick={() => nav("/dashboard")}>
            Dashboard →
          </button>
        ) : (
          <button className="text-sm text-emerald-400 hover:underline" onClick={() => nav("/login")}>
            Sign in
          </button>
        )}
      </header>

      <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
        Watch any webpage.
        <br />
        <span className="text-emerald-400">Get emailed when it changes.</span>
      </h1>
      <p className="mt-4 text-zinc-400">
        Exam results. Medicine restocks. Price drops. New job postings. Visualping charges $13/mo for this.
        PagePing is free and open source.
      </p>

      <div className="mt-8">
        {signedIn ? (
          <AddWatchForm />
        ) : (
          <button
            className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500"
            onClick={() => nav("/login")}
          >
            Start watching free →
          </button>
        )}
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          ["Paste any URL", "No extension, no app. Works with any public page."],
          ["Pick a trigger", "Any change · keyword appears · price drops below."],
          ["Get the email", "Hourly checks, instant diff view, zero spam."],
        ].map(([h, b]) => (
          <div key={h} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="font-semibold">{h}</p>
            <p className="mt-1 text-sm text-zinc-400">{b}</p>
          </div>
        ))}
      </div>

      <footer className="mt-16 text-center text-xs text-zinc-600">
        Built on Convex · scraped by Firecrawl · emailed by AgentMail
      </footer>
    </div>
  );
}
