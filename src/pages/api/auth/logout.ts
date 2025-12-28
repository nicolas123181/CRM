import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const handleLogout = async ({ cookies, redirect }: { cookies: any, redirect: any }) => {
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Delete session cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    return redirect('/login');
};

export const GET: APIRoute = async (context) => {
    return handleLogout(context);
};

export const POST: APIRoute = async (context) => {
    return handleLogout(context);
};
