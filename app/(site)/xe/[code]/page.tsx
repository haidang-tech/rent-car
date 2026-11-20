import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { BookingForm } from "@/components/booking-form";
import { fuelLabel } from "@/components/car-card";
import { currency } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Xe ${code}` };
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const [{ data: car }, { data: locations, error: locationError }] = await Promise.all([
    supabase.from("cars").select("*").eq("code", code).maybeSingle(),
    supabase.from("locations").select("name").eq("active", true),
  ]);

  if (!car) notFound();

  const profile = await getProfile();
  const locationNames = (locations ?? []).map((l) => l.name as string);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <Link href="/xe">Đội xe</Link>
            <span>/</span>
            <span>{car.brand} {car.model}</span>
          </div>
          <h1>
            {car.brand} {car.model}
          </h1>
          <p>
            {car.category} · {car.seats} chỗ · {car.plate} ·{" "}
            {car.status === "available" ? "Sẵn sàng" : "Đang cho thuê"}
          </p>
        </div>
      </section>

      <section>
        <div className="container detail-grid">
          <div>
            <div className="detail-media">
              <Image
                src={car.image_url || "/images/vf5.png"}
                alt={`${car.brand} ${car.model}`}
                width={1050}
                height={590}
                style={{ width: "100%", height: "auto", objectFit: "cover" }}
                priority
              />
            </div>

            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 24 }}>Thông số xe</h2>
              <dl className="spec-grid">
                {[
                  ["Dòng xe", car.category],
                  ["Số chỗ", `${car.seats} chỗ`],
                  ["Hộp số", car.transmission === "auto" ? "Tự động" : "Số sàn"],
                  ["Nhiên liệu", fuelLabel(car.fuel)],
                  ["Năm sản xuất", String(car.year ?? "—")],
                  ["Mức pin hiện tại", `${car.battery ?? 100}%`],
                  ["Số km đã đi", `${Number(car.odometer ?? 0).toLocaleString("vi-VN")} km`],
                  ["Đánh giá", `${car.rating ?? 4.8} / 5`],
                ].map(([dt, dd]) => (
                  <div className="spec" key={dt}>
                    <dt>{dt}</dt>
                    <dd>{dd}</dd>
                  </div>
                ))}
              </dl>

              <h2 style={{ fontSize: 24, marginTop: 28 }}>Tiện nghi</h2>
              <div className="feature-list" style={{ marginTop: 12 }}>
                {(car.features ?? []).map((f: string) => (
                  <span key={f}>{f}</span>
                ))}
              </div>

              <h2 style={{ fontSize: 24, marginTop: 28 }}>Mô tả</h2>
              <p className="muted" style={{ marginTop: 10, maxWidth: 640 }}>
                {car.description}
              </p>

              <h2 style={{ fontSize: 24, marginTop: 28 }}>Điều kiện thuê</h2>
              <ul className="muted" style={{ marginTop: 10, display: "grid", gap: 6 }}>
                <li>• CCCD gắn chip và GPLX hạng B trở lên còn hiệu lực.</li>
                <li>• Tiền cọc {currency(car.deposit)} hoàn lại sau khi đối soát.</li>
                <li>• Giá thuê đã gồm bảo hiểm và hỗ trợ 24/7.</li>
                <li>• Miễn phí hủy trước 24 giờ nhận xe.</li>
              </ul>
            </div>
          </div>

          <aside className="sticky-card">
            <BookingForm
              carId={car.id}
              pricePerDay={Number(car.price_per_day)}
              deposit={Number(car.deposit)}
              locations={locationNames}
              locationError={locationError?.message}
              defaults={{
                name: profile?.full_name ?? "",
                phone: profile?.phone ?? "",
                email: "",
              }}
            />
          </aside>
        </div>
      </section>
    </>
  );
}
