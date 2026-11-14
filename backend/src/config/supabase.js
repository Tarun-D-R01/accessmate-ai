import { createClient } from '@supabase/supabase-js';
import { env, isPlaceholderSupabaseUrl, isPlaceholderSupabaseKey } from './env.js';

let supabaseClient = null;

export const isSupabaseConfigured = () => {
  const activeKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  return !isPlaceholderSupabaseUrl(env.SUPABASE_URL) && !isPlaceholderSupabaseKey(activeKey);
};

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    const activeKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    supabaseClient = createClient(env.SUPABASE_URL, activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
};
