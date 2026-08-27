import { useMemo } from "react";
import { buildDiff } from "../lib/engine";

export default function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const rows = useMemo(() => buildDiff(oldText, newText), [oldText, newText]);
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No textual diff.</p>;
  return (
    <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs leading-5">
      {rows.slice(0, 200).map((r, i) => (
        <div
          key={i}
          className={r.type === "+" ? "bg-emerald-950 text-emerald-300" : r.type === "-" ? "bg-red-950 text-red-300" : "text-zinc-500"}
        >
          <span className="mr-2 select-none opacity-50">{r.type}</span>
          {r.line}
        </div>
      ))}
    </pre>
  );
}
