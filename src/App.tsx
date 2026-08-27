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

let toastFn: ((msg: string) => void) | null = null;
export function toast(msg: string) { toastFn?.(msg); }

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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    toastFn = (m: string) => {
      setToastMsg(FRIENDLY[m] ?? m);
      setTimeout(() => setToastMsg(null), 4000);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {page}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
