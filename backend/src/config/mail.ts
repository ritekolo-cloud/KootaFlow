import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env';
import { logger } from '../utils/logger';

let transporter: Transporter;

export function getMailTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth:
        env.smtp.user && env.smtp.pass
          ? { user: env.smtp.user, pass: env.smtp.pass }
          : undefined,
    });
  }
  return transporter;
}

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  try {
    const transport = getMailTransporter();
    await transport.sendMail({
      from: env.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    // Don't throw — email failures shouldn't crash the app
  }
}

export function welcomeEmailTemplate(name: string, groupName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F7FA; padding: 40px; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="background: #0B1F3A; display: inline-block; padding: 12px 24px; border-radius: 8px;">
          <span style="color: #10B981; font-weight: bold; font-size: 20px;">KootaFlow</span>
        </div>
        <h1 style="color: #0B1F3A; font-size: 22px; margin-top: 16px;">Welcome to KootaFlow VSLA</h1>
      </div>
      <div style="background: #FFFFFF; padding: 24px; border-radius: 6px; border: 1px solid #E2E8F0;">
        <h2 style="color: #0B1F3A; font-size: 18px; margin-top: 0;">Hi ${name},</h2>
        <p style="color: #4A5568; line-height: 1.6;">
          You have been registered as a member of <strong>${groupName}</strong> on the KootaFlow Village Savings and Loan Association platform.
        </p>
        <p style="color: #4A5568; line-height: 1.6;">
          You can now track your savings, share holdings, loan records, and meeting schedules in real time.
        </p>
      </div>
      <p style="color: #718096; font-size: 12px; text-align: center; margin-top: 24px;">KootaFlow — Empowering Community Finance</p>
    </div>`;
}

export function passwordResetEmailTemplate(name: string, link: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F7FA; padding: 40px; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="background: #0B1F3A; display: inline-block; padding: 12px 24px; border-radius: 8px;">
          <span style="color: #10B981; font-weight: bold; font-size: 20px;">KootaFlow</span>
        </div>
        <h1 style="color: #0B1F3A; font-size: 22px; margin-top: 16px;">Password Reset Request</h1>
      </div>
      <div style="background: #FFFFFF; padding: 24px; border-radius: 6px; border: 1px solid #E2E8F0;">
        <h2 style="color: #0B1F3A; font-size: 18px; margin-top: 0;">Hi ${name},</h2>
        <p style="color: #4A5568; line-height: 1.6;">
          We received a request to reset your password for your KootaFlow account.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${link}" style="background: #10B981; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">
            Reset Password
          </a>
        </div>
        <p style="color: #718096; font-size: 13px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
      <p style="color: #718096; font-size: 12px; text-align: center; margin-top: 24px;">KootaFlow — Empowering Community Finance</p>
    </div>`;
}
