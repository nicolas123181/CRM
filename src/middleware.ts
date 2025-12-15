import { defineMiddleware } from 'astro:middleware';
import { getSession, getProfile } from './lib/auth';

const publicRoutes = ['/', '/login', '/register'];

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // Allow public routes
    if (publicRoutes.includes(pathname)) {
        return next();
    }

    // Check authentication for protected routes
    const { session } = await getSession();

    if (!session) {
        return context.redirect('/login');
    }

    // Get user profile to check role
    const { profile } = await getProfile(session.user.id);

    if (!profile) {
        return context.redirect('/login');
    }

    // Attach user info to locals for use in pages
    context.locals.user = session.user;
    context.locals.profile = profile;

    return next();
});
