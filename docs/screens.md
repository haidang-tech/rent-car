# Bản đồ màn hình

`app/` là nguồn sự thật duy nhất của sản phẩm. Tài liệu này ghi lại 30 màn hình của
prototype tĩnh `client/` (đã xóa) và route tương ứng trong ứng dụng Next.js, để không
mất dấu vết thiết kế.

## Khách hàng

| Prototype (`client/pages/customer.html#...`) | Ứng dụng |
| --- | --- |
| `trips` — Chuyến thuê của tôi | `/tai-khoan` |
| `detail` — Chi tiết xe | `/tai-khoan/[code]` và `/xe/[code]` |
| `identity` — Xác thực eKYC | `/tai-khoan/[code]/ekyc` |
| `contract` — Xem và ký hợp đồng điện tử | `/tai-khoan/[code]/hop-dong` |
| `payment` — Thanh toán cọc trực tuyến | `/tai-khoan/[code]/thanh-toan` |
| `extension` — Yêu cầu gia hạn | `/tai-khoan/[code]/gia-han` |
| `exchange` — Yêu cầu đổi xe | `/tai-khoan/[code]/doi-xe` |
| `cancel` — Hủy đặt xe | `/tai-khoan/[code]/huy` |
| `incident` — Báo sự cố | `/tai-khoan/[code]/su-co` |
| `review` — Đánh giá chuyến thuê | `/tai-khoan/[code]/danh-gia` |

## Quản trị

| Prototype (`client/pages/admin.html#...`) | Ứng dụng |
| --- | --- |
| `cars` — Danh mục xe | `/quan-tri/xe` |
| `car-new` — Thêm xe mới | `/quan-tri/xe/moi` |
| `car-edit` — Sửa thông tin xe | `/quan-tri/xe/[id]` |
| `pricing` — Bảng giá & phụ thu | `/quan-tri/bang-gia` |
| `policy` — Chính sách cọc & hủy | `/quan-tri/chinh-sach` |
| `employees` — Nhân viên | `/quan-tri/nhan-vien` |
| `permissions` — Thiết lập phân quyền | `/quan-tri/nhan-vien` (vai trò + khóa tài khoản) |
| `schedule` — Lịch điều phối xe | `/quan-tri/lich-xe` |
| `locations` — Điểm giao nhận xe | `/quan-tri/diem-nhan` |

## Nhân viên giao xe

| Prototype (`client/pages/staff.html#...`) | Ứng dụng |
| --- | --- |
| `orders` — Đơn thuê | `/nhan-vien` |
| `handover` — Bàn giao xe | `/nhan-vien/giao-xe` |
| `return` — Tiếp nhận xe trả | `/nhan-vien/tra-xe` |
| `maintenance` — Bảo dưỡng & sửa chữa | `/nhan-vien/bao-duong` |
| `incidents` — Sự cố & đổi xe | `/nhan-vien/su-co` |

Yêu cầu từ khách (gia hạn, đổi xe, eKYC chờ duyệt) nằm ở `/nhan-vien/yeu-cau`.

## Kế toán

| Prototype (`client/pages/accountant.html#...`) | Ứng dụng |
| --- | --- |
| `contracts` — Hợp đồng điện tử | `/ke-toan` |
| `settlement` — Quyết toán cọc | `/ke-toan/quyet-toan` |
| `receipts` — Phiếu thu / chi | `/ke-toan/thu-chi` |
| `reconciliation` — Đối soát quỹ | `/ke-toan/doi-soat` |
| `fines` — Phạt nguội | `/ke-toan/phat-nguoi` |
| `estimates` — Duyệt dự toán bảo dưỡng | `/ke-toan/duyet-du-toan` |

## Ghi chú

- Prototype không có backend; mọi bảng và form đều ở trạng thái "chưa kết nối".
  Ứng dụng dùng Supabase (Postgres + RLS + Storage) nên mọi màn hình trên đều đọc
  và ghi dữ liệu thật.
- Hai màn `permissions` và `reconciliation` được rút gọn có chủ đích: phân quyền
  theo vai trò thay vì ma trận checkbox giả, đối soát đọc trực tiếp từ `payments`.
