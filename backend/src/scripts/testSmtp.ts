/**
 * Verify SMTP mailbox config — sends a test message to BETA_REQUEST_NOTIFY_TO.
 *
 *   pnpm --filter @esti/backend exec tsx src/scripts/testSmtp.ts
 *   docker compose -f compose.prod.yaml exec backend node dist/scripts/testSmtp.js
 */
import { sendMail, isSmtpConfigured } from "../lib/mail/transport.js";
import { env } from "../env.js";

async function main(): Promise<void> {
  if (!isSmtpConfigured()) {
    console.error("SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env");
    process.exit(1);
  }

  const to = env.BETA_REQUEST_NOTIFY_TO;
  const result = await sendMail({
    to,
    subject: "[AORMS] SMTP test — beta form mail",
    text: "If you received this, the landing beta form can email hi@aorms.in correctly.",
    html: "<p>If you received this, the landing beta form can email <strong>hi@aorms.in</strong> correctly.</p>",
  });

  if (!result.sent) {
    console.error("Send failed:", result.reason ?? "unknown");
    process.exit(1);
  }

  console.log(`✓ test message sent to ${to}`);
}

main().catch((err) => {
  console.error("SMTP test failed:", err);
  process.exit(1);
});
