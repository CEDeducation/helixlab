import {createBrowserClient} from '@supabase/ssr';
import type {SupabaseClient} from '@supabase/supabase-js';
let instance:SupabaseClient|undefined;
export function isConfigured():boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
/** The publishable key is safe for browser use; service-role keys are not. */
export function client():SupabaseClient {
  if(!isConfigured()) throw new Error('Configure Supabase URL and publishable key on Vercel.');
  if(!instance) instance=createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return instance;
}
