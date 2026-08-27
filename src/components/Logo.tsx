import { nav } from "../lib/session";
import { FOCUS_RING, U_TRANSITION } from "../lib/ui";

export default function Logo({ onClick }: { onClick?: () => void }) {
  const content = (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="size-5 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#09090b" stroke="#27272a" />
        <circle cx="16" cy="16" r="11" fill="none" stroke="#10b981" strokeOpacity="0.25" strokeWidth="2" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="#10b981" strokeOpacity="0.5" strokeWidth="2" />
        <circle cx="16" cy="16" r="3.5" fill="#10b981" />
      </svg>
      <span>PagePing</span>
    </>
  );
  if (!onClick)
    return <span className="flex items-center gap-2 text-lg font-bold">{content}</span>;
  return (
    <button
      type="button"
      aria-label="Go to PagePing home"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 rounded-lg text-lg font-bold ${FOCUS_RING} ${U_TRANSITION}`}
    >
      {content}
    </button>
  );
}
