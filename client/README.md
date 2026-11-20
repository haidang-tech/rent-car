# Frontend HTML/CSS/JavaScript

Đây là bản giao diện theo ảnh trong `Figma/`, độc lập với ứng dụng Next.js/Supabase ở thư mục gốc.

Tại thư mục gốc dự án, chạy:

```powershell
npm.cmd run dev:client
# Hoặc không cần cài dependency:
node scripts/serve.mjs
```

Mở http://127.0.0.1:4173. Không mở trực tiếp file HTML bằng `file://` vì giao diện sử dụng ES Modules.

| Giao diện | Đường dẫn | Số màn hình |
| --- | --- | --- |
| Landing | `/index.html` | 1 |
| Khách hàng | `/pages/customer.html` | 10 |
| Admin | `/pages/admin.html` | 9 |
| Nhân viên giao xe | `/pages/staff.html` | 5 |
| Kế toán | `/pages/accountant.html` | 6 |

Có thể vào trang khách hàng từ modal Đăng nhập trên landing, sau đó chuyển giao diện bằng bộ chọn ở đầu trang. Đây là lối xem trước, không đăng nhập hoặc cấp quyền.

## Màn hình và đường dẫn trực tiếp

Ghép fragment sau đường dẫn HTML của vai trò:

- Khách hàng: `#trips`, `#detail`, `#identity`, `#contract`, `#payment`, `#extension`, `#exchange`, `#cancel`, `#incident`, `#review`.
- Admin: `#cars`, `#car-new`, `#car-edit`, `#pricing`, `#policy`, `#employees`, `#permissions`, `#schedule`, `#locations`.
- Nhân viên: `#orders`, `#handover`, `#return`, `#maintenance`, `#incidents`.
- Kế toán: `#contracts`, `#settlement`, `#receipts`, `#reconciliation`, `#fines`, `#estimates`.

## Tổ chức

- `pages/`: bốn entry point theo vai trò.
- `css/workspace.css`: theme xanh khách hàng, theme tím nghiệp vụ và responsive.
- `js/pages/workspace-config.js`: định nghĩa 30 màn hình, trường nhập, bảng và điều hướng.
- `js/components/workspace-ui.js`: các thành phần dùng chung.
- `js/pages/customer-views.js`: mười màn hình khách hàng.
- `js/pages/workspace.js`: điều hướng, validation, modal, lịch và xem trước ảnh.
- `js/pages/upload-validation.js`: kiểm tra loại, kích thước và tệp ảnh trống.

## Tương tác và dữ liệu

Đã triển khai điều hướng hash/Back/Forward, tab lọc, nhập tìm kiếm, modal, validation form, lịch tuần, xem trước/bỏ ảnh, tiến độ bốn ảnh eKYC, điều khoản thu gọn, chọn phương thức thanh toán, chọn gia hạn theo ngày, chọn xe muốn đổi, lý do hủy, báo sự cố và đánh giá sao.

Bản `client/` chưa kết nối Backend. Bảng, hồ sơ và số tiền hiển thị chưa tải; thao tác lưu, xóa, ký, thanh toán và phân quyền chỉ thông báo chưa kết nối. Không giả lập đặt xe hoặc giao dịch thành công. Chọn ảnh chỉ tạo preview trên thiết bị; không upload hoặc lưu localStorage. Ảnh chấp nhận JPG/PNG/WebP, tối đa 5 MB. Blob URL được giải phóng khi thay/bỏ ảnh hoặc chuyển màn hình.

## Khác biệt với thiết kế

- Không sao chép các khách hàng, mã đơn hoặc giao dịch mẫu trong Figma thành dữ liệu thật, nên bảng và thẻ chuyến thuê dùng trạng thái chưa tải.
- Hero khách hàng dùng ảnh xe trích từ landing; chưa có asset vector gốc.
- Một số icon dùng ký hiệu văn bản. Ảnh nguồn chỉ có desktop, responsive được triển khai từ bố cục đó.
- Chưa xác minh pixel-perfect hoặc bốn viewport thực tế bằng screenshot trình duyệt.

## Kiểm thử

```powershell
npm.cmd install
npm.cmd run test:client
```

Happy DOM chỉ dùng khi kiểm thử, không cần để chạy giao diện. Test kiểm tra render 30 màn hình, nhãn nhập liệu, ID, route, tài nguyên, modal, bộ lọc, validation ngày, lịch tuần, xác nhận điều khoản, chọn thanh toán, rating và trạng thái chưa kết nối. DOM test không đo layout hoặc thay thế kiểm thử trình duyệt.

Lệnh `npm run dev` / `npm start` ở thư mục gốc chạy Next.js. Dùng `dev:client` để xem bản HTML này.
