// Backend browser client — Supabase (auth + RLS-scoped DB). Storage writes go
// through server actions with the service role (see supabase-admin.ts).
export {
  getBrowserSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
