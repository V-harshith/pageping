export const U_TRANSITION =
  "transition-colors duration-150 motion-reduce:transition-none";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/60";

export const BTN_PRIMARY = `rounded-lg bg-stone-900 px-5 py-3 font-medium text-white shadow-sm hover:bg-stone-700 disabled:opacity-50 ${FOCUS_RING} ${U_TRANSITION}`;

export const BTN_GHOST = `rounded-md border border-stone-200 bg-white px-3 py-2 text-sm min-h-[36px] text-stone-700 hover:border-stone-300 hover:text-stone-900 disabled:opacity-50 ${FOCUS_RING} ${U_TRANSITION}`;

export const BTN_DANGER = `rounded-md border border-red-200 bg-white px-3 py-2 text-sm min-h-[36px] text-red-700 hover:bg-red-50 disabled:opacity-50 ${FOCUS_RING} ${U_TRANSITION}`;

export const INPUT = `w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-600 ${FOCUS_RING} ${U_TRANSITION}`;

export const CARD = "rounded-xl border border-stone-200 bg-white p-4 shadow-sm";

export const SKELETON = "animate-pulse rounded bg-stone-200";

export function statusPill(status: string) {
  if (status === "active")
    return {
      cls: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-600",
      label: "Active",
    };
  if (status === "dead")
    return {
      cls: "bg-red-100 text-red-700",
      dot: "bg-red-500",
      label: "Dead",
    };
  return {
    cls: "bg-stone-100 text-stone-600",
    dot: "bg-stone-400",
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };
}
