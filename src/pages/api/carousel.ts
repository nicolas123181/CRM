import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { uploadToCloudinary, deleteFromCloudinary } from '../../lib/cloudinary';

// Add photo to carousel
export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        // Authenticate session for RLS
        const accessToken = cookies.get('sb-access-token')?.value;
        const refreshToken = cookies.get('sb-refresh-token')?.value;
        if (accessToken && refreshToken) {
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const establecimientoId = formData.get('establecimiento_id') as string;
        const folderName = formData.get('folder_name') as string || 'default';
        const descripcion = formData.get('descripcion') as string || null;
        const esPrincipal = formData.get('es_principal') === 'true';

        if (!file || !establecimientoId) {
            return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Upload to Cloudinary
        const sanitizedFolder = folderName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, '_');
        const cloudinaryUrl = await uploadToCloudinary(file, `Carruseles/${sanitizedFolder}`);

        // Get max orden
        const { data: maxOrden } = await supabase
            .from('establecimiento_fotos')
            .select('orden')
            .eq('establecimiento_id', establecimientoId)
            .order('orden', { ascending: false })
            .limit(1)
            .single();

        const newOrden = (maxOrden?.orden || 0) + 1;

        // If setting as principal, unset others first
        if (esPrincipal) {
            await supabase
                .from('establecimiento_fotos')
                .update({ es_principal: false })
                .eq('establecimiento_id', establecimientoId);
        }

        // Insert into database
        const { data: foto, error: insertError } = await supabase
            .from('establecimiento_fotos')
            .insert({
                establecimiento_id: parseInt(establecimientoId),
                imagen_url: cloudinaryUrl,
                orden: newOrden,
                es_principal: esPrincipal,
                descripcion: descripcion
            })
            .select()
            .single();

        if (insertError) {
            return new Response(JSON.stringify({ error: `Error guardando: ${insertError.message}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, foto }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Carousel upload error:', error);
        return new Response(JSON.stringify({ error: 'Error interno' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// Delete photo from carousel
export const DELETE: APIRoute = async ({ request, cookies }) => {
    try {
        // Authenticate session for RLS
        const accessToken = cookies.get('sb-access-token')?.value;
        const refreshToken = cookies.get('sb-refresh-token')?.value;
        if (accessToken && refreshToken) {
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
        }

        const { id, imagen_url } = await request.json();

        if (!id) {
            return new Response(JSON.stringify({ error: 'ID requerido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from('establecimiento_fotos')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return new Response(JSON.stringify({ error: deleteError.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Optionally delete from Cloudinary
        if (imagen_url) {
            await deleteFromCloudinary(imagen_url);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete error:', error);
        return new Response(JSON.stringify({ error: 'Error interno' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// Update photo (set as principal, update orden)
export const PATCH: APIRoute = async ({ request, cookies }) => {
    try {
        // Authenticate session for RLS
        const accessToken = cookies.get('sb-access-token')?.value;
        const refreshToken = cookies.get('sb-refresh-token')?.value;
        if (accessToken && refreshToken) {
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
        }

        const { id, establecimiento_id, es_principal, orden, descripcion } = await request.json();

        if (!id) {
            return new Response(JSON.stringify({ error: 'ID requerido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // If setting as principal, unset others first
        if (es_principal && establecimiento_id) {
            await supabase
                .from('establecimiento_fotos')
                .update({ es_principal: false })
                .eq('establecimiento_id', establecimiento_id);
        }

        const updateData: Record<string, unknown> = {};
        if (es_principal !== undefined) updateData.es_principal = es_principal;
        if (orden !== undefined) updateData.orden = orden;
        if (descripcion !== undefined) updateData.descripcion = descripcion;

        const { data, error } = await supabase
            .from('establecimiento_fotos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, foto: data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update error:', error);
        return new Response(JSON.stringify({ error: 'Error interno' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
