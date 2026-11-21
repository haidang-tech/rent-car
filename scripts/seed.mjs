// Seed Lái Đi demo data.
// Usage: node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";
import { parseVnDateTimeLocal, vnDateKey } from "../lib/time.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

const ID = (n) => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
const at = (days, hour = 9) => {
  const d = new Date(`${vnDateKey(new Date())}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return parseVnDateTimeLocal(`${d.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00`);
};

const locations = [
  { id: ID(101), code: "da-nang", name: "Lái Đi Đà Nẵng", type: "hub", address: "72 Bạch Đằng, Hải Châu, Đà Nẵng", active: true },
  { id: ID(102), code: "airport", name: "Sân bay quốc tế Đà Nẵng", type: "airport", address: "Nhà ga quốc nội, Đà Nẵng", note: "Phụ thu 100.000 ₫", active: true },
  { id: ID(103), code: "hai-chau", name: "Trung tâm Hải Châu", type: "office", address: "155 Nguyễn Văn Linh, Hải Châu", active: true },
  { id: ID(104), code: "my-khe", name: "Ven biển Mỹ Khê", type: "hotel", address: "Võ Nguyên Giáp, Sơn Trà", note: "Giao xe tại khách sạn", active: true },
];

const carImage = (file) => `/images/${file}`;

const cars = [
  {
    id: ID(1), code: "VF5-01", plate: "43A-123.45", brand: "VinFast", model: "VF 5", category: "SUV đô thị",
    seats: 5, transmission: "auto", fuel: "electric", year: 2024, price_per_day: 690000, deposit: 5000000,
    location_id: ID(101), status: "available", odometer: 18420, battery: 92, rating: 4.9,
    image_url: carImage("vf5.png"), gallery: [carImage("vf5.png")],
    features: ["Tự lái", "Sạc nhanh", "Camera lùi", "Apple CarPlay"],
    description: "VF 5 gọn gàng, dễ xoay trở trong phố và đủ pin cho hành trình Đà Nẵng – Hội An.",
  },
  {
    id: ID(2), code: "VF5-02", plate: "43A-123.46", brand: "VinFast", model: "VF 5", category: "SUV đô thị",
    seats: 5, transmission: "auto", fuel: "electric", year: 2024, price_per_day: 690000, deposit: 5000000,
    location_id: ID(102), status: "rented", odometer: 23100, battery: 78, rating: 4.8,
    image_url: carImage("vf5.png"), gallery: [carImage("vf5.png")],
    features: ["Tự lái", "Sạc nhanh", "Camera lùi", "Apple CarPlay"],
    description: "Xe nhận tại sân bay, phù hợp chuyến đi ngắn ngày quanh trung tâm.",
  },
  {
    id: ID(3), code: "VF6-01", plate: "43A-678.90", brand: "VinFast", model: "VF 6", category: "SUV cỡ B",
    seats: 5, transmission: "auto", fuel: "electric", year: 2025, price_per_day: 890000, deposit: 7000000,
    location_id: ID(101), status: "available", odometer: 9600, battery: 88, rating: 4.9,
    image_url: carImage("vf6.png"), gallery: [carImage("vf6.png")],
    features: ["Tự lái", "Sạc nhanh", "ADAS", "Camera 360"],
    description: "VF 6 rộng rãi hơn, pin lớn, phù hợp gia đình đi Hội An hoặc Huế.",
  },
  {
    id: ID(4), code: "VF6-02", plate: "43A-678.91", brand: "VinFast", model: "VF 6", category: "SUV cỡ B",
    seats: 5, transmission: "auto", fuel: "electric", year: 2025, price_per_day: 890000, deposit: 7000000,
    location_id: ID(103), status: "rented", odometer: 15200, battery: 64, rating: 4.7,
    image_url: carImage("vf6.png"), gallery: [carImage("vf6.png")],
    features: ["Tự lái", "Sạc nhanh", "ADAS", "Camera 360"],
    description: "Xe gia đình, cốp rộng, nhận xe ngay trung tâm Hải Châu.",
  },
  {
    id: ID(5), code: "VFMPV7-01", plate: "43A-555.55", brand: "VinFast", model: "VF MPV 7", category: "MPV 7 chỗ",
    seats: 7, transmission: "auto", fuel: "electric", year: 2025, price_per_day: 1190000, deposit: 9000000,
    location_id: ID(104), status: "available", odometer: 7300, battery: 95, rating: 5.0,
    image_url: carImage("vfmpv7.png"), gallery: [carImage("vfmpv7.png")],
    features: ["7 chỗ", "Tự lái", "Sạc nhanh", "Cốp lớn", "Camera 360"],
    description: "VF MPV 7 cho nhóm bạn hoặc gia đình nhiều thế hệ, giao xe tận khách sạn Mỹ Khê.",
  },
  {
    id: ID(6), code: "VFMPV7-02", plate: "43A-555.56", brand: "VinFast", model: "VF MPV 7", category: "MPV 7 chỗ",
    seats: 7, transmission: "auto", fuel: "electric", year: 2025, price_per_day: 1190000, deposit: 9000000,
    location_id: ID(102), status: "maintenance", odometer: 26800, battery: 71, rating: 4.6,
    image_url: carImage("vfmpv7.png"), gallery: [carImage("vfmpv7.png")],
    features: ["7 chỗ", "Tự lái", "Sạc nhanh", "Cốp lớn"],
    description: "Xe 7 chỗ đang bảo dưỡng định kỳ, dự kiến mở khai thác lại trong tuần.",
  },
];

const pricing_rules = [
  { id: ID(201), name: "Giá ngày thường · SUV đô thị", scope: "VF 5", kind: "base", amount: 690000, unit: "ngày", active: true },
  { id: ID(202), name: "Giá ngày thường · SUV cỡ B", scope: "VF 6", kind: "base", amount: 890000, unit: "ngày", active: true },
  { id: ID(203), name: "Giá ngày thường · MPV 7 chỗ", scope: "VF MPV 7", kind: "base", amount: 1190000, unit: "ngày", active: true },
  { id: ID(204), name: "Giá lễ 30/04 – 01/05", scope: "Toàn đội xe", kind: "holiday", amount: 250000, unit: "ngày", start_date: "2026-04-28", end_date: "2026-05-02", active: true },
  { id: ID(205), name: "Phụ thu giao xe sân bay", scope: "Sân bay Đà Nẵng", kind: "surcharge", amount: 100000, unit: "lượt", active: true },
  { id: ID(206), name: "Phụ thu trả xe muộn", scope: "Toàn đội xe", kind: "surcharge", amount: 150000, unit: "giờ", active: true },
];

const policies = [
  { id: ID(301), name: "Chính sách cọc & hủy 2026", deposit_type: "percent", deposit_value: 30, fine_hold: 2000000, cancel_hours: 24, refund_pct: 100, effective_from: "2026-01-01", active: true },
];

const bookings = [
  { id: ID(401), code: "LD-2603-1042", car_id: ID(1), customer_name: "Nguyễn Minh Anh", customer_phone: "0905123456", customer_email: "minhanh@example.com", pickup_at: at(3, 9), return_at: at(6, 18), days: 4, unit_price: 690000, deposit: 5000000, total: 7760000, status: "pending", pickup_location: "Lái Đi Đà Nẵng", note: "Muốn nhận xe sớm 30 phút." },
  { id: ID(402), code: "LD-2603-1043", car_id: ID(2), customer_name: "Trần Quốc Bảo", customer_phone: "0912345678", customer_email: "quocbao@example.com", pickup_at: at(5, 14), return_at: at(8, 14), days: 3, unit_price: 690000, deposit: 5000000, total: 7070000, status: "confirmed", pickup_location: "Sân bay quốc tế Đà Nẵng" },
  { id: ID(403), code: "LD-2603-1044", car_id: ID(3), customer_name: "Lê Thu Hà", customer_phone: "0987654321", customer_email: "thuha@example.com", pickup_at: at(1, 10), return_at: at(4, 10), days: 3, unit_price: 890000, deposit: 7000000, total: 9670000, status: "signed", pickup_location: "Lái Đi Đà Nẵng" },
  { id: ID(404), code: "LD-2603-1045", car_id: ID(4), customer_name: "Phạm Gia Huy", customer_phone: "0938111222", customer_email: "giahuy@example.com", pickup_at: at(-1, 15), return_at: at(1, 15), days: 2, unit_price: 890000, deposit: 7000000, total: 8780000, status: "handed_over", pickup_location: "Trung tâm Hải Châu" },
  { id: ID(405), code: "LD-2603-1046", car_id: ID(5), customer_name: "Đỗ Khánh Linh", customer_phone: "0967000111", customer_email: "khanhlinh@example.com", pickup_at: at(-4, 8), return_at: at(-2, 20), days: 3, unit_price: 1190000, deposit: 9000000, total: 12570000, status: "returned", pickup_location: "Ven biển Mỹ Khê" },
  { id: ID(406), code: "LD-2603-1047", car_id: ID(1), customer_name: "Vũ Hoàng Nam", customer_phone: "0903555777", customer_email: "hoangnam@example.com", pickup_at: at(-10, 9), return_at: at(-7, 9), days: 3, unit_price: 690000, deposit: 5000000, total: 7070000, status: "completed", pickup_location: "Lái Đi Đà Nẵng" },
  { id: ID(407), code: "LD-2603-1048", car_id: ID(2), customer_name: "Bùi Thanh Trúc", customer_phone: "0977888999", customer_email: "thanhtruc@example.com", pickup_at: at(8, 9), return_at: at(10, 9), days: 2, unit_price: 690000, deposit: 5000000, total: 6380000, status: "cancelled", pickup_location: "Lái Đi Đà Nẵng" },
  { id: ID(408), code: "LD-2603-1049", car_id: ID(6), customer_name: "Ngô Thị Mai", customer_phone: "0944222333", customer_email: "thimai@example.com", pickup_at: at(-2, 8), return_at: at(2, 18), days: 5, unit_price: 1190000, deposit: 9000000, total: 14950000, status: "handed_over", pickup_location: "Sân bay quốc tế Đà Nẵng" },
  { id: ID(409), code: "LD-2603-1050", car_id: ID(5), customer_name: "Hoàng Anh Tuấn", customer_phone: "0911000222", customer_email: "anhtuan@example.com", pickup_at: at(12, 9), return_at: at(15, 9), days: 3, unit_price: 1190000, deposit: 9000000, total: 12570000, status: "confirmed", pickup_location: "Ven biển Mỹ Khê" },
  { id: ID(410), code: "LD-2603-1051", car_id: ID(3), customer_name: "Phan Bảo Châu", customer_phone: "0988111444", customer_email: "baochau@example.com", pickup_at: at(15, 13), return_at: at(18, 13), days: 3, unit_price: 890000, deposit: 7000000, total: 9670000, status: "pending", pickup_location: "Lái Đi Đà Nẵng" },
];

const contracts = [
  { id: ID(501), code: "HD-2603-1043", booking_id: ID(402), customer_signed: true, signed_at: at(-1, 10), status: "active" },
  { id: ID(502), code: "HD-2603-1044", booking_id: ID(403), customer_signed: true, signed_at: at(0, 16), status: "active" },
  { id: ID(503), code: "HD-2603-1045", booking_id: ID(404), customer_signed: true, signed_at: at(-1, 14), status: "active" },
  { id: ID(504), code: "HD-2603-1046", booking_id: ID(405), customer_signed: true, signed_at: at(-4, 8), status: "active" },
  { id: ID(505), code: "HD-2603-1047", booking_id: ID(406), customer_signed: true, signed_at: at(-10, 9), status: "active" },
  { id: ID(506), code: "HD-2603-1049", booking_id: ID(408), customer_signed: true, signed_at: at(-2, 8), status: "active" },
];

const vehicle_checks = [
  { id: ID(601), booking_id: ID(404), kind: "handover", odometer: 14600, battery: 96, accessories: "Sạc tại nhà, cáp Type 2, áo phủ", checked_by: "Lê Văn Sơn", fees: 0 },
  { id: ID(602), booking_id: ID(408), kind: "handover", odometer: 25400, battery: 88, accessories: "Sạc tại nhà, cáp Type 2", checked_by: "Lê Văn Sơn", fees: 0 },
  { id: ID(603), booking_id: ID(405), kind: "return", odometer: 7654, battery: 41, damage_note: "Xước nhẹ cản sau bên phải", checked_by: "Lê Văn Sơn", fees: 450000 },
  { id: ID(604), booking_id: ID(406), kind: "return", odometer: 18420, battery: 55, damage_note: "Không phát sinh", checked_by: "Trần Văn Hải", fees: 0 },
];

const payments = [
  { id: ID(701), code: "PT-2603-001", booking_id: ID(406), type: "rental", method: "transfer", amount: 2070000, status: "paid", paid_at: at(-10, 9) },
  { id: ID(702), code: "PT-2603-002", booking_id: ID(406), type: "deposit", method: "transfer", amount: 5000000, status: "paid", paid_at: at(-10, 9) },
  { id: ID(703), code: "PC-2603-003", booking_id: ID(406), type: "refund", method: "transfer", amount: 5000000, status: "paid", paid_at: at(-6, 10), note: "Hoàn cọc sau khi đối soát" },
  { id: ID(704), code: "PT-2603-004", booking_id: ID(405), type: "rental", method: "card", amount: 3570000, status: "paid", paid_at: at(-4, 8) },
  { id: ID(705), code: "PC-2603-005", booking_id: ID(405), type: "penalty", method: "cash", amount: 450000, status: "paid", paid_at: at(-2, 20), note: "Cấn trừ xước cản sau" },
  { id: ID(706), code: "PT-2603-006", booking_id: ID(408), type: "deposit", method: "transfer", amount: 9000000, status: "paid", paid_at: at(-2, 8) },
  { id: ID(707), code: "PT-2603-007", booking_id: ID(403), type: "deposit", method: "transfer", amount: 7000000, status: "paid", paid_at: at(0, 16) },
  { id: ID(708), code: "PT-2603-008", booking_id: ID(402), type: "deposit", method: "transfer", amount: 5000000, status: "pending" },
  { id: ID(709), code: "PC-2603-009", booking_id: null, type: "expense", method: "cash", amount: 1250000, status: "paid", paid_at: at(-3, 11), note: "Rửa xe và vệ sinh nội thất" },
];

const maintenance_orders = [
  { id: ID(801), code: "BD-2603-021", car_id: ID(6), category: "Bảo dưỡng định kỳ 30.000 km", assignee: "Trần Văn Hải", status: "in_progress", estimate: 4800000, actual: null, notes: "Thay lọc gió, kiểm tra hệ thống pin", scheduled_at: at(0, 8) },
  { id: ID(802), code: "BD-2603-022", car_id: ID(2), category: "Đảo lốp và cân bằng động", assignee: "Nguyễn Văn Tú", status: "pending", estimate: 850000, actual: null, notes: "Xe vào xưởng sau khi khách trả", scheduled_at: at(9, 9) },
  { id: ID(803), code: "BD-2603-023", car_id: ID(1), category: "Kiểm tra phanh", assignee: "Trần Văn Hải", status: "completed", estimate: 1200000, actual: 1150000, notes: "Đã nghiệm thu, thay má phanh trước", scheduled_at: at(-6, 8) },
  { id: ID(804), code: "BD-2603-024", car_id: ID(3), category: "Bảo dưỡng 10.000 km", assignee: "Nguyễn Văn Tú", status: "approved", estimate: 2200000, actual: null, notes: "Chờ xếp lịch", scheduled_at: at(4, 8) },
];

const incidents = [
  { id: ID(901), code: "SC-2603-006", booking_id: ID(408), car_id: ID(6), type: "Sự cố kỹ thuật", severity: "medium", status: "processing", description: "Đèn cảnh báo áp suất lốp sáng khi đang di chuyển." },
  { id: ID(902), code: "SC-2603-007", booking_id: ID(405), car_id: ID(5), type: "Hư hỏng ngoại thất", severity: "low", status: "resolved", description: "Xước cản sau, đã cấn trừ 450.000 ₫ khi trả xe." },
  { id: ID(903), code: "SC-2603-008", booking_id: ID(404), car_id: ID(4), type: "Sự cố kỹ thuật", severity: "high", status: "new", description: "Khách báo điều hòa không mát, cần xe thay thế." },
];

const fines = [
  { id: ID(1001), code: "PN-2603-001", plate: "43A-123.45", occurred_at: at(-5, 14), booking_id: ID(406), status: "verifying", amount: 900000, note: "Biên bản nguội tại Nguyễn Văn Linh" },
  { id: ID(1002), code: "PN-2603-002", plate: "43A-678.90", occurred_at: at(-12, 8), booking_id: null, status: "waiting", amount: 1200000, note: "Chờ phản hồi từ khách" },
  { id: ID(1003), code: "PN-2603-003", plate: "43A-555.55", occurred_at: at(-20, 19), booking_id: ID(405), status: "resolved", amount: 700000, note: "Đã cấn trừ vào cọc" },
];

const accounts = [
  { email: "admin@laidi.vn", password: "Laidi@2026", full_name: "Nguyễn Quản Trị", role: "admin", phone: "0905111222", branch: "Đà Nẵng" },
  { email: "nhanvien@laidi.vn", password: "Laidi@2026", full_name: "Lê Văn Sơn", role: "staff", phone: "0905222333", branch: "Đà Nẵng" },
  { email: "ketoan@laidi.vn", password: "Laidi@2026", full_name: "Phan Thu Ngân", role: "accountant", phone: "0905333444", branch: "Đà Nẵng" },
  { email: "khach@laidi.vn", password: "Laidi@2026", full_name: "Nguyễn Minh Anh", role: "customer", phone: "0905123456", branch: "Đà Nẵng" },
];

async function upsert(table, rows, onConflict = "id") {
  if (!rows.length) return;
  // Existing demo rows may have progressed through guarded workflows.
  // Re-running seed only fills missing rows; it never rewinds live state.
  const { error } = await db.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✓ ${table}: ${rows.length} rows`);
}

async function seedAccounts() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const byEmail = new Map(data.users.map((u) => [u.email, u]));

  for (const account of accounts) {
    let user = byEmail.get(account.email);
    const isNew = !user;
    if (!user) {
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.full_name, phone: account.phone },
      });
      if (createError) throw createError;
      user = created.user;
      console.log(`✓ auth user ${account.email}`);
    }
    const { error: profileError } = await db.from("profiles").upsert(
      {
        id: user.id,
        full_name: account.full_name,
        phone: account.phone,
        role: account.role,
        branch: account.branch,
        status: "active",
      },
      // The auth trigger creates a customer profile for a new user; initialize
      // its demo role once, but never unlock or reassign an existing account.
      { onConflict: "id", ignoreDuplicates: !isNew },
    );
    if (profileError) throw profileError;
  }

  const { data: refreshed, error: listError } = await db.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const customerId = refreshed.users.find((u) => u.email === "khach@laidi.vn")?.id;
  if (!customerId) throw new Error("Demo customer account was not created.");
  const { error: linkError } = await db
    .from("bookings")
    .update({ user_id: customerId })
    .in("code", ["LD-2603-1042", "LD-2603-1047"])
    .is("user_id", null);
  if (linkError) throw new Error(`bookings: ${linkError.message}`);
  console.log("✓ linked demo bookings to customer account");
  return customerId;
}

async function main() {
  await upsert("locations", locations, "id");
  await upsert("cars", cars, "id");
  await upsert("pricing_rules", pricing_rules, "id");
  await upsert("policies", policies, "id");
  await upsert("bookings", bookings, "id");
  await upsert("contracts", contracts, "id");
  await upsert("vehicle_checks", vehicle_checks, "id");
  await upsert("payments", payments, "id");
  await upsert("maintenance_orders", maintenance_orders, "id");
  await upsert("incidents", incidents, "id");
  await upsert("fines", fines, "id");
  const customerId = await seedAccounts();
  await upsert("booking_requests", [
    {
      id: ID(1101),
      code: "YC-DEMO-001",
      booking_id: ID(401),
      user_id: customerId,
      kind: "extension",
      desired_return_at: at(7, 18),
      reason: "Khách muốn gia hạn thêm một ngày.",
      status: "pending",
    },
  ]);
  await upsert(
    "reviews",
    [
      {
        id: ID(1102),
        booking_id: ID(406),
        user_id: customerId,
        car_id: ID(1),
        car_rating: 5,
        service_rating: 5,
        comment: "Xe sạch, nhận và trả xe thuận tiện.",
      },
    ],
    "booking_id",
  );
  console.log("\nSeed hoàn tất.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
