import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: nodemailer.Transporter | null = null;
let isEthereal = false;

// Validate configuration and initialize transporter
const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const hasCredentials = smtpUser && smtpPass && 
    !smtpUser.includes('your_gmail_address') && 
    !smtpPass.includes('your_gmail_app_password');

  if (!hasCredentials) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[EMAIL CONFIG] Missing or placeholder SMTP credentials. Attempting Ethereal Email setup...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        isEthereal = true;
        console.log(`[EMAIL CONFIG] Ethereal test mailer initialized successfully. User: ${testAccount.user}`);
        return transporter;
      } catch (err: any) {
        console.error('[EMAIL CONFIG] Failed to initialize Ethereal test mailer:', err.message);
      }
    } else {
      console.warn('[EMAIL CONFIG] SMTP credentials are not configured. Emails will fail to send in production.');
    }
  }

  // Fallback / standard SMTP config
  transporter = nodemailer.createTransport({
    host: smtpHost || 'smtp.gmail.com',
    port: parseInt(smtpPort || '587'),
    secure: smtpPort === '465',
    auth: {
      user: smtpUser || '',
      pass: smtpPass || '',
    },
  });

  return transporter;
};

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<SendEmailResult> => {
  try {
    const activeTransporter = await getTransporter();
    
    // Determine the sender address safely
    const fromUser = isEthereal 
      ? activeTransporter.options && (activeTransporter.options as any).auth?.user
      : process.env.SMTP_USER || 'no-reply@kootaflow.com';

    const info = await activeTransporter.sendMail({
      from: `"KootaFlow" <${fromUser}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[EMAIL AUDIT] Successfully sent email to: ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} | Subject: "${subject}" | Message ID: ${info.messageId}`);
    
    if (isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EMAIL DEVELOPER] Preview URL: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL AUDIT] Failed to send email to: ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} | Subject: "${subject}" | Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Returns a branded HTML email template for KootaFlow.
 */
export const getBrandedTemplate = (
  title: string,
  bodyMessage: string,
  buttonText?: string,
  buttonUrl?: string
): string => {
  const buttonHtml = buttonText && buttonUrl
    ? `
      <div style="margin: 30px 0; text-align: center;">
        <a href="${buttonUrl}" style="background-color: #0F5132; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
          ${buttonText}
        </a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; color: #1f2937;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <tr>
          <td style="background-color: #0F5132; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em;">KootaFlow</h1>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 600;">${title}</h2>
            <div style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 16px;">
              ${bodyMessage}
            </div>
            ${buttonHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;">This is a security notification from KootaFlow. Please do not reply directly to this email.</p>
            <p style="margin: 8px 0 0 0;">&copy; ${new Date().getFullYear()} KootaFlow. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
