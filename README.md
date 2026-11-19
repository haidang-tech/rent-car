# Lái Đi — Thuê ô tô tự lái tại Đà Nẵng

Ứng dụng thuê xe tự lái hoàn chỉnh: website khách hàng + 3 bảng điều khiển nội bộ
(quản trị, nhân viên giao xe, kế toán), dùng **Next.js 16** và **Supabase**.

## Tính năng

**Khách hàng**
- Trang chủ, đội xe, lọc theo ngày / số chỗ / nhiên liệu
- Chi tiết xe, kiểm tra lịch trống theo thời gian thực
- Đặt xe trực tuyến (RPC `create_booking` kiểm tra trùng lịch, tính tiền)
- Đăng ký / đăng nhập, xem và hủy đơn của mình

**Quản trị (`/quan-tri`)**
- Tổng quan doanh thu, đơn, tình trạng đội xe
- CRUD xe, bảng giá & phụ thu, chính sách cọc, phân quyền nhân viên
- Lịch điều phối xe 5 tuần, cập nhật trạng thái đơn

**Nhân viên giao xe (`/nhan-vien`)**
- Danh sách đơn, bàn giao xe (ODO, pin, phụ kiện), tiếp nhận trả xe (phí phát sinh)
- Lệnh bảo dưỡng, sự cố & đổi xe

**Kế toán (`/ke-toan`)**
- Hợp đồng điện tử, quyết toán cọc, phiếu thu/chi, phạt nguội, đối soát quỹ

## Công nghệ

- Next.js 16 (App Router, Server Actions), React 19, TypeScript
- Supabase: Postgres + Row Level Security + Auth
- CSS thuần theo design system của bộ thiết kế (`client/` là bản prototype tĩnh)

## Cấu trúc

```
app/(site)/          website khách hàng
app/(portal)/        quan-tri · nhan-vien · ke-toan
components/          UI dùng chung
lib/actions/         server actions (auth, booking, xe, nghiệp vụ)
lib/supabase/        client / server / admin
supabase/migrations/ schema + RLS
scripts/seed.mjs     nạp dữ liệu mẫu (idempotent)
client/              prototype HTML/CSS gốc (tham chiếu thiết kế)
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

Hoặc dán `supabase/migrations/0001_init.sql` vào SQL Editor của Supabase.

4. Nạp dữ liệu mẫu

```bash
node --env-file=.env.local scripts/seed.mjs
```

5. Chạy

```bash
npm run dev
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
