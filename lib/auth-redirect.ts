/** Only known local destinations; never accept external or encoded paths. */
export function safeAuthNext(value: string, roleHome: string): string {
  if (!value.startsWith("/") || /[\\\u0000-\u0020\u007f]/.test(value) || value.startsWith("//")) return roleHome;
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || url.pathname.includes("%")) return roleHome;
    const allowed = ["/xe", roleHome];
    if (url.pathname !== "/" && !allowed.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) return roleHome;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return roleHome; }
}
