import { env } from "../../env.js";
import { sendSmtpMessage } from "./smtp-client.js";

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASS);
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    await sendSmtpMessage({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
      from: env.SMTP_FROM,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP send failed";
    return { sent: false, reason: message };
  }
}
