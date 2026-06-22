import type { APIRoute } from 'astro';
import { uploadToCloudinary } from '../../lib/cloudinary';

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error desconocido';
}

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
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
        const uploadPath = path ? `${bucket}/${path}` : bucket;
        const secureUrl = await uploadToCloudinary(file, uploadPath);

        return new Response(JSON.stringify({
            success: true,
            url: secureUrl,
            bucket: bucket
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ error: `Error subiendo imagen: ${getErrorMessage(error)}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

