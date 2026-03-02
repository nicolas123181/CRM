import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';
import { supabase } from '../../lib/supabase';

// Configure Cloudinary
cloudinary.config({
    cloud_name: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'dqfm8t5bw',
    api_key: import.meta.env.PUBLIC_CLOUDINARY_API_KEY || '813288167926566',
    api_secret: import.meta.env.CLOUDINARY_API_SECRET || 'oIoMuDAr-BUaKLcYicNhuKH_LQo'
});

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

        // Set the session for this request to ensure valid auth
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string;
        const path = formData.get('path') as string || '';

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

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;

        // Get safe name without extension for Cloudinary public_id
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
        const fileName = `${safeName}_${timestamp}`;
        const fullPath = path ? `${path}/${fileName}` : fileName;

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
            public_id: fullPath,
            folder: bucket, // We use the intended "bucket" name as a folder
            resource_type: "auto"
        });

        return new Response(JSON.stringify({
            success: true,
            url: uploadResult.secure_url,
            path: uploadResult.public_id,
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

