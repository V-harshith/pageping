import { useEffect, useState } from "react";
import { getSession, nav } from "../lib/session";
import AddWatchForm from "../components/AddWatchForm";
import Logo from "../components/Logo";
import { BTN_PRIMARY, CARD, FOCUS_RING, U_TRANSITION } from "../lib/ui";

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(!!getSession()), []);
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <header className="mb-20 flex items-center justify-between">
        <Logo onClick={() => nav("/")} />
        {signedIn ? (
          <button
            className={`text-sm font-medium text-stone-600 hover:text-stone-900 ${FOCUS_RING} ${U_TRANSITION}`}
            onClick={() => nav("/dashboard")}
          >
            Dashboard →
          </button>
        ) : (
          <button
            className={`text-sm font-medium text-stone-600 hover:text-stone-900 ${FOCUS_RING} ${U_TRANSITION}`}
            onClick={() => nav("/login")}
          >
            Sign in
          </button>
        )}
      </header>

      <p className="rise text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
        Free · Open source · No extension
      </p>

      <h1
        className="rise mt-5 font-serif text-5xl leading-[1.08] tracking-tight text-stone-900 sm:text-6xl"
        style={{ animationDelay: "80ms" }}
      >
        Watch any webpage.
        <br />
        <span className="italic text-emerald-700">Get emailed</span> when it
        changes.
      </h1>

      <p
        className="rise mt-6 max-w-xl text-lg leading-relaxed text-stone-600"
        style={{ animationDelay: "160ms" }}
      >
        Exam results. Medicine restocks. Price drops. New postings. Visualping
        charges $13/mo for this. PagePing is free.
      </p>

      <div className="rise mt-9" style={{ animationDelay: "240ms" }}>
        {signedIn ? (
          <AddWatchForm />
        ) : (
          <button className={BTN_PRIMARY} onClick={() => nav("/login")}>
            Start watching free →
          </button>
        )}
        <p className="mt-3 text-sm text-stone-500">
          Just your email — no password. Your account is created automatically.
        </p>
      </div>

      <div
        className="rise mt-24 grid gap-4 sm:grid-cols-3"
        style={{ animationDelay: "320ms" }}
      >
        {[
          ["01", "Paste any URL", "No extension, no app. Works with any public page."],
          ["02", "Pick a trigger", "Any change · keyword appears · price drops below."],
          ["03", "Get the email", "Hourly checks, instant diff view, zero spam."],
        ].map(([n, h, b]) => (
          <div key={n} className={CARD + " " + U_TRANSITION}>
            <p className="font-serif text-sm italic text-emerald-700">{n}</p>
            <p className="mt-2 font-medium text-stone-900">{h}</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">{b}</p>
          </div>
        ))}
      </div>

      <footer className="mt-24 border-t border-stone-200 pt-6 text-center text-xs text-stone-400">
        Built on Convex · scraped by Firecrawl · emailed by AgentMail
      </footer>
    </div>
  );
}
