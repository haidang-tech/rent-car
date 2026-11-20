export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

/** Trả về thông báo lỗi, hoặc null khi tệp hợp lệ. */
export function validateImage(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
    return "Chỉ nhận ảnh JPG, PNG hoặc WebP.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return "Tệp ảnh rỗng hoặc không hợp lệ, vui lòng chọn ảnh khác.";
  if (file.size > MAX_IMAGE_BYTES) return "Ảnh tối đa 5 MB.";
  return null;
}

export function validateDateWindow(pickup: string, ret: string): string | null {
  const isDateTime = (value: string) => {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(
        value,
      );
    if (!match) return false;
    const [, year, month, day, hour, minute, second = "0"] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day) ||
      Number(hour) > 23 ||
      Number(minute) > 59 ||
      Number(second) > 59
    ) {
      return false;
    }
    return !Number.isNaN(new Date(value).getTime());
  };
  if (!isDateTime(pickup) || !isDateTime(ret)) {
    return "Vui lòng chọn thời gian nhận và trả xe hợp lệ.";
  }
  const start = new Date(pickup).getTime();
  const end = new Date(ret).getTime();
  if (end <= start) return "Thời gian trả phải sau thời gian nhận.";
  return null;
}

/** yyyy-mm-dd theo giờ máy, dùng cho input type="date". */
export function localDateInput(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Validation for date-only search forms; uses the visitor's local calendar. */
export function validateDates(pickup: string, ret: string, today = localDateInput()): string | null {
  const isDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && localDateInput(parsed) === value;
  };
  if (!isDate(pickup) || !isDate(ret)) return "Vui lòng chọn ngày nhận và ngày trả hợp lệ.";
  if (pickup < today) return "Ngày nhận xe không được ở trong quá khứ.";
  if (ret <= pickup) return "Ngày trả xe phải sau ngày nhận xe.";
  return null;
}

export function nextDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return localDateInput(new Date(year, month - 1, day + 1));
}
