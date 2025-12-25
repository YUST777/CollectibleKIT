import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
// Uses the same config as the Express server (Brevo)
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (!transporter) {
        const smtpServer = process.env.SMTP_SERVER;
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const smtpLogin = process.env.SMTP_LOGIN;
        const smtpPassword = process.env.SMTP_PASSWORD;

        if (!smtpServer || !smtpLogin || !smtpPassword) {
            console.error('❌ Email not configured: Missing SMTP_SERVER, SMTP_LOGIN, or SMTP_PASSWORD');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SMTP')));
            return null;
        }

        console.log(`📧 Creating SMTP transporter: ${smtpServer}:${smtpPort}`);

        transporter = nodemailer.createTransport({
            host: smtpServer,
            port: smtpPort,
            secure: false, // true for 465, false for other ports
            auth: {
                user: smtpLogin,
                pass: smtpPassword,
            },
            // Add timeout to prevent infinite hanging
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000,
            socketTimeout: 10000,
        });
    }
    return transporter;
}

interface SendEmailOptions {
    to: string;
    subject: string;
    text: string; // Plain text only - avoids spam filters
}

export async function sendEmail({ to, subject, text }: SendEmailOptions): Promise<boolean> {
    const mailer = getTransporter();
    if (!mailer) {
        console.error('Email transporter not available');
        return false;
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_LOGIN || 'noreply@icpchue.com';
    const HARD_TIMEOUT = 8000; // 8 seconds hard timeout

    try {

        // Wrap sendMail in a promise race with a timeout
        const sendPromise = mailer.sendMail({
            from: `"ICPC HUE" <${fromEmail}>`,
            to,
            subject,
            text,
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Email sending timed out after 8s')), HARD_TIMEOUT);
        });

        await Promise.race([sendPromise, timeoutPromise]);

        return true;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        return false;
    }
}

// Convenience function for password reset emails
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://icpchue.com';
    const resetLink = `${siteUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const subject = 'Password Reset - ICPC HUE';

    // Simple plain text email to avoid spam filters
    const text = `Hello,

You requested a password reset for your ICPC HUE account.

Click this link to reset your password:
${resetLink}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

---
ICPC HUE Team
https://icpchue.com`;

    return sendEmail({ to: email, subject, text });
}
