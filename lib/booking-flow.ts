import { createClient } from "@/lib/supabase/server";

/**
 * Khi khách đã xác thực eKYC, ký hợp đồng và đóng cọc, đơn đã sẵn sàng giao.
 * Chỉ chuyển đơn sang "signed" khi admin/nhân viên đã xác nhận đơn (confirmed).
 */
export async function syncBookingReadiness(bookingId: string): Promise<boolean> {
  const supabase = await createClient();

  const [{ data: booking }, { data: kyc }, { data: contract }, { data: deposit }] =
    await Promise.all([
      supabase.from("bookings").select("id, status").eq("id", bookingId).maybeSingle(),
      supabase
        .from("kyc_records")
        .select("id, status")
        .eq("booking_id", bookingId)
        .maybeSingle(),
      supabase
        .from("contracts")
        .select("id, status, customer_signed")
        .eq("booking_id", bookingId)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("id, status")
        .eq("booking_id", bookingId)
        .eq("type", "deposit")
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    ]);

  if (!booking || booking.status !== "confirmed") return false;
  if (kyc?.status !== "verified") return false;
  if (!contract?.customer_signed) return false;
  if (deposit?.status !== "paid") return false;

  await supabase.from("bookings").update({ status: "signed" }).eq("id", bookingId);

  if (contract.status !== "active") {
    await supabase
      .from("contracts")
      .update({ status: "active", signed_at: new Date().toISOString() })
      .eq("id", contract.id);
  }

  return true;
}
