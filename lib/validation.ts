export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

/** Trả về thông báo lỗi, hoặc null khi tệp hợp lệ. */
export function validateImage(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
    return "Chỉ nhận ảnh JPG, PNG hoặc WebP.";
  }
  if (file.size <= 0) return "Tệp ảnh rỗng, vui lòng chọn ảnh khác.";
  if (file.size > MAX_IMAGE_BYTES) return "Ảnh tối đa 5 MB.";
  return null;
}

export function validateDateWindow(pickup: string, ret: string): string | null {
  const start = new Date(pickup).getTime();
  const end = new Date(ret).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "Vui lòng chọn thời gian nhận và trả xe.";
  if (end <= start) return "Thời gian trả phải sau thời gian nhận.";
  return null;
}

/** yyyy-mm-dd theo giờ máy, dùng cho input type="date". */
export function localDateInput(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
