import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
const isServiceRoleMode = Boolean(supabaseServiceRoleKey);

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables (SUPABASE_SERVICE_ROLE_KEY or PUBLIC_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});

if (isServiceRoleMode) {
    // En modo service_role no debemos cambiar el contexto del cliente con JWTs de usuario.
    (supabase.auth as any).setSession = async () => ({
        data: { user: null, session: null },
        error: null,
    });
}
