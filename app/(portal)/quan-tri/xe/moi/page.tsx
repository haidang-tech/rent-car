import Link from "next/link";
import { PortalTopbar } from "@/components/portal-shell";
import { CarForm } from "@/components/car-form";

export default function NewCarPage() {
  return (
    <>
      <PortalTopbar label="Thêm xe mới" />
      <div className="page-head">
        <div>
          <h1>Thêm xe mới</h1>
          <p>Thông tin phương tiện và điều kiện khai thác.</p>
        </div>
        <div className="actions">
          <Link className="button ghost" href="/quan-tri/xe">
            ← Danh mục xe
          </Link>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>Thông tin phương tiện</h2>
        </div>
        <CarForm />
      </div>
    </>
  );
}
