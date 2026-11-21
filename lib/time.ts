export const VN_TZ = "Asia/Ho_Chi_Minh";
export const VN_OFFSET = "+07:00";

/** Strict datetime-local input, interpreted in Vietnam regardless of host TZ. */
export function parseVnDateTimeLocal(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const iso = `${value}:00${VN_OFFSET}`;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return vnDateTimeInput(date) === value ? iso : null;
}

function vnParts(value: string | Date): Record<string, string> {
  // Treat unzoned calendar values as Vietnam time, never the host timezone.
  const input = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00${VN_OFFSET}`
    : typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
      ? `${value}${VN_OFFSET}` : value;
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid date");
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
}

export function vnDateKey(value: string | Date): string {
  const p = vnParts(value);
  return `${p.year.padStart(4, "0")}-${p.month}-${p.day}`;
}

export function vnMonthStartIso(now = new Date()): string {
  return `${vnDateKey(now).slice(0, 7)}-01T00:00:00${VN_OFFSET}`;
}

export function vnDateTimeInput(value: string | Date): string {
  const p = vnParts(value);
  return `${p.year.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
