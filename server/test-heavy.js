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

const glassyTemplate = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #000; color: white; font-family: sans-serif; }
  .glass {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 20px;
    border-radius: 15px;
    margin: 20px auto;
    max-width: 600px;
  }
  .logo { font-size: 24px; color: gold; text-align: center; margin-bottom: 20px; }
</style>
</head>
<body>
  <div class="glass">
    <div class="logo">
      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <br>ICPC HUE
    </div>
    <h1>Your OTP Code</h1>
    <p>Here is your verification code:</p>
    <div style="font-size: 32px; letter-spacing: 5px; text-align: center; font-weight: bold; color: #fff;">123456</div>
    <p>Please do not share this code.</p>
    <!-- Adding bulk to simulate "huge" size -->
    <div style="display:none">
      ${"LORUM IPSUM ".repeat(1000)}
    </div>
  </div>
</body>
</html>
`;

async function main() {
    console.log("Sending HEAVY/GLASSY email...");
    try {
        const info = await transporter.sendMail({
            from: '"ICPC HUE" <noreply@icpchue.xyz>',
            to: "8241043@horus.edu.eg",
            subject: "Test: Heavy Glassy Email",
            html: glassyTemplate,
            // INTENTIONALLY OMITTING TEXT PART to simulate user's likely issue
        });
        console.log("Sent: %s", info.messageId);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
