export function validMoney(value: unknown, allowZero = true): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  return allowZero ? value >= 0 : value > 0;
}

export function validIncidentStatus(value: string): boolean {
  return ["new", "processing", "resolved"].includes(value);
}

export function validFineStatus(value: string): boolean {
  return ["new", "verifying", "waiting", "resolved"].includes(value);
}

export function validMaintenanceStatus(value: string): boolean {
  return ["in_progress", "completed"].includes(value);
}
