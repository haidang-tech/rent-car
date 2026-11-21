import { parseVnDateTimeLocal } from "./time";
import { validateDateWindow } from "./validation";

export function validPhone(value: string): boolean {
  return /^(?:0\d{9}|\+84\d{9})$/.test(value);
}

export function validateBookingInput(input: {
  carId: string; name: string; phone: string; email: string;
  pickup: string; ret: string; location: string; note: string;
}, now = new Date()): { error: string } | { pickupAt: string; returnAt: string } {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.carId)) return { error: "Vui lòng chọn xe hợp lệ." };
  if (input.name.length < 2 || input.name.length > 120 || /[\u0000-\u001f\u007f]/.test(input.name)) return { error: "Họ tên cần từ 2 đến 120 ký tự hợp lệ." };
  if (!validPhone(input.phone)) return { error: "Số điện thoại cần có 10 chữ số bắt đầu bằng 0 hoặc dùng mã +84." };
  if (input.email && (input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))) return { error: "Email không hợp lệ." };
  if (!input.location.trim()) return { error: "Vui lòng chọn điểm nhận xe." };
  if (input.note.length > 2000) return { error: "Ghi chú tối đa 2000 ký tự." };
  const pickupAt = parseVnDateTimeLocal(input.pickup);
  const returnAt = parseVnDateTimeLocal(input.ret);
  if (!pickupAt || !returnAt) return { error: "Vui lòng chọn thời gian nhận và trả xe hợp lệ." };
  const error = validateDateWindow(pickupAt, returnAt);
  if (error) return { error };
  if (Date.parse(pickupAt) < now.getTime() - 86400000) return { error: "Thời gian nhận xe không được quá khứ quá 1 ngày." };
  if (Date.parse(returnAt) - Date.parse(pickupAt) > 30 * 86400000) return { error: "Mỗi đơn được thuê tối đa 30 ngày." };
  return { pickupAt, returnAt };
}

export function bookingErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code === "23P01" || /trùng lịch|đã có lịch|vừa có lịch/.test(error.message ?? "")) return "Xe vừa có lịch thuê trong khoảng thời gian này. Vui lòng chọn xe hoặc thời gian khác.";
  if (/khóa|locked/.test(error.message ?? "")) return "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.";
  if (/điểm nhận|địa điểm/i.test(error.message ?? "")) return "Điểm nhận xe không còn hoạt động. Vui lòng chọn lại.";
  return "Chưa thể tạo đơn thuê. Vui lòng kiểm tra thông tin và thử lại.";
}
