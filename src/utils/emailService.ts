import nodemailer from 'nodemailer';

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw { statusCode: 500, message: 'Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env' };
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export const sendLoginOtpEmail = async (to: string, otp: string, name: string) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"CRM Login" <${from}>`,
    to,
    subject: 'Employee Login Request - OTP for Approval',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#4f46e5;margin:0 0 12px;">Login Verification</h2>
        <p style="color:#374151;">Hi Admin,</p>
        <p style="color:#374151;">Your employee <strong>${name}</strong> wants to login to the CRM system.</p>
        <p style="color:#374151;">Please share this one-time password with them if you approve the login. If you do not want them to login, you can ignore this email.</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;background:#f3f4f6;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0;">${otp}</div>
        <p style="color:#6b7280;font-size:13px;">This code expires in ${process.env.OTP_EXPIRY_MINUTES || '10'} minutes. Do not share it with anyone except the approved employee.</p>
        <p style="color:#6b7280;font-size:13px;">Thank you.</p>
      </div>
    `,
  });
};

export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
};
