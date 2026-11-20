import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "staff" | "accountant" | "customer";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  branch: string | null;
  status: string;
};

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSession();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, branch, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!data || data.status !== "active") return null;
  return data as Profile;
});

export const ROLE_HOME: Record<Role, string> = {
  admin: "/quan-tri",
  staff: "/nhan-vien",
  accountant: "/ke-toan",
  customer: "/tai-khoan",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Quản trị",
  staff: "Nhân viên giao xe",
  accountant: "Kế toán",
  customer: "Khách hàng",
};
