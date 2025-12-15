import { Resend } from 'resend';

const resend = new Resend('re_6UYAsEyr_5Zx3JunehxiZk1Wx15HabQre');

// Brand colors
const colors = {
  primary: '#4F46E5', // Indigo 600
  secondary: '#111827', // Gray 900
  accent: '#DC2626', // Red 600
  background: '#F3F4F6', // Gray 100
  surface: '#FFFFFF',
  text: '#374151', // Gray 700
  textLight: '#6B7280', // Gray 500
};

const emailStyles = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: ${colors.text};
`;

const containerStyle = `
  max-width: 600px;
  margin: 0 auto;
  background-color: ${colors.surface};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

const headerStyle = `
  background-color: ${colors.secondary};
  padding: 24px;
  text-align: center;
`;

const contentStyle = `
  padding: 32px 24px;
`;

const footerStyle = `
  background-color: ${colors.background};
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: ${colors.textLight};
`;

const buttonStyle = `
  display: inline-block;
  background-color: ${colors.primary};
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  margin-top: 20px;
`;

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    console.log(`Attempting to send welcome email to ${email}...`);
    const { data, error } = await resend.emails.send({
      from: 'Shaluqa CRM <onboarding@resend.dev>',
      to: [email],
      subject: '¡Bienvenido a Shaluqa CRM!',
      html: `
        <div style="background-color: ${colors.background}; padding: 40px 0; ${emailStyles}">
          <div style="${containerStyle}">
            <div style="${headerStyle}">
              <h1 style="color: white; margin: 0; font-size: 24px;">Shaluqa CRM</h1>
            </div>
            <div style="${contentStyle}">
              <h2 style="color: ${colors.secondary}; margin-top: 0;">¡Bienvenido, ${name}!</h2>
              <p>Estamos encantados de que te hayas unido a nosotros. Tu cuenta ha sido creada exitosamente.</p>
              <p>Con Shaluqa CRM, ahora tienes el poder de gestionar tus clientes, productos y licencias de manera más eficiente que nunca.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://shaluqa-crm.com/login" style="${buttonStyle}">Ir al Dashboard</a>
              </div>

              <p>Si tienes alguna pregunta o necesitas ayuda para empezar, nuestro equipo de soporte está aquí para ti.</p>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">© ${new Date().getFullYear()} Shaluqa CRM. Todos los derechos reservados.</p>
              <p style="margin: 5px 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Error sending welcome email:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log('✅ Welcome email sent successfully:', data);
    console.warn('⚠️ IMPORTANTE: Si estás en modo Sandbox de Resend, este correo SOLO llegará si el destinatario es tu propio email verificado (el de tu cuenta Resend).');
    return { success: true, data };
  } catch (e) {
    console.error('❌ Exception sending welcome email:', e);
    return { success: false, error: e };
  }
}

export async function sendLicenseExpiryEmail(email: string, clientName: string, productName: string, expiryDate: string) {
  try {
    console.log(`Attempting to send expiry email to ${email}...`);
    const { data, error } = await resend.emails.send({
      from: 'Shaluqa CRM <notifications@resend.dev>',
      to: [email],
      subject: 'Acción Requerida: Su licencia vence pronto',
      html: `
        <div style="background-color: ${colors.background}; padding: 40px 0; ${emailStyles}">
          <div style="${containerStyle}">
            <div style="${headerStyle}">
              <h1 style="color: white; margin: 0; font-size: 24px;">Shaluqa CRM</h1>
            </div>
            <div style="${contentStyle}">
              <h2 style="color: ${colors.secondary}; margin-top: 0;">Aviso de Vencimiento</h2>
              <p>Hola <strong>${clientName}</strong>,</p>
              <p>Esperamos que estés disfrutando de nuestros servicios. Te escribimos para informarte que tu licencia para el producto <strong>${productName}</strong> está próxima a vencer.</p>
              
              <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; color: #991B1B; font-weight: 600;">Fecha de vencimiento: ${expiryDate}</p>
                <p style="margin: 5px 0 0; color: #B91C1C; font-size: 14px;">(En 7 días)</p>
              </div>

              <p style="font-size: 14px; color: ${colors.textLight};">
                Tu licencia está configurada para renovarse automáticamente. Si deseas realizar cambios o cancelar, por favor contáctanos antes de la fecha de vencimiento.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:soporte@shaluqa.com" style="${buttonStyle} background-color: ${colors.secondary};">Contactar Soporte</a>
              </div>
            </div>
            <div style="${footerStyle}">
              <p style="margin: 0;">© ${new Date().getFullYear()} Shaluqa CRM. Todos los derechos reservados.</p>
              <p style="margin: 5px 0 0;">Has recibido este correo porque tienes una licencia activa con nosotros.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Error sending expiry email:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log('✅ Expiry email sent successfully:', data);
    console.warn('⚠️ IMPORTANTE: Si estás en modo Sandbox de Resend, este correo SOLO llegará si el destinatario es tu propio email verificado (el de tu cuenta Resend).');
    return { success: true, data };
  } catch (e) {
    console.error('❌ Exception sending expiry email:', e);
    return { success: false, error: e };
  }
}
