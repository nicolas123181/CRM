import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!import.meta.env.SSR) {
    throw new Error('src/lib/supabase.ts is server-only and must not be imported in the browser');
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing required Supabase environment variables (PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});

// En un cliente admin (service_role) no debemos cambiar el contexto con JWTs de usuario.
(supabase.auth as any).setSession = async () => ({
    data: { user: null, session: null },
    error: null,
});
