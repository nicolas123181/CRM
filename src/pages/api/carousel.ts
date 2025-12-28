import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// Add photo to carousel
export const POST: APIRoute = async ({ request }) => {
    try {
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

        // Use fixed bucket 'Carruseles' with folder path based on establishment name
        const bucketName = 'Carruseles';

        // Generate filename with folder path
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const sanitizedFolder = folderName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, '_');
        const fileName = `${sanitizedFolder}/carousel_${timestamp}.${extension}`;

        // Upload file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            return new Response(JSON.stringify({ error: `Error subiendo: ${uploadError.message}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(uploadData.path);

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
                imagen_url: urlData.publicUrl,
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
export const DELETE: APIRoute = async ({ request }) => {
    try {
        const { id, bucket_name, file_path } = await request.json();

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

        // Optionally delete from storage
        if (bucket_name && file_path) {
            await supabase.storage.from(bucket_name).remove([file_path]);
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
export const PATCH: APIRoute = async ({ request }) => {
    try {
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
