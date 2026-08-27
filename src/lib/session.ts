const KEY = "pp_session";
export const getSession = (): string | null => localStorage.getItem(KEY);
export const saveSession = (t: string) => localStorage.setItem(KEY, t);
export const clearSession = () => localStorage.removeItem(KEY);
export function nav(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
