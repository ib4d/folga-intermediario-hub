import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const requiredEnvironment = ["P4_04_BASE_URL", "P4_04_AUTH_BASE_URL", "P4_04_DATABASE_URL", "P4_04_MAILPIT_API_URL"] as const;
type Language = "es" | "en" | "pl";

const labels: Record<Language, {
  inviteButton: string;
  title: string;
  success: (email: string) => string;
  manualDeliveryRequired: string;
  manualDeliveryHelp: string;
}> = {
  es: {
    inviteButton: "Invitar Usuario",
    title: "Invitar Nuevo Usuario",
    success: (email) => `La invitación para ${email} quedó creada, pero no se pudo enviar el correo. Comparte el enlace de aceptación por un canal seguro.`,
    manualDeliveryRequired: "Entrega manual requerida",
    manualDeliveryHelp: "El correo no se pudo enviar. Comparte este enlace de un solo uso por un canal seguro; vence en 7 días.",
  },
  en: {
    inviteButton: "Invite User",
    title: "Invite New User",
    success: (email) => `The invitation for ${email} was created, but the email could not be sent. Share the acceptance link through a secure channel.`,
    manualDeliveryRequired: "Manual delivery required",
    manualDeliveryHelp: "The email could not be sent. Share this single-use link through a secure channel; it expires in 7 days.",
  },
  pl: {
    inviteButton: "Zaproś użytkownika",
    title: "Zaproś nowego użytkownika",
    success: (email) => `Utworzono zaproszenie dla adresu ${email}, ale nie udało się wysłać wiadomości. Przekaż link akceptacyjny bezpiecznym kanałem.`,
    manualDeliveryRequired: "Wymagane ręczne przekazanie zaproszenia",
    manualDeliveryHelp: "Nie udało się wysłać wiadomości. Przekaż ten jednorazowy link bezpiecznym kanałem; wygaśnie za 7 dni.",
  },
};

const languages: Language[] = ["es", "en", "pl"];
const languagePairs = languages.flatMap((interfaceLanguage) =>
  languages.map((emailLanguage) => ({ interfaceLanguage, emailLanguage })),
);

test.describe.configure({ mode: "serial" });
test.use({ ignoreHTTPSErrors: true });

