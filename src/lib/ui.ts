export const U_TRANSITION =
  "transition-colors duration-150 motion-reduce:transition-none";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60";

export const BTN_PRIMARY = `rounded-lg bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500 disabled:opacity-50 ${FOCUS_RING} ${U_TRANSITION}`;

export const BTN_GHOST = `rounded-md bg-zinc-800 px-3 py-2 text-sm min-h-[36px] hover:bg-zinc-700 disabled:opacity-50 ${FOCUS_RING} ${U_TRANSITION}`;

export const BTN_DANGER = `rounded-md bg-red-900/70 px-3 py-2 text-sm min-h-[36px] hover:bg-red-800 ${FOCUS_RING} ${U_TRANSITION}`;

export const INPUT = `w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500 ${FOCUS_RING} ${U_TRANSITION}`;

export const CARD = "rounded-xl border border-zinc-800 bg-zinc-900 p-4";

export const SKELETON = "animate-pulse rounded bg-zinc-800";

export function statusPill(status: string) {
  if (status === "active")
    return {
      cls: "bg-emerald-950 text-emerald-400",
      dot: "bg-emerald-400",
      label: "Active",
    };
  if (status === "dead")
    return {
      cls: "bg-red-950 text-red-400",
      dot: "bg-red-500",
      label: "Dead",
    };
  return {
    cls: "bg-zinc-800 text-zinc-300",
    dot: "bg-zinc-400",
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };
}
