import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://gnysuxuizoehzyvttctu.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdueXN1eHVpem9laHp5dnR0Y3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzOTcwMjYsImV4cCI6MjEwOTk3MzAyNn0.mYUQ043hvYPPWfaywnihhp0FwmHFt3uDOGYikXsx1tM";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith("https://") &&
    (supabaseAnonKey || supabaseServiceKey)
  );
};

// Client for Browser / Public Next.js pages
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey)
  : null;

// Admin Client with Service Role (Bypasses RLS on server)
export const supabaseAdmin = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
