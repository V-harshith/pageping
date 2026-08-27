import { useMemo } from "react";
import { buildDiff } from "../lib/engine";

export default function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const rows = useMemo(() => buildDiff(oldText, newText), [oldText, newText]);
  if (rows.length === 0) return <p className="text-sm text-stone-500">No textual diff.</p>;
  return (
    <pre className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-3 font-mono text-xs leading-5">
      {rows.slice(0, 200).map((r, i) => (
        <div
          key={i}
          className={r.type === "+" ? "bg-emerald-50 text-emerald-800" : r.type === "-" ? "bg-red-50 text-red-700" : "text-stone-400"}
        >
          <span className="mr-2 select-none opacity-50">{r.type}</span>
          {r.line}
        </div>
      ))}
    </pre>
  );
}
