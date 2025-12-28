import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        // Get session tokens from cookies
        const accessToken = cookies.get('sb-access-token')?.value;
        const refreshToken = cookies.get('sb-refresh-token')?.value;

        if (!accessToken || !refreshToken) {
            return new Response(JSON.stringify({ error: 'No autenticado' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Set the session for this request
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string;
        const path = formData.get('path') as string || '';
        const createBucket = formData.get('createBucket') === 'true';

        if (!file || !bucket) {
            return new Response(JSON.stringify({ error: 'Archivo y bucket requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'El archivo excede 50MB' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create bucket if needed (for dynamic establishment buckets)
        if (createBucket) {
            const { data: buckets } = await supabase.storage.listBuckets();
            const bucketExists = buckets?.some(b => b.name === bucket);

            if (!bucketExists) {
                const { error: createError } = await supabase.storage.createBucket(bucket, {
                    public: true,
                    fileSizeLimit: 52428800 // 50MB
                });

                if (createError && !createError.message.includes('already exists')) {
                    return new Response(JSON.stringify({ error: `Error creando bucket: ${createError.message}` }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
        const fileName = `${safeName}_${timestamp}.${extension}`;
        const fullPath = path ? `${path}/${fileName}` : fileName;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fullPath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            return new Response(JSON.stringify({ error: `Error subiendo: ${error.message}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return new Response(JSON.stringify({
            success: true,
            url: urlData.publicUrl,
            path: data.path,
            bucket: bucket
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
