import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { saveSession, nav } from "../lib/session";
import { toast } from "../App";

function errMsg(e: unknown): string {
  const d = (e as { data?: unknown })?.data;
  return typeof d === "string" ? d : "Something went wrong.";
}

const inputCls =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500";
const btnCls =
  "rounded-lg bg-emerald-600 px-3 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50";

export default function Login() {
  const requestOtp = useAction(api.auth.requestOtp);
  const verifyOtp = useMutation(api.auth.verifyOtp);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      await requestOtp({ email });
      setStep("code");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await verifyOtp({ email, code });
      saveSession(r.token);
      nav("/dashboard");
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Sign in to PagePing</h1>
      {step === "email" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            className={inputCls}
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className={btnCls} disabled={busy || !email.includes("@")} type="submit">
            Send code
          </button>
        </form>
      ) : (
        <>
          <p className="text-sm text-zinc-400">Code sent to {email}</p>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
          >
            <input
              className={`${inputCls} tracking-widest`}
              placeholder="6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className={btnCls} disabled={busy || code.length !== 6} type="submit">
              Verify &amp; sign in
            </button>
          </form>
        </>
      )}
    </div>
  );
}
