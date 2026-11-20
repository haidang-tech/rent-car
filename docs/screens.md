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
  Ứng dụng kết nối các thao tác nghiệp vụ với Supabase (Postgres + RLS + Storage);
  màn đối soát được giữ ở chế độ chỉ đọc.
- Hai màn `permissions` và `reconciliation` được rút gọn có chủ đích: phân quyền
  theo vai trò thay vì ma trận checkbox giả, đối soát đọc trực tiếp từ `payments`.
- Hủy chuyến tạo yêu cầu chờ nhân viên xử lý; không tự hoàn tiền. Thanh toán cọc
  chỉ tạo phiếu chờ kế toán đối chiếu, chưa tích hợp cổng thanh toán.
- Seed tạo yêu cầu gia hạn và đánh giá để demo các màn nội bộ/khách hàng. Không seed
  bản ghi eKYC hoặc ảnh giấy tờ giả; eKYC cần ảnh do khách thực sự tải lên Storage.

## Ảnh được giữ lại

| Tệp trong `public/images/` | Vai trò |
| --- | --- |
| `hero.png` | Ảnh hero trang chủ |
| `logo.png` | Logo dùng trong header và bảng điều khiển |
| `pickup-map.png` | Minh họa khu vực giao nhận |
| `policy-identity.png` | Minh họa thủ tục giấy tờ |
| `policy-contract.png` | Minh họa hợp đồng |
| `policy-handover.png` | Minh họa bàn giao xe |
| `vf5.png` | Ảnh VinFast VF 5 |
| `vf6.png` | Ảnh VinFast VF 6 |
| `vfmpv7.png` | Ảnh VinFast VF MPV 7 |

## Validator và tương tác được chuyển

- `client/js/pages/validation.js`: kiểm tra ngày nhận/trả và ngày quá khứ. Được
  chuyển thành `validateDates` và `validateDateWindow` trong `lib/validation.ts`;
  RPC đặt xe vẫn kiểm tra lại khoảng thời gian ở phía cơ sở dữ liệu.
- `client/js/pages/upload-validation.js`: chỉ nhận JPG/PNG/WebP, không nhận tệp
  rỗng và giới hạn 5 MB. Được chuyển thành `validateImage` trong
  `lib/validation.ts`, kiểm tra ở client lẫn Server Action; Storage cũng giới hạn
  MIME và kích thước.
- `client/js/pages/workspace.js`: điều hướng theo hash, chọn ngày lịch và tăng
  ngày trả được thay bằng route tài khoản thật và form đặt xe. Các dialog, bộ
  lọc và nút demo không có backend của prototype không được port thành UI giả.
