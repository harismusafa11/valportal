import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://hjvnmnehhbbgncrxueje.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_GXUOJJGm133lK3Ys4b28uA_O4ghE-BA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
