import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { sendLicenseExpiryEmail } from '../../../lib/email';

export const GET: APIRoute = async () => {
    try {
        // Calculate date 7 days from now
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 7);

        // Format as YYYY-MM-DD for comparison with Supabase date column
        const targetDateStr = targetDate.toISOString().split('T')[0];

        console.log(`📅 Cron Job Running. Checking for licenses expiring exactly on: ${targetDateStr} (7 days from now)`);

        // Query licenses expiring in 7 days
        // We also fetch client details (email, name) and product details (name)
        const { data: licenses, error } = await supabase
            .from('licenses')
            .select(`
        *,
        clients (name, email),
        products (name)
      `)
            .eq('end_date', targetDateStr)
            .eq('status', 'activa'); // Only notify for active licenses

        if (error) {
            console.error('Error fetching licenses:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        if (!licenses || licenses.length === 0) {
            console.log('No licenses found expiring on this date.');
            return new Response(JSON.stringify({ message: 'No licenses expiring in 7 days found.' }), { status: 200 });
        }

        console.log(`Found ${licenses.length} expiring licenses.`);

        const results = [];
        const todayStr = new Date().toISOString().split('T')[0];

        for (const license of licenses) {
            // Check if we already sent a notification today (if the column exists)
            // Note: This assumes the user has added the 'last_notification_date' column.
            // If not, we might send duplicates if the dashboard is refreshed multiple times.
            // To be safe, we check if the property exists and matches today.
            if (license.last_notification_date && license.last_notification_date === todayStr) {
                console.log(`Skipping license ${license.id}, notification already sent today.`);
                results.push({ licenseId: license.id, status: 'skipped', reason: 'already_sent' });
                continue;
            }

            const clientEmail = license.clients?.email;
            const clientName = license.clients?.name || 'Cliente';
            const productName = license.products?.name || 'Producto';
            const expiryDate = new Date(license.end_date).toLocaleDateString('es-ES');

            if (clientEmail) {
                const result = await sendLicenseExpiryEmail(clientEmail, clientName, productName, expiryDate);

                if (result.success) {
                    // Try to update the last_notification_date
                    const { error: updateError } = await supabase
                        .from('licenses')
                        .update({ last_notification_date: todayStr })
                        .eq('id', license.id);

                    if (updateError) {
                        console.warn(`Could not update last_notification_date for license ${license.id}. User might need to add the column.`);
                    }
                }

                results.push({ licenseId: license.id, email: clientEmail, success: result.success });
            } else {
                console.warn(`License ${license.id} has no client email.`);
                results.push({ licenseId: license.id, error: 'No client email' });
            }
        }

        return new Response(JSON.stringify({
            message: `Processed ${licenses.length} licenses.`,
            results
        }), { status: 200 });

    } catch (e) {
        console.error('Unexpected error in cron job:', e);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
