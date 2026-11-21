# Lái Đi — Thuê ô tô tự lái tại Đà Nẵng

Ứng dụng thuê xe tự lái hoàn chỉnh: website khách hàng + 3 bảng điều khiển nội bộ
(quản trị, nhân viên giao xe, kế toán), dùng **Next.js 16** và **Supabase**.

## Tính năng

**Khách hàng**
- Trang chủ, đội xe, lọc theo ngày / số chỗ / nhiên liệu
- Chi tiết xe, kiểm tra lịch trống theo thời gian thực
- Đặt xe trực tuyến (RPC `create_booking` kiểm tra trùng lịch, tính tiền)
- Đăng ký / đăng nhập, quản lý chuyến, gửi eKYC để nhân viên duyệt và xác nhận hợp đồng
- Gửi yêu cầu ghi nhận tiền cọc, gia hạn, đổi xe, hủy chuyến, báo sự cố và đánh giá

**Quản trị (`/quan-tri`)**
- Tổng quan doanh thu, đơn, tình trạng đội xe
- CRUD xe, bảng giá & phụ thu, chính sách cọc, điểm giao nhận và phân quyền nhân viên
- Lịch điều phối xe 5 tuần, cập nhật trạng thái đơn

**Nhân viên giao xe (`/nhan-vien`)**
- Danh sách đơn, bàn giao xe (ODO, pin, phụ kiện), tiếp nhận trả xe (phí phát sinh)
- Duyệt eKYC, xử lý yêu cầu khách, lệnh bảo dưỡng, sự cố & đổi xe

**Kế toán (`/ke-toan`)**
- Hợp đồng điện tử, quyết toán cọc, phiếu thu/chi, phạt nguội, duyệt dự toán, đối soát quỹ

## Công nghệ

- Next.js 16 (App Router, Server Actions), React 19, TypeScript
- Supabase: Postgres + Row Level Security + Auth
- CSS thuần theo design system của bộ thiết kế

## Cấu trúc

```
app/(site)/          website khách hàng và cổng chuyến thuê
app/(portal)/        quản trị · nhân viên · kế toán
components/          giao diện dùng chung
lib/actions/         server actions (auth, đặt xe, quản lý, nghiệp vụ)
lib/supabase/        client / server / admin
supabase/migrations/ schema, RLS, Storage và workflow
scripts/seed.mjs     nạp dữ liệu mẫu (idempotent)
docs/screens.md      bản đồ màn hình đã chuyển từ prototype
.work/               ảnh thiết kế 4 vai trò
```

## Thiết lập

1. Dùng Node.js 22.18+ (nhánh 22.x, hỗ trợ import TypeScript trong seed), cài dependency

```bash
npm install
```

2. Tạo `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...   # chỉ dùng server / seed
```

3. Tạo schema

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Các migration phải được áp dụng theo thứ tự (`0001_init.sql` trở đi). Nếu dùng SQL Editor,
dán lần lượt toàn bộ các file trong `supabase/migrations/`.

4. Nạp dữ liệu mẫu

```bash
node --env-file=.env.local scripts/seed.mjs
```

5. Chạy

```bash
npm run dev
```

Chạy kiểm tra:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Quản trị | admin@laidi.vn | `Laidi@2026` |
| Nhân viên giao xe | nhanvien@laidi.vn | `Laidi@2026` |
| Kế toán | ketoan@laidi.vn | `Laidi@2026` |
| Khách hàng | khach@laidi.vn | `Laidi@2026` |

## Bảo mật

- RLS bật trên mọi bảng; quyền ghi theo vai trò qua `profiles.role`.
- Khách chỉ đọc được đơn của mình; đặt/hủy đơn qua hàm `security definer` có kiểm tra.
- `SUPABASE_SECRET_KEY` chỉ dùng ở server (server action đăng ký, seed) — không có tiền tố `NEXT_PUBLIC_`.

## Đặt xe, hủy đơn và cách tính tiền

- Cho phép đặt xe khi chưa đăng nhập. Đơn khách vãng lai lưu thông tin liên hệ và mã đơn, không tự gắn vào tài khoản tạo sau đó; khách cần giữ mã và liên hệ cơ sở để theo dõi. Đăng nhập trước khi đặt để sử dụng cổng chuyến thuê.
- Mọi thời gian nhập nhận/trả được hiểu theo Việt Nam (`Asia/Ho_Chi_Minh`, `+07:00`), không phụ thuộc múi giờ máy. Thời gian nhận không được quá khứ quá 24 giờ, thời lượng tối đa 30 ngày, trả phải sau nhận.
- Hủy chuyến qua `submit_booking_request` với loại `cancellation`, chờ nhân viên duyệt. RPC cũ `cancel_booking` được xóa ở migration 0005 để thống nhất luồng. Xe đã bàn giao phải liên hệ cơ sở để trả xe. Duyệt hủy hủy hợp đồng/phiếu chờ, không tự động hoàn tiền đã thu; kế toán đối soát riêng theo chính sách lưu trên đơn.
- Giá hiện tại là `ceil(số giờ thuê / 24) × cars.price_per_day + cars.deposit + extras`. Cọc lấy từ xe; `policies.deposit_type/deposit_value` chưa thay thế công thức này. `pricing_rules` là dữ liệu quản lý, chưa tự áp giá lễ/phụ thu vào báo giá. Các khoản phát sinh và hoàn cọc được ghi nhận riêng; số tiền hiển thị không chứng minh đã thanh toán.
- Seed chạy lại chỉ bổ sung bản ghi thiếu, không đặt lại trạng thái đơn, tài khoản hoặc tiền đã xử lý. Chỉ dùng tài khoản demo trong môi trường phát triển; giao diện production không hiển thị thông tin đăng nhập demo.

Migration 0005 thêm ràng buộc không trùng lịch và số tiền không âm. Nếu dữ liệu cũ vi phạm, migration sẽ thất bại để giữ nguyên dữ liệu; cần đối soát các bản ghi trước khi áp dụng lại.

`npm test` chạy unit test cho time helper, validation, booking và auth với mock tại ranh giới Supabase/Next. Kiểm tra DB trên Supabase local dùng `psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/booking-integrity.sql` sau khi áp dụng migration; script tự rollback dữ liệu thử nghiệm. Unit test không thay thế kiểm tra RPC, RLS hoặc cạnh tranh ghi trên PostgreSQL thật.
