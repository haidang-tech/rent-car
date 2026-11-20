import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { updateEmployeeAccessAction } from "@/lib/actions/administration";
import { getProfile, ROLE_LABEL, type Role } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const actor = await getProfile();
  if (!actor || actor.status !== "active" || actor.role !== "admin") redirect("/dang-nhap?next=/quan-tri/nhan-vien");
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, branch, status")
    .order("role")
    .order("full_name");

  return (
    <>
      <PortalTopbar label="Nhân viên & phân quyền" />
      <div className="page-head">
        <div>
          <h1>Nhân viên &amp; phân quyền</h1>
          <p>Vai trò quyết định quyền truy cập dữ liệu qua Row Level Security.</p>
        </div>
      </div>

      {luu ? <p className="form-message success" role="status">Đã cập nhật quyền và trạng thái tài khoản.</p> : null}
      {loi || error ? <p className="form-message error" role="alert">{loi || error?.message}</p> : null}

      <section className="panel">
        <div className="panel-head"><h2>Quyền theo vai trò</h2></div>
        <dl className="detail-list">
          <div><dt>Quản trị</dt><dd>Quản lý xe, đơn, giá, địa điểm và quyền tài khoản.</dd></div>
          <div><dt>Nhân viên giao xe</dt><dd>Duyệt giấy tờ và yêu cầu thuê, bàn giao, nhận trả, bảo dưỡng và sự cố.</dd></div>
          <div><dt>Kế toán</dt><dd>Hợp đồng, tiền cọc, chứng từ, đối soát, phạt nguội và duyệt dự toán.</dd></div>
          <div><dt>Khách hàng</dt><dd>Chỉ truy cập các chuyến thuê và hồ sơ của mình.</dd></div>
        </dl>
        <p className="field-hint">Tài khoản bị khóa không được tiếp tục thao tác. Không thể tự khóa hoặc hạ quyền tài khoản quản trị đang dùng.</p>
      </section>

      <div className="panel">
        <div className="panel-head">
          <h2>{error ? "Chưa tải được tài khoản" : `${profiles?.length ?? 0} tài khoản`}</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Điện thoại</th>
                <th>Vai trò hiện tại</th>
                <th>Cơ sở</th>
                <th>Trạng thái</th>
                <th>Phân quyền</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
                <tr key={profile.id}>
                  <td className="strong">{profile.full_name}</td>
                  <td>{profile.phone ?? "—"}</td>
                  <td>
                    <span className="badge plum">
                      {ROLE_LABEL[profile.role as Role] ?? profile.role}
                    </span>
                  </td>
                  <td>{profile.branch ?? "—"}</td>
                  <td>
                    <span className={`badge ${profile.status === "active" ? "success" : "danger"}`}>
                      {profile.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td>
                    <form action={updateEmployeeAccessAction} className="row-actions">
                      <input type="hidden" name="id" value={profile.id} />
                      <input type="hidden" name="status" value={profile.status} />
                      <select
                        name="role"
                        defaultValue={profile.role}
                        aria-label={`Vai trò của ${profile.full_name}`}
                        disabled={profile.id === actor.id}
                        style={{ border: "1px solid var(--plum-line)", borderRadius: 8, padding: "5px 8px", fontSize: 12 }}
                      >
                        <option value="admin">Quản trị</option>
                        <option value="staff">Nhân viên giao xe</option>
                        <option value="accountant">Kế toán</option>
                        <option value="customer">Khách hàng</option>
                      </select>
                      <button className="chip" type="submit" disabled={profile.id === actor.id}>Lưu vai trò</button>
                    </form>
                    <form action={updateEmployeeAccessAction}>
                      <input type="hidden" name="id" value={profile.id} />
                      <input type="hidden" name="role" value={profile.role} />
                      <input type="hidden" name="status" value={profile.status === "active" ? "locked" : "active"} />
                      <button className="chip" type="submit" disabled={profile.id === actor.id}>{profile.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!error && !profiles?.length ? <tr><td colSpan={6} className="empty">Chưa có tài khoản.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
