import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createSignedUrls(
  supabase: SupabaseClient,
  bucket: string,
  paths: (string | null | undefined)[],
  expires = 600,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const entries = await Promise.all(
    unique.map(async (path) => {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
      return [path, data?.signedUrl ?? ""] as const;
    }),
  );
  return Object.fromEntries(entries);
}
