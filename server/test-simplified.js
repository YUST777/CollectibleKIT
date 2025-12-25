import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 587,
    secure: false,
    auth: {
        user: 'noreply@icpchue.xyz',
        pass: 'StrongServerPass123!',
    },
    tls: { rejectUnauthorized: false }
});

async function main() {
    console.log("Sending SIMPLIFIED email (Text + HTML)...");

    const resetLink = "https://example.com/reset";

    try {
        const info = await transporter.sendMail({
            from: '"ICPC HUE" <noreply@icpchue.xyz>',
            to: "8241043@horus.edu.eg",
            subject: "Test: Simplified Reset Password",
            // EXACT STRUCTURE FROM CODE
            text: `Hello,\n\nYou requested a password reset for your ICPC HUE account.\n\nPlease click the link below to reset your password:\n${resetLink}\n\nThis link expires in 24 hours.\n\nIf you did not request this, please ignore this email.\n`,
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #333333; text-align: center;">Reset Your Password</h2>
  <p style="color: #555555; font-size: 16px;">Hello,</p>
  <p style="color: #555555; font-size: 16px;">Test of the new simplified format.</p>
</div>
`
        });
        console.log("Sent: %s", info.messageId);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