for (const { interfaceLanguage, emailLanguage } of languagePairs) {
  test(`SMTP fallback is localized ${interfaceLanguage.toUpperCase()} UI / ${emailLanguage.toUpperCase()} email`, async ({ page }) => {
    test.skip(
      process.env.P4_04_RUN_MUTATING_E2E !== "1" || requiredEnvironment.some((key) => !process.env[key]),
      "Requires an explicitly enabled local synthetic invitation fixture.",
    );
    test.setTimeout(60_000);

    const baseUrl = new URL(process.env.P4_04_BASE_URL!);
    const authBaseUrl = new URL(process.env.P4_04_AUTH_BASE_URL!);
    const databaseUrl = new URL(process.env.P4_04_DATABASE_URL!);
    const mailpitUrl = new URL(process.env.P4_04_MAILPIT_API_URL!);
    expect(["localhost", "127.0.0.1"]).toContain(baseUrl.hostname);
    expect(["localhost", "127.0.0.1"]).toContain(authBaseUrl.hostname);
    expect(["localhost", "127.0.0.1"]).toContain(databaseUrl.hostname);
    expect(["localhost", "127.0.0.1"]).toContain(mailpitUrl.hostname);

    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
    const fixtureTag = randomUUID().replaceAll("-", "");
    const organizationId = `org_p404_manual_${fixtureTag}`;
    const adminId = `usr_p404_manual_${fixtureTag}`;
    const adminEmail = `p404-manual-admin-${fixtureTag}@synthetic.example.invalid`;
    const inviteEmail = `p404-manual-${interfaceLanguage}-${emailLanguage}-${fixtureTag}@synthetic.example.invalid`;
    const password = `Synthetic-${fixtureTag}-Admin!`;
    let initialRateLimitKeys: string[] = [];

    async function mailMessages() {
      const response = await fetch(new URL("/api/v1/messages", mailpitUrl));
      if (!response.ok) throw new Error("Could not read the synthetic Mailpit message list.");
      return await response.json() as {
        total?: number;
        messages?: Array<{ ID: string; To: Array<{ Address: string }> }>;
      };
    }

    async function deleteSyntheticMessages() {
      const current = await mailMessages();
      const ids = (current.messages ?? [])
        .filter((message) => message.To.some((recipient) => recipient.Address === inviteEmail))
        .map((message) => message.ID);
      if (!ids.length) return;
      const response = await fetch(new URL("/api/v1/messages", mailpitUrl), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IDs: ids }),
      });
      if (!response.ok) throw new Error("Could not remove the synthetic invitation message.");
    }

    try {
      const initialBuckets = await prisma.$queryRaw<Array<{ key: string }>>`
        SELECT "key" FROM "RequestRateLimitBucket"
      `;
      initialRateLimitKeys = initialBuckets.map(({ key }) => key);
      const initialMail = await mailMessages();

      const organization = await prisma.organization.create({
        data: {
          id: organizationId,
          name: `ORI Synthetic Manual ${interfaceLanguage}-${emailLanguage}`,
          slug: `p404-manual-${fixtureTag}`,
          country: "PL",
          plan: "STARTER",
          isActive: true,
        },
      });
      await prisma.user.create({
        data: {
          id: adminId,
          email: adminEmail,
          name: "ORI Synthetic Manual Delivery Admin",
          passwordHash: await bcrypt.hash(password, 12),
          role: "ADMIN",
          isActive: true,
          organizationId: organization.id,
          isPlatformAdmin: false,
          settings: { interfaceLanguage },
        },
      });
      await prisma.membership.create({
        data: { id: `mem_${adminId}`, userId: adminId, organizationId, role: "ADMIN", isActive: true },
      });

      await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.91" });
      await page.goto(new URL(`/login?lang=${interfaceLanguage}`, authBaseUrl).toString());
      await page.locator("#email").fill(adminEmail);
      await page.locator("#password").fill(password);
      await page.locator(".public-login-form button[type='submit']").click();
      await expect.poll(async () => page.evaluate(async () => {
        const response = await fetch("/api/auth/session");
        const session = await response.json() as { user?: { email?: string } } | null;
        return session?.user?.email ?? null;
      }), { timeout: 15_000 }).toBe(adminEmail);

      await page.goto(new URL("/ajustes#team-members", baseUrl).toString());
      const membersPanel = page.getByRole("main").locator("#team-members").first();
      await expect(membersPanel).toBeVisible();
      const inviteButton = membersPanel.getByRole("button", { name: labels[interfaceLanguage].inviteButton, exact: true });
      await expect(inviteButton).toBeVisible();
      await inviteButton.click();
      const modal = page.locator(".modal-panel");
      await expect(modal.getByRole("heading", { name: labels[interfaceLanguage].title })).toBeVisible();
      await modal.locator("#invite-name").fill("ORI Synthetic Manual Target");
      await modal.locator("#invite-email").fill(inviteEmail);
      await modal.locator("#invite-email-language").selectOption(emailLanguage);
      await modal.locator("#invite-role").selectOption("LEGAL");
      await modal.locator("button[type='submit']").click();

      await expect(modal).toContainText(labels[interfaceLanguage].success(inviteEmail));
      await expect(modal).toContainText(labels[interfaceLanguage].manualDeliveryRequired);
      await expect(modal).toContainText(labels[interfaceLanguage].manualDeliveryHelp);

      const manualLink = (await modal.locator("code").innerText()).trim();
      const parsedLink = new URL(manualLink);
      expect(parsedLink.protocol).toBe("https:");
      expect(parsedLink.hostname).toBe("localhost");
      expect(parsedLink.pathname).toBe("/invitations/accept");
      expect(parsedLink.searchParams.get("lang")).toBe(emailLanguage);
      const token = new URLSearchParams(parsedLink.hash.slice(1)).get("token");
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const invitation = await prisma.organizationInvitation.findUniqueOrThrow({
        where: { organizationId_email: { organizationId, email: inviteEmail } },
        select: { id: true, tokenHash: true, role: true, expiresAt: true, acceptedAt: true },
      });
      expect(createHash("sha256").update(token!).digest("hex")).toBe(invitation.tokenHash);
      expect(invitation).toMatchObject({ role: "LEGAL", acceptedAt: null });
      expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(await prisma.auditLog.count({
        where: { organizationId, action: "USER_INVITATION_CREATED", entityId: invitation.id },
      })).toBe(1);
      await expect.poll(async () => (await mailMessages()).total).toBe(initialMail.total ?? 0);
    } finally {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.auditLog.deleteMany({ where: { organizationId } });
          await tx.organizationInvitation.deleteMany({ where: { organizationId } });
          await tx.membership.deleteMany({ where: { organizationId } });
          await tx.user.deleteMany({ where: { id: adminId } });
          await tx.organization.deleteMany({ where: { id: organizationId } });
        });
      } finally {
        try {
          await deleteSyntheticMessages();
        } finally {
          try {
            const remainingBuckets = await prisma.$queryRaw<Array<{ key: string }>>`
              SELECT "key" FROM "RequestRateLimitBucket"
            `;
            const originalKeys = new Set(initialRateLimitKeys);
            for (const { key } of remainingBuckets) {
              if (!originalKeys.has(key)) {
                await prisma.$executeRaw`DELETE FROM "RequestRateLimitBucket" WHERE "key" = ${key}`;
              }
            }
          } finally {
            await prisma.$disconnect();
          }
        }
      }
    }
  });
}
