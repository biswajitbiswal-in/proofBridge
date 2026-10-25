import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

export const supabaseUrl =
  ((env.VITE_SUPABASE_URL as string | undefined) || '').trim();

export const supabaseAnonKey =
  (
    (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    ''
  ).trim();

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-supabase-anon-key') &&
  !supabaseAnonKey.includes('your-anon-key-placeholder');

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);

const FORCE_LOCAL_KEY = 'proofbridge_force_local_v1';

let forceLocalMode: boolean = (() => {
  try {
    return localStorage.getItem(FORCE_LOCAL_KEY) === 'true';
  } catch {
    return false;
  }
})();
let schemaReadyCached: boolean | null = null;

export function setForceLocalMode(force: boolean): void {
  forceLocalMode = force;
  try {
    if (force) {
      localStorage.setItem(FORCE_LOCAL_KEY, 'true');
    } else {
      localStorage.removeItem(FORCE_LOCAL_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function isLocalModeForced(): boolean {
  return forceLocalMode;
}

export async function isSupabaseSchemaReady(): Promise<boolean> {
  if (forceLocalMode || !isSupabaseConfigured) return false;
  if (schemaReadyCached !== null) return schemaReadyCached;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return false;
    }
    const { error } = await supabase.from('issues').select('id').limit(1);
    if (
      error &&
      (error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message.includes('Could not find the table') ||
        error.message.includes('does not exist'))
    ) {
      schemaReadyCached = false;
      return false;
    }
    schemaReadyCached = true;
    return true;
  } catch {
    schemaReadyCached = false;
    return false;
  }
}
