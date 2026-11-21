import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { signContractAction } from "@/lib/actions/ops";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const CONTRACT_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Chờ duyệt", tone: "warn" },
  active: { label: "Có hiệu lực", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "danger" },
};

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ ky?: string; loi?: string }>;
}) {
  const { ky, loi } = await searchParams;
  const supabase = await createClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, code, status, customer_signed, signed_at, booking_id, bookings(code, customer_name, total, deposit)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PortalTopbar label="Hợp đồng điện tử" />
      <div className="page-head">
        <div>
          <h1>Hợp đồng điện tử</h1>
          <p>Duyệt hợp đồng sau khi khách xác nhận, rồi theo dõi hiệu lực và chứng từ.</p>
        </div>
      </div>

      {ky ? <p className="form-message success">Đã ký duyệt hợp đồng.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2>{contracts?.length ?? 0} hợp đồng</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Hợp đồng</th>
                <th>Đơn thuê</th>
                <th>Khách thuê</th>
                <th>Cọc</th>
                <th>Khách xác nhận</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(contracts ?? []).map((contract) => {
                const booking = contract.bookings as
                  | { code?: string; customer_name?: string; total?: number; deposit?: number }
                  | null;
                return (
                  <tr key={contract.id}>
                    <td className="strong">{contract.code}</td>
                    <td>{booking?.code ?? "—"}</td>
                    <td>{booking?.customer_name ?? "—"}</td>
                    <td>{currency(booking?.deposit ?? 0)}</td>
                    <td>{dateTime(contract.signed_at)}</td>
                    <td>
                      <span className={`badge ${CONTRACT_STATUS[contract.status]?.tone ?? "muted"}`}>
                        {contract.status === "pending" && !contract.customer_signed
                          ? "Chờ khách ký"
                          : CONTRACT_STATUS[contract.status]?.label ?? contract.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {contract.status === "pending" && contract.customer_signed ? (
                          <form action={signContractAction}>
                            <input type="hidden" name="id" value={contract.id} />
                            <button className="chip" type="submit">Ký duyệt</button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!contracts?.length ? (
                <tr><td colSpan={7} className="empty">Chưa có hợp đồng.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Quy trình ký số</h2>
        </div>
        <div className="detail-list">
          <div><span>1. Khách xác nhận hợp đồng</span><span>Trước khi gửi yêu cầu đặt cọc</span></div>
          <div><span>2. Cơ sở ký duyệt</span><span>Kế toán / chủ cơ sở</span></div>
          <div><span>3. Gửi bản sao</span><span>Email + tài khoản khách</span></div>
          <div><span>4. Lưu trữ</span><span>Storage bucket hợp đồng</span></div>
        </div>
      </div>
    </>
  );
}
