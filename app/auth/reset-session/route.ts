import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type Role } from "@/lib/auth";

// Cookie mutation belongs in a handler, not a Server Component render.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
    if (profile?.status === "active" && Object.hasOwn(ROLE_HOME, profile.role)) redirect(ROLE_HOME[profile.role as Role]);
  }
  await supabase.auth.signOut({ scope: "local" });
  redirect("/dang-nhap");
}
