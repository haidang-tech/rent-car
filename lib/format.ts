export const currency = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
};

export const shortCurrency = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
};

export const dateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
};

export const dateOnly = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
};

export const toDateTimeInput = (value?: string | null) => {
  const d = value ? new Date(value) : new Date();
  if (!value) d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const daysBetween = (from: string, to: string) =>
  Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));

export const BOOKING_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Chờ xác thực", tone: "warn" },
  confirmed: { label: "Đã xác nhận", tone: "info" },
  signed: { label: "Đã ký hợp đồng", tone: "info" },
  handed_over: { label: "Đang thuê", tone: "success" },
  returned: { label: "Đã trả xe", tone: "info" },
  completed: { label: "Hoàn tất", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "danger" },
};

export const CAR_STATUS: Record<string, { label: string; tone: string }> = {
  available: { label: "Sẵn sàng", tone: "success" },
  rented: { label: "Đang cho thuê", tone: "info" },
  maintenance: { label: "Bảo dưỡng", tone: "warn" },
  unavailable: { label: "Chưa sẵn sàng", tone: "muted" },
};

export const TX_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Chờ xử lý", tone: "warn" },
  paid: { label: "Đã thanh toán", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "danger" },
};

export const CHECK_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Chờ duyệt", tone: "warn" },
  approved: { label: "Đã duyệt", tone: "info" },
  in_progress: { label: "Đang thực hiện", tone: "info" },
  completed: { label: "Nghiệm thu", tone: "success" },
};
