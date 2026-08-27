const raw = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
export const SITE_URL =
  raw ?? (import.meta.env.VITE_CONVEX_URL as string).replace(".convex.cloud", ".convex.site");
