// No backend or API contract exists in this repository. Do not invent endpoints.
export const connection = Object.freeze({ available: false });
export const unavailableMessages = Object.freeze({
  search: 'Chưa kết nối dịch vụ tìm xe. Chưa thể kiểm tra xe còn trống hoặc gửi yêu cầu thuê. Lựa chọn của bạn chưa được gửi.',
  login: 'Chưa kết nối dịch vụ đăng nhập. Không thể xác thực tài khoản lúc này. Thông tin chưa được gửi hoặc lưu.'
});
