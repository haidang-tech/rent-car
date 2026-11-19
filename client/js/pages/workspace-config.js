// Screen definitions transcribed from the four supplied design boards.
// These describe UI only: there are no invented customer, booking or ledger records.
const field = (label, type = 'text', options = {}) => ({ label, type, ...options });
const select = (label, options) => field(label, 'select', { options });
const money = label => field(label, 'number', { min: 0, suffix: '₫' });
const date = label => field(label, 'datetime-local');
const note = label => field(label, 'textarea');
const carFields = [field('Biển số', 'text', { required: true, placeholder: 'Ví dụ 43A-123.45' }), field('Hãng xe', 'text', { required: true }), field('Mẫu / loại xe', 'text', { required: true }), field('Số chỗ', 'number', { min: 1, max: 50, required: true }), select('Nhiên liệu', ['Điện', 'Xăng', 'Dầu', 'Hybrid']), select('Trạng thái', ['Chưa sẵn sàng', 'Sẵn sàng', 'Bảo dưỡng'])];
const maintenanceColumns = ['Lệnh', 'Xe', 'Hạng mục', 'Phụ trách', 'Trạng thái'];
const maintenanceFilters = ['Tất cả', 'Chờ duyệt', 'Đang thực hiện', 'Nghiệm thu'];

