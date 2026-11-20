export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function validateImage(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chọn ảnh JPG, PNG hoặc WebP.';
  if (!file.size) return 'Tệp ảnh trống. Vui lòng chọn ảnh khác.';
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh vượt quá 5 MB. Vui lòng chọn ảnh nhỏ hơn.';
  return '';
}
