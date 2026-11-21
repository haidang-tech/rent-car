type TripState = { status: string; pickup_at: string; return_at: string };

export function selectCurrentTrip<T extends TripState>(trips: T[], now = Date.now()): T | null {
  const active = trips.filter(trip => ["pending", "confirmed", "signed", "handed_over"].includes(trip.status));
  const rank = (trip: T) => trip.status === "handed_over" ? 0
    : Date.parse(trip.pickup_at) <= now && Date.parse(trip.return_at) > now ? 1
    : Date.parse(trip.pickup_at) >= now ? 2 : 3;
  return active.sort((a, b) => rank(a) - rank(b) || Date.parse(a.pickup_at) - Date.parse(b.pickup_at))[0] ?? null;
}

/** Read-only records stay accessible; mutation routes follow the booking lifecycle. */
export function tripRouteApplies(route: string, status: string): boolean {
  const beforePickup = ["pending", "confirmed", "signed"].includes(status);
  if (["", "ekyc", "hop-dong", "thanh-toan"].includes(route)) return true;
  if (["doi-xe", "huy"].includes(route)) return beforePickup;
  if (["gia-han", "su-co"].includes(route)) return beforePickup || status === "handed_over";
  if (route === "danh-gia") return status === "completed";
  return false;
}
