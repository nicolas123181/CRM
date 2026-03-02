import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (runs once on import)
cloudinary.config({
    cloud_name: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'dqfm8t5bw',
    api_key: import.meta.env.PUBLIC_CLOUDINARY_API_KEY || '813288167926566',
    api_secret: import.meta.env.CLOUDINARY_API_SECRET || 'oIoMuDAr-BUaKLcYicNhuKH_LQo'
});

/**
 * Upload a File object to Cloudinary from the server side.
 * @param file - The File object (from FormData)
 * @param folder - The folder/bucket name in Cloudinary (e.g. "PersonajesIlustres", "Historia")
 * @returns The secure URL of the uploaded file
 */
export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = `data:${file.type};base64,${buffer.toString('base64')}`;

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
    const fileName = `${safeName}_${timestamp}`;

    const uploadResult = await cloudinary.uploader.upload(base64Data, {
        public_id: fileName,
        folder: folder,
        resource_type: "auto"
    });

    return uploadResult.secure_url;
}

/**
 * Delete a file from Cloudinary given its URL.
 * Extracts the public_id from the Cloudinary URL.
 * @param url - The Cloudinary URL to delete
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
    try {
        // Extract public_id from URL like: https://res.cloudinary.com/xxx/image/upload/v123/folder/file.jpg
        const parts = url.split('/upload/');
        if (parts.length < 2) return;

        // Remove version prefix (v123456/) and file extension
        let publicId = parts[1].replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');

        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        }
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        // Don't throw - deletion failure shouldn't break the flow
    }
}

export { cloudinary };
