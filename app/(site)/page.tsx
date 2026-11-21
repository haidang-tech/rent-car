import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CarCard, type CarCardData } from "@/components/car-card";
import { currency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cars")
    .select("id, code, plate, brand, model, category, seats, transmission, fuel, price_per_day, deposit, status, image_url, rating")
    .in("status", ["available", "rented"])
    .order("price_per_day")
    .limit(6);

  const cars = (data ?? []) as CarCardData[];
  const { data: locations } = await supabase.from("locations").select("id,name").eq("active", true).order("name");
  const fromPrice = cars.length
    ? Math.min(...cars.map((c) => Number(c.price_per_day)))
    : 690000;

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Thuê ô tô tự lái / Đà Nẵng</p>
            <h1>
              Tự lái.
              <br />
              Tự do <em>khám phá.</em>
            </h1>
            <p>
              Từ phố biển đến đèo Hải Vân, chọn chiếc xe hợp với lịch trình và đi
              theo nhịp của bạn.
            </p>
            <div className="hero-facts">
              <div>
                <span>✓</span> Xe điện VinFast, sạc đầy trước khi giao
              </div>
              <div>
                <span>✓</span> Đặt xe trực tuyến, xác nhận trong 15 phút
              </div>
              <div>
                <span>✓</span> Giao xe tận sân bay, khách sạn
              </div>
            </div>
            <Link className="button accent" href="#doi-xe">
              Khám phá đội xe →
            </Link>
          </div>
          <aside className="hero-note">
            <div>
              <strong>Giá từ {currency(fromPrice)}/ngày</strong>
              <br />
              Đã gồm bảo hiểm, sạc pin và hỗ trợ 24/7. Không phí ẩn.
            </div>
          </aside>
        </div>
      </section>

      <section className="search-section" aria-labelledby="search-title">
        <div className="container search-panel">
          <h2 id="search-title">Tìm xe cho chuyến đi của bạn</h2>
          <form action="/xe" method="get">
            <div className="search-fields">
              <label className="field">
                <span>Địa điểm nhận xe</span>
                <select name="location" defaultValue="">
                  <option value="">Tất cả địa điểm</option>
                  {(locations ?? []).map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Ngày nhận</span>
                <input name="pickup" type="date" required />
              </label>
              <label className="field">
                <span>Ngày trả</span>
                <input name="return" type="date" required />
              </label>
              <button className="button" type="submit">
                Tìm xe còn trống →
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="section tinted" id="doi-xe">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">01 / Đội xe</p>
              <h2>Chọn xe hợp chuyến đi</h2>
              <p>
                Xe điện VinFast đời mới, bảo dưỡng định kỳ và giao đầy pin trước
                mỗi chuyến.
              </p>
            </div>
            <Link className="button ghost" href="/xe">
              Xem toàn bộ đội xe →
            </Link>
          </div>
          {cars.length ? (
            <div className="fleet-grid">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            <div className="card">
              <h2>Chưa tải được đội xe</h2>
              <p>
                Hệ thống chưa kết nối được dữ liệu xe. Vui lòng thử lại sau ít
                phút hoặc gọi hotline 0905 111 222.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section" id="cach-thue">
        <div className="container split">
          <div>
            <p className="eyebrow">02 / Hướng dẫn thuê</p>
            <h2 style={{ fontSize: 34 }}>Thuê xe tự lái ở Đà Nẵng</h2>
            <p className="muted" style={{ marginTop: 12 }}>
              Ba bước, không giấy tờ rườm rà. Xác thực danh tính và ký hợp đồng
              điện tử trước khi nhận xe.
            </p>
            <div className="hero-note" style={{ marginTop: 24, background: "#eef4ec", borderColor: "var(--line)", color: "var(--ink)" }}>
              <div>
                <strong style={{ color: "var(--green)" }}>Cần chuẩn bị</strong>
                <br />
                CCCD gắn chip, GPLX hạng B trở lên, thẻ tín dụng hoặc chuyển
                khoản tiền cọc.
              </div>
            </div>
          </div>
          <div className="steps">
            {[
              {
                n: "01",
                t: "Chọn xe và ngày thuê",
                d: "Chọn nơi nhận xe, giờ nhận và giờ trả. Hệ thống kiểm tra lịch trống theo thời gian thực.",
              },
              {
                n: "02",
                t: "Xác thực eKYC và ký hợp đồng",
                d: "Xác thực danh tính trực tuyến, kiểm tra giá thuê và tiền cọc rồi ký hợp đồng điện tử.",
              },
              {
                n: "03",
                t: "Kiểm tra và nhận xe",
                d: "Đến điểm hẹn, đối chiếu hiện trạng xe, mức pin và phụ kiện cùng nhân viên Lái Đi.",
              },
            ].map((step) => (
              <article className="step" key={step.n}>
                <span className="step-number">{step.n}</span>
                <div>
                  <h3>{step.t}</h3>
                  <p>{step.d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section tinted" id="chinh-sach">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">03 / Chính sách thuê xe</p>
              <h2>Nắm rõ điều kiện trước khi nhận xe</h2>
            </div>
          </div>
          <div className="policy-cards">
            <figure className="policy-card">
              <Image src="/images/policy-identity.png" alt="" width={302} height={285} />
              <figcaption>
                <h3>Xác thực eKYC</h3>
                <p>Chuẩn bị CCCD và GPLX để xác thực trực tuyến trước chuyến đi.</p>
              </figcaption>
            </figure>
            <figure className="policy-card">
              <Image src="/images/policy-contract.png" alt="" width={620} height={285} />
              <figcaption>
                <h3>Hợp đồng điện tử và chi phí</h3>
                <p>Kiểm tra giá thuê, khoản cọc và phụ phí trước khi ký.</p>
              </figcaption>
            </figure>
            <figure className="policy-card">
              <Image src="/images/policy-handover.png" alt="" width={302} height={285} />
              <figcaption>
                <h3>Nhận và trả xe</h3>
                <p>Đối chiếu hiện trạng xe và mức pin tại điểm hẹn.</p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section" id="diem-nhan">
        <div className="container split">
          <div>
            <p className="eyebrow">04 / Khu vực nhận xe</p>
            <h2 style={{ fontSize: 34 }}>Nhận xe ở đâu?</h2>
            <p className="muted" style={{ marginTop: 12 }}>
              Chọn khu vực thuận tiện. Điểm hẹn cụ thể sẽ được xác nhận khi đặt
              xe.
            </p>
            <ol className="steps" style={{ marginTop: 24 }}>
              {[
                ["01", "Sân bay quốc tế Đà Nẵng", "Phụ thu giao nhận 100.000 ₫"],
                ["02", "Trung tâm · khu vực Hải Châu", "Bãi xe 155 Nguyễn Văn Linh"],
                ["03", "Ven biển · khu vực Mỹ Khê", "Giao xe tại khách sạn"],
              ].map(([n, title, note]) => (
                <li className="step" key={n}>
                  <span className="step-number">{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Image
            src="/images/pickup-map.png"
            alt="Sơ đồ khu vực nhận xe tại Đà Nẵng"
            width={764}
            height={433}
            style={{ borderRadius: 20, border: "1px solid var(--line)" }}
          />
        </div>
      </section>

      <section className="section tinted" id="cau-hoi">
        <div className="container split">
          <div>
            <p className="eyebrow">05 / Hỗ trợ thuê xe</p>
            <h2 style={{ fontSize: 34 }}>Câu hỏi thường gặp</h2>
            <p className="muted" style={{ marginTop: 12 }}>
              Những điều cần kiểm tra trước khi nhận xe.
            </p>
          </div>
          <div className="faq">
            {[
              [
                "Khi nào cần xác thực eKYC và ký hợp đồng?",
                "Sau khi chọn xe, bạn xác thực danh tính bằng eKYC rồi ký hợp đồng điện tử trước khi nhận xe. Chuẩn bị CCCD gắn chip và giấy phép lái xe còn hiệu lực.",
              ],
              [
                "Có thể nhận xe ở sân bay Đà Nẵng không?",
                "Có. Khi đặt xe, ghi rõ giờ hạ cánh và khu vực muốn nhận để Lái Đi xác nhận điểm hẹn và phí giao xe (100.000 ₫).",
              ],
              [
                "Giá thuê có gồm tiền cọc và phí giao xe không?",
                "Giá thuê hiển thị theo ngày, chưa gồm tiền cọc. Tổng tiền thuê và tiền cọc được hiển thị rõ trước khi bạn gửi yêu cầu đặt xe.",
              ],
              [
                "Có thể lái xe từ Đà Nẵng đi Hội An hoặc Huế không?",
                "Có. Vui lòng báo trước lịch trình để Lái Đi xác nhận phạm vi sử dụng xe và điều kiện đi ngoại tỉnh.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Kiểm tra xe theo lịch của bạn</h2>
              <p>Chọn điểm nhận, ngày thuê và ngày trả để bắt đầu.</p>
            </div>
            <Link className="button accent" href="/xe">
              Kiểm tra xe →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
