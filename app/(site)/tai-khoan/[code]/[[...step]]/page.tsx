import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { FileUpload } from "@/components/file-upload";
import { ContractConsent, ExtensionDate, StarRating, SubmitButton } from "@/components/customer-controls";
import { ACCOUNT_ROUTES, getMyTrip, type TripCar } from "@/lib/customer-portal";
import { vnDateKey } from "@/lib/time";
import { tripRouteApplies } from "@/lib/customer-state";
import { currency, dateTime } from "@/lib/format";
import { submitKycAction, signMyContractAction, requestDepositAction, requestExtensionAction, requestExchangeAction, requestCancellationAction, reportIncidentAction, submitReviewAction } from "@/lib/actions/customer";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string; step?: string[] }>; searchParams: Promise<{ ok?: string; loi?: string }> };
const requestLabels: Record<string,string> = { extension: "Gia hạn", exchange: "Đổi xe", cancellation: "Hủy chuyến", incident: "Báo sự cố" };
const stateLabels: Record<string,string> = { pending: "Chờ xử lý", approved: "Đã duyệt", rejected: "Từ chối", verified: "Đã xác thực", paid: "Đã nhận tiền", cancelled: "Đã hủy", active: "Có hiệu lực", draft: "Chờ cơ sở xác nhận", completed: "Đã hoàn tất", refunded: "Đã hoàn tiền" };
export default async function TripPage({ params, searchParams }: Props) {
  const { code, step } = await params;
  const current = step?.[0] || "";
  if ((step?.length || 0)>1 || !ACCOUNT_ROUTES.some(([path]) => path===current)) notFound();
  const { trip, db, requestTime } = await getMyTrip(code);
  const query = await searchParams;
  const [kycResult, contractResult, paymentResult, requestResult, reviewResult] = await Promise.all([
    db.from("kyc_records").select("status,note").eq("booking_id",trip.id).maybeSingle(),
    db.from("contracts").select("id,code,status,customer_signed,signed_at,terms_snapshot,accepted_version").eq("booking_id",trip.id).neq("status","cancelled").order("created_at",{ascending:false}).limit(1).maybeSingle(),
    db.from("payments").select("id,code,status,amount,method").eq("booking_id",trip.id).eq("type","deposit").order("created_at",{ascending:false}),
    db.from("booking_requests").select("id,kind,reason,status,fee,created_at,decision_note").eq("booking_id",trip.id).order("created_at",{ascending:false}),
    db.from("reviews").select("car_rating,service_rating,comment").eq("booking_id",trip.id).maybeSingle()
  ]);
  if ([kycResult,contractResult,paymentResult,requestResult,reviewResult].some(result=>result.error)) throw new Error("Không tải được hồ sơ chuyến thuê. Kiểm tra kết nối và migration cổng khách hàng.");
  const kyc = kycResult.data, contract = contractResult.data, payments = paymentResult.data || [], requests = requestResult.data || [];
  const verified = kyc?.status==="verified", signed = !!contract?.customer_signed && ["pending", "active"].includes(contract.status);
  const paidAmount = payments.filter(p=>p.status==="paid").reduce((sum,p)=>sum+Number(p.amount),0);
  const paid = paidAmount>=Number(trip.deposit);
  const editable = ["pending","confirmed","signed","handed_over"].includes(trip.status);
  const beforePickup = ["pending","confirmed","signed"].includes(trip.status);
  let policy = trip.policy_snapshot;
  if (!policy) {
    const result = await db.from("policies").select("name,cancel_hours,refund_pct").eq("active",true).lte("effective_from",vnDateKey(trip.pickup_at)).order("effective_from",{ascending:false}).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if (result.error) throw new Error("Không tải được chính sách thuê.");
    policy = result.data;
  }
  let cars: TripCar[] = [];
  if (current==="doi-xe" && beforePickup) {
    const result = await db.from("cars").select("id,code,brand,model,seats,fuel,transmission,image_url,price_per_day,status").in("status",["available","rented"]).neq("id",trip.car_id).order("price_per_day");
    if (result.error) throw new Error("Không tải được danh sách xe thay thế.");
    cars = result.data || [];
  }
  const pending = (kind:string) => requests.some(r=>r.kind===kind && r.status==="pending");
  const routeApplies = tripRouteApplies(current, trip.status);
  const canKyc = ["pending", "confirmed"].includes(trip.status) && kyc?.status !== "pending" && !verified;
  const canSign = verified && ["confirmed", "signed"].includes(trip.status) && !signed && !!policy;
  const canDeposit = signed && ["confirmed", "signed"].includes(trip.status) && !paid && !payments.some(p => p.status === "pending");
  const codeField = <input type="hidden" name="code" value={trip.code} />;
  const reason = <label className="field"><span>Lý do / nội dung yêu cầu</span><textarea name="reason" minLength={3} maxLength={2000} required rows={4} /></label>;
  const fee = policy ? Number(trip.deposit)*(1-((new Date(trip.pickup_at).getTime()-requestTime)/3600000>=policy.cancel_hours ? policy.refund_pct/100 : 0)) : null;
  return <AccountShell trip={trip} current={current} verified={verified} signed={signed} paid={paid}>
    <p className="eyebrow">{trip.code} / CHUYẾN THUÊ CỦA BẠN</p><h1>{ACCOUNT_ROUTES.find(([path])=>path===current)?.[1]}</h1>
    {query.loi && <p role="alert" className="form-message error">{query.loi}</p>}
    {query.ok && <p role="status" className="form-message success">Đã ghi nhận thông tin. Trạng thái hồ sơ bên dưới là kết quả hiện tại từ hệ thống.</p>}
    {!routeApplies && <p className="form-message">Thao tác này không áp dụng cho trạng thái hiện tại của chuyến thuê.</p>}
    {!current && <><h2>{trip.cars?.brand} {trip.cars?.model}</h2><div className="trip-specs"><div><small>Số chỗ</small><strong>{trip.cars?.seats}</strong></div><div><small>Nhiên liệu</small><strong>{trip.cars?.fuel}</strong></div><div><small>Hộp số</small><strong>{trip.cars?.transmission}</strong></div><div><small>Giá thuê / ngày</small><strong>{currency(trip.unit_price)}</strong></div></div><p>Hoàn tất giấy tờ, xác nhận điều khoản và tiền cọc trước khi nhận xe.</p><Link className="button" href={`/tai-khoan/${code}/ekyc`}>Xem hồ sơ giấy tờ</Link></>}
    {current==="ekyc" && <><p>Nhân viên kiểm tra bốn ảnh giấy tờ và thông báo kết quả. Đây là xác minh thủ công.</p><p className="form-message">Trạng thái: {kyc ? stateLabels[kyc.status] : "Chưa gửi"}{kyc?.note ? ` · ${kyc.note}` : ""}</p>{canKyc && <form action={submitKycAction}>{codeField}<fieldset disabled={!['pending','confirmed'].includes(trip.status) || kyc?.status==='pending' || verified}><div className="upload-grid">{[["id_front","Mặt trước CCCD"],["id_back","Mặt sau CCCD"],["license","Giấy phép lái xe"],["selfie","Ảnh khuôn mặt"]].map(([name,label])=><FileUpload key={name} name={name} label={label} required />)}</div><SubmitButton>Gửi hồ sơ để nhân viên duyệt</SubmitButton></fieldset></form>}</>}
    {current==="hop-dong" && <><p>Hợp đồng: {contract?.code || "Chưa xác nhận"} · {contract ? (stateLabels[contract.status] ?? contract.status) : "Bản điều khoản trước khi xác nhận"}</p><dl className="contract-details"><div><dt>Bên thuê</dt><dd>{trip.customer_name}</dd></div><div><dt>Thời gian</dt><dd>{dateTime(trip.pickup_at)} — {dateTime(trip.return_at)}</dd></div><div><dt>Tổng cộng (gồm cọc)</dt><dd>{currency(trip.total)}</dd></div><div><dt>Tiền cọc</dt><dd>{currency(trip.deposit)}</dd></div></dl><details open><summary>Điều kiện nhận và trả xe</summary><p>Nhận tại {trip.pickup_location}. Hai bên đối chiếu giấy phép lái xe, tình trạng xe, ODO và mức pin khi bàn giao, trả xe.</p></details><details open><summary>Chính sách hủy áp dụng</summary><p>{policy ? `${policy.name}: báo trước ít nhất ${policy.cancel_hours} giờ được hoàn ${policy.refund_pct}% tiền cọc. Ngoài thời hạn này tiền cọc có thể được cấn trừ theo chính sách. Việc hoàn tiền phải được kế toán đối chiếu.` : "Chưa xác định được chính sách. Liên hệ cơ sở trước khi xác nhận."}</p></details><p className="form-message">{signed ? `Đã ghi nhận đồng ý lúc ${dateTime(contract?.signed_at)}. ${contract?.status==='active' ? 'Cơ sở đã xác nhận.' : 'Chờ cơ sở xác nhận hợp đồng.'}` : "Chỉ xác nhận khi giấy tờ đã được duyệt và đơn đã được nhân viên xác nhận."}</p>{canSign && <form action={signMyContractAction}>{codeField}<ContractConsent disabled={!verified || !['confirmed','signed'].includes(trip.status) || signed || !policy} /></form>}<small>Thao tác ghi nhận sự đồng ý điện tử; không phải chữ ký số được chứng thực.</small></>}
    {current==="thanh-toan" && <><div className="deposit-box"><small>Tiền cọc theo đơn</small><strong>{currency(trip.deposit)}</strong><span>Đã được kế toán xác nhận: {currency(paidAmount)}</span><span>{Number(trip.deposit) === 0 ? "Không yêu cầu tiền cọc" : paid ? "Đã đủ tiền cọc" : payments.some(p=>p.status==="pending") ? "Đang chờ kế toán đối chiếu" : `Còn thiếu: ${currency(Math.max(0, Number(trip.deposit)-paidAmount))}`}</span></div><p>Gửi yêu cầu ghi nhận tiền cọc. Kế toán đối chiếu tiền thực nhận trước khi cập nhật trạng thái. Không có cổng thanh toán tự động.</p>{canDeposit && <form action={requestDepositAction}>{codeField}<fieldset disabled={!signed || !['confirmed','signed'].includes(trip.status) || paid || payments.some(p=>p.status==='pending')}><legend>Phương thức dự kiến</legend><div className="payment-options"><label><input name="method" type="radio" value="transfer" required /> Chuyển khoản theo hướng dẫn của cơ sở</label><label><input name="method" type="radio" value="cash" required /> Tiền mặt tại cơ sở</label></div><SubmitButton>Gửi yêu cầu xác nhận cọc</SubmitButton></fieldset></form>}<ul>{payments.map(p=><li key={p.id}>{p.code} · {currency(p.amount)} · {stateLabels[p.status] ?? p.status}</li>)}</ul></>}
    {current==="gia-han" && routeApplies && <><p>Ngày trả hiện có: {dateTime(trip.return_at)}. Phụ phí và lịch trống được kiểm tra khi nhân viên duyệt.</p><form action={requestExtensionAction}>{codeField}<fieldset disabled={!editable || pending('extension')}><ExtensionDate current={trip.return_at} />{reason}<SubmitButton>Gửi yêu cầu gia hạn</SubmitButton></fieldset></form></>}
    {current==="doi-xe" && routeApplies && <><p>Xe thay thế được kiểm tra lịch khi nhân viên duyệt. Đổi xe trước bàn giao tạo phụ lục để bạn xác nhận lại. Nếu đã nhận xe, cơ sở cần lập biên bản bàn giao thay thế.</p><form action={requestExchangeAction}>{codeField}<fieldset disabled={!beforePickup || pending('exchange')}><legend>Xe muốn đổi</legend><div className="exchange-grid">{cars.map(car=><label key={car.id}><input name="replacement_car_id" type="radio" value={car.id} required /><span><strong>{car.brand} {car.model} · {car.code}</strong><small>{car.seats} chỗ · {currency(car.price_per_day)}/ngày</small></span></label>)}</div>{!cars.length && <p>Không có xe thay thế đang khai thác.</p>}{reason}<SubmitButton disabled={!cars.length}>Gửi yêu cầu đổi xe</SubmitButton></fieldset></form></>}
    {current==="huy" && routeApplies && <><p>Phí cấn trừ cọc dự kiến: <strong>{fee===null ? "Chưa có chính sách" : currency(fee)}</strong>.</p><p>Dự kiến hoàn từ cọc đã nhận: {fee===null ? "Chưa xác định" : currency(Math.max(0,paidAmount-fee))}. Đây chưa phải giao dịch hoàn tiền.</p><form action={requestCancellationAction}>{codeField}<fieldset disabled={!beforePickup || pending('cancellation') || !policy}>{reason}<SubmitButton>Gửi yêu cầu hủy chuyến</SubmitButton></fieldset></form></>}
    {current==="su-co" && routeApplies && <form action={reportIncidentAction}>{codeField}<fieldset disabled={!editable || pending('incident')}><label className="field"><span>Loại sự cố</span><select name="type" required><option>Hỏng xe / không khởi động</option><option>Tai nạn</option><option>Hết pin / nhiên liệu</option><option>Mất giấy tờ xe</option><option>Khác</option></select></label><label className="field"><span>Vị trí hiện tại</span><input name="location" required maxLength={200} /></label>{reason}<FileUpload name="photo" label="Ảnh / bằng chứng" /><SubmitButton>Gửi báo cáo sự cố</SubmitButton></fieldset></form>}
    {current==="danh-gia" && routeApplies && <>{reviewResult.data ? <p className="form-message success">Bạn đã đánh giá xe {reviewResult.data.car_rating}/5, dịch vụ {reviewResult.data.service_rating}/5. {reviewResult.data.comment}</p> : <form action={submitReviewAction}>{codeField}{trip.status!=='completed' && <p>Chỉ đánh giá khi chuyến thuê đã hoàn tất.</p>}<fieldset disabled={trip.status!=='completed'}><div className="rating-grid"><StarRating name="car_rating" label="Đánh giá xe" /><StarRating name="service_rating" label="Đánh giá dịch vụ" /></div><label className="field"><span>Nhận xét</span><textarea name="comment" maxLength={2000} rows={4} /></label><FileUpload name="photo" label="Ảnh chuyến đi (tùy chọn)" /><SubmitButton>Gửi đánh giá</SubmitButton></fieldset></form>}</>}
    {requests.length>0 && <section className="request-history"><h2>Lịch sử yêu cầu</h2>{requests.map(r=><article key={r.id}><strong>{requestLabels[r.kind]} · {stateLabels[r.status]}</strong><p>{r.reason}</p><small>{dateTime(r.created_at)} · Phí: {currency(r.fee)}{r.decision_note ? ` · ${r.decision_note}` : ''}</small></article>)}</section>}
  </AccountShell>;
}
