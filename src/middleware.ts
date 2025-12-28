import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

// Rutas que no requieren autenticación
const publicRoutes = ['/login'];
const publicPrefixes = ['/api/auth/', '/_'];

// UUID del admin autorizado para el CRM
const CRM_ADMIN_UUID = 'f60dd812-cada-4f13-9e5a-841d769f9d8b';

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // Get Supabase session tokens
    const accessToken = context.cookies.get('sb-access-token')?.value;
    const refreshToken = context.cookies.get('sb-refresh-token')?.value;

    let isAuthenticated = false;
    let user = null;

    // Verify session with Supabase
    if (accessToken && refreshToken) {
        // Set the session in supabase client
        const { data: { user: authUser }, error } = await supabase.auth.getUser(accessToken);

        if (!error && authUser && authUser.id === CRM_ADMIN_UUID) {
            isAuthenticated = true;
            user = authUser;

            // Set session for supabase queries
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
        }
    }

    // Redirect root to dashboard or login
    if (pathname === '/') {
        if (isAuthenticated) {
            return context.redirect('/dashboard');
        } else {
            return context.redirect('/login');
        }
    }

    // Allow public routes
    if (publicRoutes.includes(pathname)) {
        // If already logged in, redirect to dashboard
        if (isAuthenticated && pathname === '/login') {
            return context.redirect('/dashboard');
        }
        return next();
    }

    // Allow public prefixes (auth APIs, Astro internals)
    if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
        return next();
    }

    // For API routes, return JSON error instead of redirect
    if (pathname.startsWith('/api/') && !isAuthenticated) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Require authentication for all other routes
    if (!isAuthenticated) {
        return context.redirect('/login');
    }

    // Attach user info to locals for use in pages
    context.locals.user = {
        id: user?.id || 'admin',
        name: user?.email || 'Admin'
    };
    context.locals.profile = {
        id: user?.id || 'admin',
        full_name: 'Shaluqa Admin',
        role: 'admin'
    };

    return next();
});
