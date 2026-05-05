import { defineMiddleware } from 'astro:middleware';

// UUID del admin autorizado para el CRM
const CRM_ADMIN_UUID = '180dd566-d013-45ba-b13f-eae84f24e7d2';

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // Modo local: el CRM siempre opera como admin interno.
    // Todas las operaciones de BD se ejecutan desde servidor con service_role.
    context.locals.user = {
        id: CRM_ADMIN_UUID,
        name: 'Shaluqa Admin'
    };
    context.locals.profile = {
        id: CRM_ADMIN_UUID,
        full_name: 'Shaluqa Admin',
        role: 'admin'
    };

    if (pathname === '/' || pathname === '/login') {
        return context.redirect('/dashboard');
    }

    return next();
});
