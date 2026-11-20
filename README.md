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

1. Cài dependency

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
