import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: 'dqfm8t5bw',
    api_key: '813288167926566',
    api_secret: 'oIoMuDAr-BUaKLcYicNhuKH_LQo'
});

const supabaseUrl = 'https://tfloavuqhtbgxepaibnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmbG9hdnVxaHRiZ3hlcGFpYm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjUxNjcsImV4cCI6MjA2OTc0MTE2N30.rvUfJKTLo6Z1R8m3e__Vc6soNDdHTMAv_A-MDh9aCEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateImages() {
    const buckets = ['audioguias', 'Audioguias', 'Augioguias', 'augioguias', 'Audios', 'audios'];

    console.log(`Buscando en ${buckets.length} buckets conocidos de audio...`);

    for (const bucketName of buckets) {
        const { data: files, error } = await supabase.storage.from(bucketName).list();

        if (error || !files) {
            console.log(`No se pudo leer o está vacío el bucket: ${bucketName}`);
            continue;
        }

        if (files.length === 0) continue;

        console.log(`Bucket ${bucketName}: Encontrados ${files.length} archivos.`);

        for (const file of files) {
            if (file.name === '.emptyFolderPlaceholder') continue;

            const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(file.name);

            try {
                console.log(`Migrando: ${file.name} de ${bucketName}`);
                const result = await cloudinary.uploader.upload(publicUrl, {
                    public_id: file.name.split('.')[0],
                    folder: bucketName,
                    resource_type: "auto"
                });
                console.log(`✅ ¡Éxito! Nueva URL: ${result.secure_url}`);
            } catch (err) {
                console.error(`❌ Error con ${file.name}:`, err.message);
            }
        }
    }
}

migrateImages();
