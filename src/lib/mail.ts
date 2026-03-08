import nodemailer from "nodemailer";

const buildTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  name?: string;
  otp: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!from) {
    throw new Error("SMTP_FROM is not configured.");
  }

  const transport = buildTransport();
  const { to, name, otp } = params;

  const subject = "Your CineWave password reset code";
  const text = `Hi${name ? ` ${name}` : ""},\n\nYour password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`;

  await transport.sendMail({
    from,
    to,
    subject,
    text,
  });
}
