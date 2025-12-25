import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'noreply@icpchue.xyz',
        pass: 'StrongServerPass123!',
    },
    tls: {
        rejectUnauthorized: false // Accept self-signed certs locally
    }
});

async function main() {
    console.log("Attempting to send email...");
    const info = await transporter.sendMail({
        from: '"ICPC Hue System" <noreply@icpchue.xyz>',
        to: "8241043@horus.edu.eg",
        subject: "Test Email from Self-Hosted Server",
        text: "Hello, this is a test email from your self-hosted mail server on icpchue.xyz. If you see this, DKIM/SPF and connectivity are likely working!",
        html: "<b>Hello</b>, this is a test email from your self-hosted mail server on <i>icpchue.xyz</i>.<br>If you see this, DKIM/SPF and connectivity are likely working!",
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Response: %s", info.response);
}

main().catch(console.error);
