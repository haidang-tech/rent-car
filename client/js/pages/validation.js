export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function nextDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return localDate(new Date(year, month - 1, day + 1));
}
export function validateDates(pickup, dropoff, today = localDate()) {
  if (!pickup || !dropoff) return 'Vui lòng chọn đầy đủ ngày nhận và ngày trả xe.';
  if (pickup < today) return 'Ngày nhận xe không được ở trong quá khứ.';
  if (dropoff <= pickup) return 'Ngày trả xe phải sau ngày nhận xe.';
  return '';
}
