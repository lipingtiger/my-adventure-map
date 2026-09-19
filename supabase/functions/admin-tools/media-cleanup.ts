import type { createClient } from "npm:@supabase/supabase-js@2";
type Database = ReturnType<typeof createClient>;

export async function pendingMediaCleanup(supabase: Database) {
  const { count, error } = await supabase.from("media_storage_cleanup").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function cleanupMediaFiles(supabase: Database) {
  const { data, error } = await supabase.from("media_storage_cleanup").select("id,storage_bucket,paths")
    .order("created_at").order("id").limit(100);
  if (error) throw error;
  const groups = new Map<string, { ids: string[]; paths: string[] }>();
  for (const row of data ?? []) {
    const group = groups.get(row.storage_bucket) ?? { ids: [], paths: [] };
    group.ids.push(row.id); group.paths.push(...row.paths);
    groups.set(row.storage_bucket, group);
  }
  for (const [bucket, group] of groups) {
    try {
      if (group.paths.length) {
        const { error } = await supabase.storage.from(bucket).remove([...new Set(group.paths)]);
        if (error) continue;
      }
      const { error } = await supabase.from("media_storage_cleanup").delete().in("id", group.ids);
      if (error) continue;
    } catch { /* Retain queued paths for a safe retry after storage or network failures. */ }
  }
  return pendingMediaCleanup(supabase);
}
