import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      }
    : undefined,
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@itsme.tournament",
      ...options,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    // Don't throw - email failures shouldn't block registration
  }
}

export function generateCheckInEmailHTML(
  teamName: string,
  checkInCode: string,
  tournamentName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #0a0e27; color: #fff; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { font-size: 28px; margin: 0; color: #ff4655; text-transform: uppercase; }
          .content { background: #1a1f3a; border: 1px solid rgba(255,70,85,0.3); border-radius: 8px; padding: 30px; }
          .code-box { background: #0a0e27; border: 2px solid #ff4655; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .code { font-size: 36px; font-weight: bold; color: #ff4655; font-family: monospace; letter-spacing: 4px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          .button { display: inline-block; background: #ff4655; color: #fff; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ITSME Tournament Hub</h1>
          </div>
          
          <div class="content">
            <h2 style="margin-top: 0;">Team Registration Confirmed!</h2>
            
            <p>Hi <strong>${teamName}</strong>,</p>
            
            <p>Your team has been successfully registered for <strong>${tournamentName}</strong>.</p>
            
            <p>Your unique check-in code is:</p>
            
            <div class="code-box">
              <div class="code">${checkInCode}</div>
            </div>
            
            <p style="color: #ff4655; font-weight: bold;">⚠️ IMPORTANT:</p>
            <ul style="color: #aaa; line-height: 1.8;">
              <li>This code is unique to your team</li>
              <li>You'll need it to check in before the tournament starts</li>
              <li>Check-in opens 60 minutes before the tournament</li>
              <li>Save this code - don't share it with other teams</li>
            </ul>
            
            <p>If you have any questions, join our Discord: <a href="https://discord.gg/itsme" style="color: #ff4655;">discord.gg/itsme</a></p>
            
            <p style="margin-bottom: 0;">Good luck! 🎮</p>
          </div>
          
          <div class="footer">
            <p>© 2025 ITSME Tournament Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
