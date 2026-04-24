// Single Supabase client for the entire app.
// All imports should use: import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
