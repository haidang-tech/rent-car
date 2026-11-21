import { CarImage } from "@/components/car-image";
import Link from "next/link";
import { currency } from "@/lib/format";

export type CarCardData = {
  id: string;
  code: string;
  plate: string;
  brand: string;
  model: string;
  category: string;
  seats: number;
  transmission: string;
  fuel: string;
  price_per_day: number;
  deposit?: number;
  status: string;
  image_url: string | null;
  rating: number | null;
};

export function CarCard({ car }: { car: CarCardData }) {
  return (
    <article className="car-card">
      <div className="car-media">
        <CarImage
          src={car.image_url || "/images/vf5.png"}
          alt={`${car.brand} ${car.model}`}
          fill
          sizes="(max-width: 620px) 100vw, (max-width: 1080px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
        />
        <span className="tag">{car.category}</span>
      </div>
      <div className="car-body">
        <div>
          <h3>
            {car.brand} {car.model}
          </h3>
          <p className="car-sub">
            {car.plate} · {car.rating?.toFixed(1) ?? "4.8"} ★
          </p>
        </div>
        <div className="car-specs">
          <span>{car.seats} chỗ</span>
          <span>{car.transmission === "auto" ? "Tự động" : "Số sàn"}</span>
          <span>{fuelLabel(car.fuel)}</span>
        </div>
        <div className="car-foot">
          <div className="car-price">
            <strong>{currency(car.price_per_day)}</strong>
            <small>/ ngày{car.deposit != null ? ` · cọc ${currency(car.deposit)}` : ""}</small>
          </div>
          <Link className="button small" href={`/xe/${car.code}`}>
            Chi tiết →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function fuelLabel(fuel: string) {
  return (
    {
      electric: "Điện",
      petrol: "Xăng",
      diesel: "Dầu",
      hybrid: "Hybrid",
    }[fuel] ?? fuel
  );
}
