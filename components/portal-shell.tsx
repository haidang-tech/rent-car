import Image from "next/image";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { signOutAction } from "@/lib/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/auth";

type NavItem = { href: string; label: string; icon: string };

export const NAV: Record<Exclude<Role, "customer">, NavItem[]> = {
  admin: [
    { href: "/quan-tri", label: "Tổng quan", icon: "◫" },
    { href: "/quan-tri/xe", label: "Danh mục xe", icon: "▤" },
    { href: "/quan-tri/don", label: "Đơn thuê", icon: "▣" },
    { href: "/quan-tri/bang-gia", label: "Bảng giá & phụ thu", icon: "₫" },
    { href: "/quan-tri/chinh-sach", label: "Chính sách cọc", icon: "✎" },
    { href: "/quan-tri/nhan-vien", label: "Nhân viên & quyền", icon: "☷" },
    { href: "/quan-tri/lich-xe", label: "Lịch điều phối", icon: "▦" },
    { href: "/quan-tri/diem-nhan", label: "Điểm giao nhận", icon: "⌖" },
  ],
  staff: [
    { href: "/nhan-vien", label: "Đơn thuê", icon: "▣" },
    { href: "/nhan-vien/yeu-cau", label: "Yêu cầu khách hàng", icon: "☷" },
    { href: "/nhan-vien/ekyc", label: "Duyệt giấy tờ", icon: "▤" },
    { href: "/nhan-vien/giao-xe", label: "Giao xe", icon: "➜" },
    { href: "/nhan-vien/tra-xe", label: "Tiếp nhận trả xe", icon: "↙" },
    { href: "/nhan-vien/bao-duong", label: "Bảo dưỡng", icon: "⚙" },
    { href: "/nhan-vien/su-co", label: "Sự cố & đổi xe", icon: "!" },
  ],
  accountant: [
    { href: "/ke-toan", label: "Hợp đồng", icon: "✎" },
    { href: "/ke-toan/quyet-toan", label: "Quyết toán cọc", icon: "₫" },
    { href: "/ke-toan/thu-chi", label: "Phiếu thu / chi", icon: "▤" },
    { href: "/ke-toan/phat-nguoi", label: "Phạt nguội", icon: "⚑" },
    { href: "/ke-toan/doi-soat", label: "Đối soát quỹ", icon: "▥" },
    { href: "/ke-toan/duyet-du-toan", label: "Duyệt dự toán", icon: "✓" },
  ],
};

export function PortalShell({
  role,
  user,
  children,
}: {
  role: Exclude<Role, "customer">;
  user: { full_name: string; branch: string | null };
  children: React.ReactNode;
}) {
  return (
    <div className="portal">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/">
          <Image src="/images/logo.png" alt="" width={100} height={34} />
          <div>
            <strong>Lái Đi</strong>
            <span>{ROLE_LABEL[role]}</span>
          </div>
        </Link>
        <SidebarNav items={NAV[role]} />
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar">{user.full_name.charAt(0)}</span>
            <div>
              <strong>{user.full_name}</strong>
              <span>{user.branch ?? "Đà Nẵng"}</span>
            </div>
          </div>
          <Link className="button ghost small" href="/">
            ← Về trang khách hàng
          </Link>
          <form action={signOutAction}>
            <button className="button ghost small" type="submit" style={{ width: "100%" }}>
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
      <div className="portal-main">{children}</div>
    </div>
  );
}

export function PortalTopbar({ label }: { label: string }) {
  return (
    <div className="portal-topbar">
      <span className="breadcrumb">Lái Đi / {label}</span>
      <div className="portal-tools">
        <form className="portal-search" action="/" role="search">
          <input name="q" type="search" aria-label="Tìm kiếm" placeholder="Tìm kiếm mã đơn, khách hàng..." />
        </form>
        <span className="who">
          <span className="status-dot" aria-hidden="true" />
          Đang hoạt động
        </span>
      </div>
    </div>
  );
}
