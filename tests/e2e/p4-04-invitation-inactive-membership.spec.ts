import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const requiredEnvironment = [
  "P4_04_BASE_URL",
  "P4_04_DATABASE_URL",
  "P4_04_MAILPIT_API_URL",
] as const;

test("reauthenticates an existing account and reactivates only its invited membership", async ({ page }) => {
  test.skip(
    process.env.P4_04_RUN_MUTATING_E2E !== "1" || requiredEnvironment.some((key) => !process.env[key]),
    "Requires an explicitly enabled local synthetic invitation fixture.",
  );
  test.setTimeout(120_000);

  const baseUrl = new URL(process.env.P4_04_BASE_URL!);
  const databaseUrl = new URL(process.env.P4_04_DATABASE_URL!);
  const mailpitUrl = new URL(process.env.P4_04_MAILPIT_API_URL!);
  expect(["localhost", "127.0.0.1"]).toContain(baseUrl.hostname);
  expect(["localhost", "127.0.0.1"]).toContain(databaseUrl.hostname);
  expect(["localhost", "127.0.0.1"]).toContain(mailpitUrl.hostname);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  const fixtureTag = randomUUID().replaceAll("-", "");
  // A TEST-NET address keeps this localhost-only E2E from consuming the shared auth budget.
  const syntheticClientIp = `198.51.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": syntheticClientIp });
  const organization = { id: `org_p404_inactive_${fixtureTag}`, slug: `p404-inactive-${fixtureTag}` };
  const admin = { id: `usr_p404_inactive_admin_${fixtureTag}`, email: `p404-inactive-${fixtureTag}-admin@synthetic.example.invalid` };
  const target = { id: `usr_p404_inactive_target_${fixtureTag}`, email: `p404-inactive-${fixtureTag}-target@synthetic.example.invalid` };
  const adminPassword = `Synthetic-${fixtureTag}-Admin!`;
  const targetPassword = `Synthetic-${fixtureTag}-Existing!`;
  const invitationRole = "LEGAL" as const;
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const targetHash = await bcrypt.hash(targetPassword, 12);
  let invitationId: string | null = null;
  let mailMessageId: string | null = null;

  async function mailCount() {
    const response = await fetch(new URL("/api/v1/messages", mailpitUrl));
    if (!response.ok) throw new Error("Synthetic Mailpit did not answer its local API.");
    const result = await response.json() as { total?: number };
    return result.total ?? -1;
  }

  async function signIn(email: string, password: string) {
    await page.goto(new URL("/login?lang=es", baseUrl).toString());
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator(".public-login-form button[type='submit']").click();
    await expect.poll(async () => page.evaluate(async () => {
      const response = await fetch("/api/auth/session");
      const session = await response.json() as { user?: { email?: string } } | null;
      return session?.user?.email ?? null;
    }), { timeout: 15_000 }).toBe(email);
  }

  try {
    const healthResponse = await fetch(new URL("/api/health", baseUrl));
    expect(healthResponse.status).toBe(200);
    const initialMailCount = await mailCount();

    const org = await prisma.organization.create({
      data: {
        id: organization.id,
        name: "ORI Synthetic Inactive Membership",
        slug: organization.slug,
        country: "PL",
        plan: "BUSINESS",
        isActive: true,
      },
    });
    await prisma.user.create({
      data: {
        id: admin.id,
        email: admin.email,
        name: "ORI Synthetic Invitation Admin",
        passwordHash: adminHash,
        role: "ADMIN",
        isActive: true,
        organizationId: org.id,
        isPlatformAdmin: false,
        settings: { interfaceLanguage: "es" },
      },
    });
    await prisma.membership.create({
      data: { id: `mem_${admin.id}`, userId: admin.id, organizationId: org.id, role: "ADMIN", isActive: true },
    });
    await prisma.user.create({
      data: {
        id: target.id,
        email: target.email,
        name: "ORI Synthetic Existing Member",
        passwordHash: targetHash,
        role: "LOGISTICA",
        isActive: true,
        organizationId: org.id,
        isPlatformAdmin: false,
        settings: { interfaceLanguage: "es" },
      },
    });
    await prisma.membership.create({
      data: { id: `mem_${target.id}`, userId: target.id, organizationId: org.id, role: "LOGISTICA", isActive: false },
    });

    await signIn(admin.email, adminPassword);
    await page.goto(new URL("/ajustes#team-members", baseUrl).toString());
    const membersPanel = page.getByRole("main").locator("#team-members");
    await expect(membersPanel).toBeVisible();
    await membersPanel.getByRole("button", { name: "Invitar Usuario", exact: true }).click();
    const modal = page.locator(".modal-panel");
    await expect(modal.getByRole("heading", { name: "Invitar Nuevo Usuario" })).toBeVisible();
    await modal.locator('input[name="name"]').fill("ORI Synthetic Existing Member");
    await modal.locator('input[name="email"]').fill(target.email);
    await modal.locator('select[name="emailLanguage"]').selectOption("es");
    await modal.locator('select[name="role"]').selectOption(invitationRole);
    await modal.locator('button[type="submit"]').click();

    await expect.poll(() => prisma.organizationInvitation.count({
      where: { organizationId: org.id, email: target.email, role: invitationRole },
    })).toBe(1);
    await expect.poll(mailCount).toBe(initialMailCount + 1);

    const invitation = await prisma.organizationInvitation.findFirstOrThrow({
      where: { organizationId: org.id, email: target.email },
      select: { id: true, tokenHash: true, createdById: true },
    });
    invitationId = invitation.id;
    expect(invitation.createdById).toBe(admin.id);

    const messagesResponse = await fetch(new URL("/api/v1/messages", mailpitUrl));
    if (!messagesResponse.ok) throw new Error("Could not read the synthetic Mailpit message list.");
    const messages = await messagesResponse.json() as { messages?: Array<{ ID: string; To: Array<{ Address: string }> }> };
    const message = messages.messages?.find((item) => item.To.some((recipient) => recipient.Address === target.email));
    if (!message) throw new Error("Mailpit did not capture the synthetic invitation.");
    mailMessageId = message.ID;
    const detailResponse = await fetch(new URL(`/api/v1/message/${encodeURIComponent(message.ID)}`, mailpitUrl));
    if (!detailResponse.ok) throw new Error("Could not read the synthetic invitation message.");
    const detail = await detailResponse.json() as { Text?: string; HTML?: string };
    const emailBody = `${detail.Text ?? ""}\n${detail.HTML ?? ""}`.replaceAll("&amp;", "&");
    const tokenMatch = emailBody.match(/\/invitations\/accept\?lang=es#token=([A-Za-z0-9_-]{43})/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];
    expect(createHash("sha256").update(token).digest("hex")).toBe(invitation.tokenHash);

    await page.context().clearCookies();
    const acceptUrl = new URL("/invitations/accept?lang=es", baseUrl);
    acceptUrl.hash = new URLSearchParams({ token }).toString();
    await page.goto(acceptUrl.toString());
    await expect(page.getByText("Confirma la contraseña actual de tu cuenta para añadir esta organización. Solo se reactivará el acceso a esta organización.", { exact: true })).toBeVisible();
    const passwordField = page.locator("#invite-existing-password");
    await expect(passwordField).toBeVisible();
    await passwordField.fill(`Wrong-${fixtureTag}!`);
    await page.getByRole("button", { name: "Aceptar y entrar", exact: true }).click();
    await expect(page.getByRole("alert").getByText("La contraseña no coincide con la cuenta invitada.", { exact: true })).toBeVisible();
    await expect(prisma.organizationInvitation.findUnique({ where: { id: invitation.id }, select: { acceptedAt: true } })).resolves.toMatchObject({ acceptedAt: null });
    await expect(prisma.membership.findUnique({
      where: { userId_organizationId: { userId: target.id, organizationId: org.id } },
      select: { role: true, isActive: true },
    })).resolves.toEqual({ role: "LOGISTICA", isActive: false });
    await expect(prisma.auditLog.count({ where: { action: "USER_INVITATION_ACCEPTED", entityId: invitation.id } })).resolves.toBe(0);

    await passwordField.fill(targetPassword);
    await page.getByRole("button", { name: "Aceptar y entrar", exact: true }).click();
    await expect.poll(() => prisma.organizationInvitation.findUnique({
      where: { id: invitation.id },
      select: { acceptedAt: true },
    }).then((row) => Boolean(row?.acceptedAt))).toBe(true);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/dashboard");

    const [user, membership, audit, acceptanceAuditCount] = await Promise.all([
      prisma.user.findUnique({
        where: { email: target.email },
        select: { id: true, name: true, role: true, organizationId: true, isActive: true, passwordHash: true },
      }),
      prisma.membership.findUnique({
        where: { userId_organizationId: { userId: target.id, organizationId: org.id } },
        select: { role: true, isActive: true },
      }),
      prisma.auditLog.findFirst({
        where: { action: "USER_INVITATION_ACCEPTED", entityType: "OrganizationInvitation", entityId: invitation.id },
        select: { userId: true, organizationId: true, details: true },
      }),
      prisma.auditLog.count({ where: { action: "USER_INVITATION_ACCEPTED", entityId: invitation.id } }),
    ]);
    expect(user).toMatchObject({
      id: target.id,
      name: "ORI Synthetic Existing Member",
      role: invitationRole,
      organizationId: org.id,
      isActive: true,
    });
    expect(user?.passwordHash).toBeTruthy();
    expect(await bcrypt.compare(targetPassword, user!.passwordHash!)).toBe(true);
    expect(membership).toEqual({ role: invitationRole, isActive: true });
    expect(audit).toMatchObject({ userId: target.id, organizationId: org.id, details: { email: target.email, role: invitationRole } });
    expect(acceptanceAuditCount).toBe(1);
    await expect(page.evaluate(async () => {
      const response = await fetch("/api/auth/session");
      return (await response.json() as { user?: { email?: string } }).user?.email;
    })).resolves.toBe(target.email);
  } finally {
    try {
      await prisma.$transaction(async (tx) => {
        const invitation = await tx.organizationInvitation.findFirst({
          where: { organizationId: organization.id, email: target.email },
          select: { id: true },
        });
        const inviteIds = invitation ? [invitation.id] : invitationId ? [invitationId] : [];
        await tx.auditLog.deleteMany({
          where: {
            OR: [
              { userId: { in: [admin.id, target.id] } },
              { organizationId: organization.id },
              { entityType: "OrganizationInvitation", entityId: { in: inviteIds } },
            ],
          },
        });
        await tx.organizationInvitation.deleteMany({ where: { organizationId: organization.id, email: target.email } });
        await tx.membership.deleteMany({ where: { OR: [{ userId: { in: [admin.id, target.id] } }, { organizationId: organization.id }] } });
        await tx.user.deleteMany({ where: { id: { in: [admin.id, target.id] } } });
        await tx.organization.deleteMany({ where: { id: organization.id } });
      });

      if (mailMessageId) {
        const deleteMessage = await fetch(new URL("/api/v1/messages", mailpitUrl), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ IDs: [mailMessageId] }),
        });
        if (!deleteMessage.ok) {
          throw new Error("Could not remove the synthetic invitation from Mailpit.");
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
