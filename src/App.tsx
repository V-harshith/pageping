import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import WatchPage from "./pages/WatchPage";

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return path;
}

export type ToastKind = "error" | "success";

let toastFn: ((msg: string, kind?: ToastKind) => void) | null = null;
export function toast(msg: string, kind: ToastKind = "error") {
  toastFn?.(msg, kind);
}

const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: "Please sign in again.",
  BAD_URL: "That doesn't look like a valid http(s) URL.",
  KEYWORD_REQUIRED: "Enter a keyword to watch for.",
  TARGET_REQUIRED: "Enter a target price above zero.",
  LIMIT_REACHED: "You've hit the 25-watch limit.",
  TOO_SOON: "Refreshed recently — check back in 10 minutes.",
  INVALID_EMAIL: "That email doesn't look right.",
  OTP_EXPIRED: "Code expired — request a new one.",
  WRONG_CODE: "Wrong code, try again.",
  NOT_FOUND: "Not found.",
};

export default function App() {
  const path = usePath();
  const [toastState, setToastState] = useState<{ msg: string; kind: ToastKind } | null>(null);
  useEffect(() => {
    toastFn = (m: string, kind: ToastKind = "error") => {
      setToastState({ msg: FRIENDLY[m] ?? m, kind });
      setTimeout(() => setToastState(null), 4000);
    };
  }, []);

  useEffect(() => {
    document.title = path.startsWith("/w/")
      ? "Watching · PagePing"
      : path === "/login"
        ? "Sign in · PagePing"
        : path === "/dashboard"
          ? "Dashboard · PagePing"
          : "PagePing — watch any page, get emailed";
  }, [path]);

  let page: React.ReactNode;
  if (path.startsWith("/w/")) page = <WatchPage id={path.slice(3)} />;
  else if (path === "/login") page = <Login />;
  else if (path === "/dashboard") page = <Dashboard />;
  else page = <Home />;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {page}
      {toastState && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
            toastState.kind === "success"
              ? "bg-stone-900 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toastState.msg}
        </div>
      )}
    </div>
  );
}
