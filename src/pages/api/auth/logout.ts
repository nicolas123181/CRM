import type { APIRoute } from 'astro';
import { signOut } from '../../../lib/auth';

export const POST: APIRoute = async ({ redirect }) => {
    await signOut();
    return redirect('/login');
};
