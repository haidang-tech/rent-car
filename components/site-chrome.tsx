import Image from "next/image";
import Link from "next/link";
import { getProfile, ROLE_HOME } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";

export async function SiteHeader() {
  const profile = await getProfile();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="Lái Đi — Trang chủ">
          <Image src="/images/logo.png" alt="Lái Đi" width={116} height={40} priority />
        </Link>
        <nav className="main-nav" aria-label="Điều hướng chính">
          <Link href="/xe">Đội xe</Link>
          <Link href="/#cach-thue">Cách thuê</Link>
          <Link href="/#chinh-sach">Chính sách</Link>
          <Link href="/#cau-hoi">Câu hỏi</Link>
        </nav>
        <div className="header-actions">
          {profile ? (
            <>
              <div className="header-user">
                <strong>{profile.full_name}</strong>
                {profile.role === "customer" ? "Khách hàng" : "Nhân sự Lái Đi"}
              </div>
              <Link className="button outline" href={ROLE_HOME[profile.role]}>
                {profile.role === "customer" ? "Đơn của tôi" : "Bảng điều khiển"}
              </Link>
              <form action={signOutAction}>
                <button className="button ghost small" type="submit">
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="button outline" href="/dang-nhap">
                Đăng nhập
              </Link>
              <Link className="button" href="/xe">
                Tìm xe ngay →
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <Image src="/images/logo.png" alt="" width={100} height={34} />
            </div>
            <p>Thuê ô tô tự lái tại Đà Nẵng</p>
            <p>Đà Nẵng, Việt Nam</p>
            <p>Hotline: 0905 111 222</p>
          </div>
          <div>
            <h3>THUÊ XE</h3>
            <Link href="/xe">Xem đội xe</Link>
            <Link href="/xe">Tìm xe theo ngày</Link>
            <Link href="/#cach-thue">Hướng dẫn thuê</Link>
          </div>
          <div>
            <h3>KHU VỰC</h3>
            <Link href="/xe?location=Sân+bay+quốc+tế+Đà+Nẵng">Sân bay Đà Nẵng</Link>
            <Link href="/xe?location=Trung+tâm+Hải+Châu">Trung tâm Hải Châu</Link>
            <Link href="/xe?location=Ven+biển+Mỹ+Khê">Ven biển Mỹ Khê</Link>
          </div>
          <div>
            <h3>HỖ TRỢ</h3>
            <Link href="/#cau-hoi">Câu hỏi thường gặp</Link>
            <Link href="/#chinh-sach">Giấy tờ và chi phí thuê</Link>
            <Link href="/#diem-nhan">Xem điểm nhận xe</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Lái Đi · Đà Nẵng</span>
          <span>Việt Nam · Tiếng Việt</span>
        </div>
      </div>
    </footer>
  );
}