export const workspaces = {
  admin: {
    label: 'Admin', source: 'admin.png', default: 'cars',
    nav: [['cars', 'Xe'], ['pricing', 'Bảng giá'], ['policy', 'Chính sách'], ['employees', 'Nhân viên'], ['schedule', 'Lịch xe'], ['locations', 'Điểm giao nhận']],
    screens: {
      cars: { title: 'Danh mục xe', kind: 'table', columns: ['Biển số', 'Mẫu xe', 'Nhóm xe', 'Số chỗ', 'Trạng thái'], filters: ['Tất cả', 'Sẵn sàng', 'Đang cho thuê', 'Chưa sẵn sàng'], primary: ['Thêm xe mới', 'car-new'], aside: 'Thông tin phương tiện', facts: ['Nhiên liệu', 'Số chỗ', 'Trạng thái', 'Đơn sắp tới'], links: [['Sửa thông tin xe', 'car-edit'], ['Xem lịch xe', 'schedule']], actions: ['Xóa thông tin xe'] },
      'car-new': { title: 'Thêm xe mới', kind: 'form', parent: 'cars', heading: 'Thông tin phương tiện', fields: carFields, upload: 'Hình ảnh phương tiện', submit: 'Lưu xe mới', aside: 'Trạng thái khi lưu', facts: ['Khai thác', 'Biển số', 'Hình ảnh'], hint: 'Kiểm tra biển số và thông tin phương tiện trước khi lưu.' },
      'car-edit': { title: 'Sửa thông tin xe', kind: 'form', parent: 'cars', heading: 'Thông tin phương tiện', fields: [field('Mã xe cần sửa', 'text', { required: true }), ...carFields], submit: 'Lưu thay đổi', aside: 'Lịch sử xe', facts: ['Đơn sắp tới', 'Cơ sở', 'Cập nhật'], links: [['Xem lịch xe', 'schedule']], hint: 'Cần tải xe từ hệ thống trước khi có thể cập nhật. Kiểm tra đơn đang liên quan khi thay đổi thông tin khai thác.' },
      pricing: { title: 'Bảng giá & phụ thu', kind: 'table', columns: ['Quy tắc', 'Phạm vi', 'Đơn giá / phụ thu', 'Hiệu lực', 'Trạng thái'], filters: ['Tất cả', 'Đơn giá thuê', 'Giá ngày lễ', 'Phụ thu'], primary: ['Thêm quy tắc giá'], aside: 'Chi tiết quy tắc giá', facts: ['Đối tượng', 'Đơn vị tính', 'Bắt đầu', 'Kết thúc'], links: [['Cấu hình cọc & hủy', 'policy']], actions: ['Cấu hình giá ngày lễ', 'Chỉnh đơn giá'] },
      policy: { title: 'Chính sách cọc & hủy', kind: 'form', parent: 'pricing', heading: 'Phiên bản chính sách', fields: [select('Nhóm áp dụng', ['Ô tô tự lái']), select('Loại mức đặt cọc', ['Số tiền cố định', 'Tỷ lệ phần trăm']), money('Mức cọc'), money('Mức bảo lưu phạt nguội'), field('Mốc hủy trước giờ nhận (giờ)', 'number', { min: 0 }), field('Tỷ lệ hoàn tại mốc này (%)', 'number', { min: 0, max: 100 })], submit: 'Lưu phiên bản', aside: 'Phạm vi áp dụng', facts: ['Đơn đã chốt', 'Đơn đặt mới', 'Người duyệt'], hint: 'Kiểm tra hiệu lực trước khi lưu phiên bản. Chưa tải chính sách hiện hành.' },
      employees: { title: 'Nhân viên & phân quyền', kind: 'table', columns: ['Mã NV', 'Họ tên', 'Vai trò', 'Cơ sở', 'Trạng thái'], filters: ['Tất cả', 'Giao nhận', 'Kế toán', 'Chủ cơ sở'], primary: ['Thêm nhân viên'], aside: 'Thông tin nhân viên', facts: ['Giao nhận', 'Bảo dưỡng', 'Đối soát quỹ', 'Tài khoản'], links: [['Thiết lập phân quyền', 'permissions']], actions: ['Sửa thông tin', 'Xóa nhân viên'] },
      permissions: { title: 'Thiết lập phân quyền', kind: 'form', parent: 'employees', heading: 'Vai trò & quyền truy cập', fields: [field('Mã nhân viên', 'text', { required: true }), field('Cơ sở'), select('Vai trò', ['Nhân viên giao xe', 'Kế toán', 'Chủ cơ sở']), ...['Giao nhận và biên bản', 'Bảo dưỡng và sự cố', 'Ký duyệt hợp đồng', 'Đối soát quỹ'].map(label => select(label, ['Không cấp', 'Được cấp']))], submit: 'Lưu phân quyền', aside: 'Tác động sau khi lưu', facts: ['Quyền thu hồi', 'Quyền cấp mới', 'Lịch sử'], hint: 'Chưa kết nối hệ thống tài khoản. Các lựa chọn tại đây không cấp hoặc thay đổi quyền truy cập.' },
      schedule: { title: 'Lịch điều phối xe', kind: 'calendar', primary: ['Xếp xe cho đơn'] },
      locations: { title: 'Điểm giao nhận xe', kind: 'table', columns: ['Mã điểm', 'Địa điểm', 'Loại điểm', 'Phạm vi', 'Trạng thái'], filters: ['Tất cả', 'Đang hoạt động', 'Ngừng nhận đơn'], primary: ['Thêm địa điểm'], aside: 'Thông tin điểm giao nhận', facts: ['Loại', 'Địa chỉ', 'Ghi chú', 'Nhận đơn mới'], links: [['Xem lịch điều phối', 'schedule']], actions: ['Chỉnh sửa điểm', 'Ngừng sử dụng'] }
    }
  },
  staff: {
    label: 'Nhân viên giao xe', source: 'staff.png', default: 'orders',
    nav: [['orders', 'Đơn thuê'], ['handover', 'Giao xe'], ['return', 'Nhận xe trả'], ['maintenance', 'Bảo dưỡng'], ['incidents', 'Sự cố']],
    screens: {
      orders: { title: 'Đơn thuê', kind: 'table', columns: ['Mã đơn', 'Khách thuê', 'Xe', 'Lịch nhận', 'Trạng thái'], filters: ['Tất cả', 'Chờ xác thực', 'Chờ ký / cọc', 'Sẵn sàng giao'], aside: 'Hồ sơ chuyến thuê', facts: ['eKYC', 'Khách ký điện tử', 'Tiền cọc', 'Cơ sở ký duyệt'], links: [['Mở bàn giao', 'handover']], actions: ['Kiểm tra hợp đồng'] },
      handover: { title: 'Bàn giao xe', kind: 'form', parent: 'orders', heading: 'Thông tin bàn giao', steps: ['Đối chiếu khách', 'Ghi nhận hiện trạng', 'Ký biên bản'], fields: [field('Mã đơn thuê', 'text', { required: true }), field('Khách thuê'), field('Điểm giao'), select('CCCD & quyền nhận xe', ['Chưa đối chiếu', 'Đã đối chiếu']), select('GPLX · hạng và hiệu lực', ['Chưa đối chiếu', 'Đã đối chiếu']), field('ODO lúc giao (km)', 'number', { min: 0 }), field('Pin lúc giao (%)', 'number', { min: 0, max: 100 }), note('Phụ kiện và ghi chú hư hỏng')], upload: 'Ảnh bốn góc xe', submit: 'Lưu hiện trạng', aside: 'Điều kiện bàn giao', facts: ['Đơn thuê', 'Tiền cọc', 'Hợp đồng', 'Xe'], actions: ['Ký số biên bản', 'Xem hợp đồng'] },
      return: { title: 'Tiếp nhận xe trả', kind: 'form', parent: 'orders', heading: 'Kiểm tra trước khi lập biên bản', steps: ['Tiếp nhận', 'Đối chiếu & phí', 'Ký biên bản'], fields: [field('Mã đơn thuê', 'text', { required: true }), date('Thời điểm tiếp nhận'), date('Giờ hẹn trả'), field('ODO lúc giao (km)', 'number', { min: 0 }), field('ODO lúc trả (km)', 'number', { min: 0 }), field('Pin lúc giao (%)', 'number', { min: 0, max: 100 }), field('Pin lúc trả (%)', 'number', { min: 0, max: 100 }), note('Hư hỏng và ghi chú khi trả')], upload: 'Ảnh xe trả và bằng chứng hư hỏng', submit: 'Lưu kết quả kiểm tra', aside: 'Chênh lệch khi trả', facts: ['ODO', 'Mức pin', 'Hư hỏng mới', 'Phí phát sinh'], actions: ['Ký số biên bản', 'Mở quyết toán cọc'] },
      maintenance: { title: 'Bảo dưỡng & sửa chữa', kind: 'table', columns: maintenanceColumns, filters: maintenanceFilters, primary: ['Lập lệnh bảo dưỡng'], aside: 'Chi tiết lệnh bảo dưỡng', facts: ['Dự toán', 'Tình trạng xe', 'Ảnh / báo giá', 'Nghiệm thu'], actions: ['Xem dự toán', 'Cập nhật tiến độ', 'Ghi nhận nghiệm thu'] },
      incidents: { title: 'Sự cố & đổi xe', kind: 'table', columns: ['Mã sự cố', 'Đơn thuê', 'Xe', 'Phân loại', 'Trạng thái'], filters: ['Tất cả', 'Mới tiếp nhận', 'Đang xử lý', 'Đã xử lý'], primary: ['Ghi nhận sự cố'], aside: 'Chi tiết sự cố', facts: ['Mức độ', 'Bằng chứng', 'Xe thay thế', 'Khách xác nhận'], actions: ['Tìm xe thay thế', 'Cập nhật kết quả'] }
    }
  },
  accountant: {
    label: 'Kế toán', source: 'accountant.png', default: 'contracts',
    nav: [['contracts', 'Hợp đồng'], ['settlement', 'Quyết toán cọc'], ['receipts', 'Thu / chi'], ['reconciliation', 'Đối soát'], ['fines', 'Phạt nguội'], ['estimates', 'Duyệt dự toán']],
    screens: {
      contracts: { title: 'Hợp đồng điện tử', kind: 'table', columns: ['Hợp đồng', 'Đơn thuê', 'Khách thuê', 'Cập nhật', 'Trạng thái'], filters: ['Tất cả', 'Chờ cơ sở ký', 'Có hiệu lực', 'Đã hủy'], aside: 'Thông tin hợp đồng', facts: ['Khách đã ký', 'Cọc', 'CCCD / GPLX gốc', 'Chữ ký số'], actions: ['Ký duyệt hợp đồng', 'Xuất PDF', 'Lập phụ lục', 'Hủy hợp đồng'] },
      settlement: { title: 'Quyết toán cọc', kind: 'form', heading: 'Quyết toán sau trả xe', steps: ['Lập bảng kê', 'Phê duyệt', 'Xác nhận đã chi'], fields: [field('Mã đơn thuê', 'text', { required: true }), ...['Cọc đã nhận', 'Chi phí còn lại', 'Cấn trừ từ cọc', 'Bảo lưu phạt nguội', 'Tạm giữ do sự cố', 'Dự kiến hoàn khách'].map(money)], submit: 'Phê duyệt quyết toán', aside: 'Xử lý khoản cọc', facts: ['Cọc được cấn trừ', 'Thu bù', 'Lệnh hoàn tiền', 'Chứng từ chi'], links: [['Xem phiếu thu / chi', 'receipts']], actions: ['Giải tỏa bảo lưu', 'Quyết toán đơn hủy'], hint: 'Chỉ lập phiếu chi sau khi xác nhận giao dịch hoàn tiền thực tế. Chưa có dữ liệu quyết toán.' },
      receipts: { title: 'Phiếu thu / chi', kind: 'table', columns: ['Số phiếu', 'Loại', 'Đơn thuê', 'Số tiền', 'Trạng thái'], filters: ['Tất cả', 'Phiếu thu', 'Phiếu chi', 'Đã hủy'], aside: 'Thông tin chứng từ', facts: ['Hình thức', 'Mã giao dịch', 'Số tiền', 'Kỳ sổ'], links: [['Đối soát quỹ', 'reconciliation']], actions: ['Xem chứng từ', 'Hủy phiếu lập sai'] },
      reconciliation: { title: 'Đối soát quỹ', kind: 'form', heading: 'Cơ sở & kỳ đối soát', steps: ['Kiểm tra giao dịch', 'Đối chiếu số dư', 'Chốt sổ'], fields: [field('Ngày đối soát', 'date', { required: true }), field('Cơ sở'), ...['Tiền mặt · theo sổ', 'Tiền mặt · kiểm đếm', 'Ngân hàng · theo sổ', 'Ngân hàng · sao kê'].map(money), field('Lệch tiền mặt', 'text', { readonly: true, placeholder: 'Chưa đối chiếu' }), field('Lệch ngân hàng', 'text', { readonly: true, placeholder: 'Chưa đối chiếu' })], submit: 'Lập đề nghị xử lý lệch', aside: 'Kết quả đối soát', facts: ['Giao dịch chưa kiểm tra', 'Sao kê ngân hàng', 'Phê duyệt bù trừ', 'Chốt sổ'], links: [['Xem phiếu thu / chi', 'receipts']], hint: 'Chỉ chốt sổ khi không còn chênh lệch hoặc đã xử lý và duyệt hợp lệ.' },
      fines: { title: 'Quản lý phạt nguội', kind: 'table', columns: ['Hồ sơ', 'Biển số', 'Thời điểm', 'Đơn liên quan', 'Trạng thái'], filters: ['Tất cả', 'Chờ xác minh', 'Chờ phản hồi', 'Đã xử lý'], primary: ['Nhập biên bản'], aside: 'Thông tin vi phạm', facts: ['Nguồn thông báo', 'Kết quả truy vết', 'Cọc bảo lưu', 'Phản hồi khách'], actions: ['Xác minh thông báo', 'Truy vết chuyến thuê', 'Cấn trừ / thu bổ sung'] },
      estimates: { title: 'Duyệt dự toán bảo dưỡng', kind: 'table', columns: maintenanceColumns, filters: maintenanceFilters, aside: 'Thông tin dự toán', facts: ['Xe', 'Dự toán', 'Báo giá', 'Kết quả'], actions: ['Duyệt dự toán'] }
    }
  },
  customer: {
    label: 'Khách hàng', source: 'customer.png', default: 'trips',
    nav: [['trips', 'Chuyến thuê của tôi'], ['detail', 'Chi tiết xe'], ['identity', 'Xác thực eKYC'], ['contract', 'Hợp đồng'], ['payment', 'Thanh toán cọc'], ['extension', 'Gia hạn'], ['exchange', 'Đổi xe'], ['cancel', 'Hủy chuyến'], ['incident', 'Sự cố'], ['review', 'Đánh giá']],
    screens: {
      trips: { title: 'Chuyến thuê của tôi', kind: 'trips' },
      detail: { title: 'Chi tiết xe', kind: 'detail' },
      identity: { title: 'Xác thực danh tính (eKYC)', kind: 'identity' },
      contract: { title: 'Xem và ký hợp đồng điện tử', kind: 'contract' },
      payment: { title: 'Thanh toán cọc trực tuyến', kind: 'payment' },
      extension: { title: 'Yêu cầu gia hạn', kind: 'extension' },
      exchange: { title: 'Yêu cầu đổi xe', kind: 'exchange' },
      cancel: { title: 'Hủy đặt xe', kind: 'cancel' },
      incident: { title: 'Báo sự cố', kind: 'incident' },
      review: { title: 'Đánh giá chuyến thuê', kind: 'review' }
    }
  }
};

export function resolveScreen(role, hash) {
  const workspace = workspaces[role];
  const key = hash.replace(/^#/, '');
  return { workspace, key: Object.hasOwn(workspace.screens, key) ? key : workspace.default };
}
