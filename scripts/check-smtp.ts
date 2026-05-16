import "dotenv/config";

import { sendEmail } from "../src/lib/email/sender";

function getRecipient() {
  const recipient = process.argv[2]?.trim();

  if (!recipient) {
    throw new Error("Usage: npm run check:smtp -- recipient@example.com");
  }

  return recipient;
}

async function main() {
  const recipient = getRecipient();
  const result = await sendEmail({
    to: recipient,
    subject: "ORI CRUIT HUB SMTP test",
    body: [
      "This is a production SMTP configuration test from ORI CRUIT HUB.",
      "",
      "If you received this email, SMTP delivery is working.",
    ].join("\n"),
  });

  if (!result.success) {
    console.error("SMTP test failed:", result.error ?? "unknown error");
    process.exit(1);
  }

  console.log("SMTP test sent successfully.");
  console.log(`Message ID: ${result.messageId ?? "not provided"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
