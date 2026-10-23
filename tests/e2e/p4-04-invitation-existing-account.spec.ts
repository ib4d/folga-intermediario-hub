import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const requiredEnvironment = [
  "P4_04_BASE_URL",
  "P4_04_DATABASE_URL",
  "P4_04_MAILPIT_API_URL",
] as const;

test("rejects a wrong account and accepts for an existing account without replacing its credentials", async ({ page }) => {
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
  const organization = { id: `org_p404_existing_${fixtureTag}`, slug: `p404-existing-${fixtureTag}` };
  const admin = { id: `usr_p404_existing_admin_${fixtureTag}`, email: `p404-existing-${fixtureTag}-admin@synthetic.example.invalid` };
  const existing = { id: `usr_p404_existing_member_${fixtureTag}`, email: `p404-existing-${fixtureTag}-member@synthetic.example.invalid` };
  const wrong = { id: `usr_p404_existing_wrong_${fixtureTag}`, email: `p404-existing-${fixtureTag}-wrong@synthetic.example.invalid` };
  const adminPassword = `Synthetic-${fixtureTag}-Admin!`;
  const existingPassword = `Synthetic-${fixtureTag}-Account!`;
  const wrongPassword = `Synthetic-${fixtureTag}-Wrong!`;
  const invitationName = "Existing synthetic account";
  const invitationEmail = existing.email;
  const invitationRole = "LEGAL" as const;
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const existingHash = await bcrypt.hash(existingPassword, 12);
  const wrongHash = await bcrypt.hash(wrongPassword, 12);
  let invitationId: string | null = null;

  async function mailCount() {
    const response = await fetch(new URL("/api/v1/messages", mailpitUrl));
    if (!response.ok) throw new Error("Synthetic Mailpit did not answer its local API.");
    const result = await response.json() as { total?: number };
    return result.total ?? -1;
  }

  async function deleteSyntheticMessagesForRecipients(emails: string[]) {
    const response = await fetch(new URL("/api/v1/messages", mailpitUrl));
    if (!response.ok) throw new Error("Could not list synthetic Mailpit messages for cleanup.");
    const result = await response.json() as { messages?: Array<{ ID: string; To: Array<{ Address: string }> }> };
    const ids = (result.messages ?? [])
      .filter((message) => message.To.some((recipient) => emails.includes(recipient.Address)))
      .map((message) => message.ID);
    if (!ids.length) return;
    const deletion = await fetch(new URL("/api/v1/messages", mailpitUrl), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ IDs: ids }),
    });
    if (!deletion.ok) throw new Error("Could not delete the synthetic invitation messages.");
  }

  async function signIn(email: string, password: string) {
    const authResponses: string[] = [];
    const recordAuthResponse = (response: { url(): string; status(): number }) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith("/api/auth/")) authResponses.push(`${url.pathname}:${response.status()}`);
    };
    page.on("response", recordAuthResponse);
    await page.goto(new URL("/login?lang=es", baseUrl).toString());
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator(".public-login-form button[type='submit']").click();
    try {
      await expect.poll(async () => page.evaluate(async () => {
        const response = await fetch("/api/auth/session");
        const session = await response.json() as { user?: { email?: string } } | null;
        return session?.user?.email ?? null;
      }), { timeout: 15_000 }).toBe(email);
    } catch {
      const loginMessage = await page.locator(".public-login-stack").innerText().catch(() => "Login form was not available.");
      page.off("response", recordAuthResponse);
      throw new Error(`Synthetic login did not establish a session at ${new URL(page.url()).pathname}: ${loginMessage}; auth responses: ${authResponses.join(",")}`);
    }
    page.off("response", recordAuthResponse);
  }

  try {
    const org = await prisma.organization.create({
      data: {
        id: organization.id,
        name: "ORI Synthetic Existing Account",
        slug: organization.slug,
        country: "PL",
        plan: "STARTER",
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
        id: existing.id,
        email: existing.email,
        name: "Existing synthetic account",
        passwordHash: existingHash,
        role: "INTERMEDIARIO",
        isActive: true,
        organizationId: null,
        isPlatformAdmin: false,
        settings: { interfaceLanguage: "es" },
      },
    });
    await prisma.user.create({
      data: {
        id: wrong.id,
        email: wrong.email,
        name: "ORI Synthetic Wrong Account",
        passwordHash: wrongHash,
        role: "INTERMEDIARIO",
        isActive: true,
        organizationId: null,
        isPlatformAdmin: false,
        settings: { interfaceLanguage: "es" },
      },
    });

    const initialMailCount = await mailCount();
    const seededAdmin = await prisma.user.findUnique({
      where: { id: admin.id },
      include: { memberships: { select: { organizationId: true, role: true, isActive: true } } },
    });
    expect(seededAdmin?.isActive).toBe(true);
    expect(seededAdmin?.passwordHash ? await bcrypt.compare(adminPassword, seededAdmin.passwordHash) : false).toBe(true);
    expect(seededAdmin?.memberships).toEqual([{ organizationId: org.id, role: "ADMIN", isActive: true }]);
    await signIn(admin.email, adminPassword);
    await page.goto(new URL("/ajustes#team-members", baseUrl).toString());
    const membersPanel = page.getByRole("main").locator("#team-members");
    await expect(membersPanel).toBeVisible();
    await membersPanel.getByRole("button", { name: "Invitar Usuario", exact: true }).click();
    const modal = page.locator(".modal-panel");
    await expect(modal.getByRole("heading", { name: "Invitar Nuevo Usuario" })).toBeVisible();
    await modal.locator('input[name="name"]').fill(invitationName);
    await modal.locator('input[name="email"]').fill(invitationEmail);
    await modal.locator('select[name="emailLanguage"]').selectOption("es");
    await modal.locator('select[name="role"]').selectOption(invitationRole);
    await modal.locator('button[type="submit"]').click();
    await expect.poll(() => prisma.organizationInvitation.count({
      where: { organizationId: org.id, email: invitationEmail, role: invitationRole },
    })).toBe(1);
    await expect.poll(mailCount).toBe(initialMailCount + 1);
    const invitation = await prisma.organizationInvitation.findFirstOrThrow({
      where: { organizationId: org.id, email: invitationEmail },
      select: { id: true, tokenHash: true, createdById: true },
    });
    invitationId = invitation.id;
    expect(invitation.createdById).toBe(admin.id);
    expect(invitation.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const messageListResponse = await fetch(new URL("/api/v1/messages", mailpitUrl));
    if (!messageListResponse.ok) throw new Error("Could not read the synthetic Mailpit message list.");
    const messageList = await messageListResponse.json() as {
      messages?: Array<{ ID: string; To: Array<{ Address: string }> }>;
    };
    const message = messageList.messages?.find((item) => item.To.some((recipient) => recipient.Address === invitationEmail));
    if (!message) throw new Error("Mailpit did not capture the synthetic invitation for the existing account.");
    const detailResponse = await fetch(new URL(`/api/v1/message/${encodeURIComponent(message.ID)}`, mailpitUrl));
    if (!detailResponse.ok) throw new Error("Could not read the synthetic invitation message in Mailpit.");
    const detail = await detailResponse.json() as { Text?: string; HTML?: string };
    const emailBody = `${detail.Text ?? ""}\n${detail.HTML ?? ""}`.replaceAll("&amp;", "&");
    const tokenMatch = emailBody.match(/\/invitations\/accept\?lang=es#token=([A-Za-z0-9_-]{43})/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];
    const tokenHash = createHash("sha256").update(token).digest("hex");
    expect(tokenHash).toBe(invitation.tokenHash);

    await page.context().clearCookies();
    await signIn(wrong.email, wrongPassword);
    const acceptUrl = new URL("/invitations/accept?lang=es", baseUrl);
    acceptUrl.hash = new URLSearchParams({ token }).toString();
    await page.goto(acceptUrl.toString());
    await expect(page.getByRole("alert").getByText("El enlace se envió a otro correo. Cambia de cuenta e inténtalo de nuevo.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceptar y entrar", exact: true })).toHaveCount(0);
    await expect(prisma.organizationInvitation.findUnique({ where: { id: invitation.id }, select: { acceptedAt: true } })).resolves.toMatchObject({ acceptedAt: null });
    expect(await prisma.membership.count({ where: { userId: { in: [existing.id, wrong.id] }, organizationId: org.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "USER_INVITATION_ACCEPTED", entityId: invitation.id } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { email: wrong.email }, select: { id: true, role: true, organizationId: true } })).toEqual({
      id: wrong.id,
      role: "INTERMEDIARIO",
      organizationId: null,
    });

    await page.context().clearCookies();
    await signIn(existing.email, existingPassword);
    const matchingAccountUrl = new URL("/invitations/accept?lang=es", baseUrl);
    matchingAccountUrl.hash = new URLSearchParams({ token }).toString();
    await page.goto(matchingAccountUrl.toString());
    await page.getByRole("button", { name: "Aceptar y entrar", exact: true }).click();
    await expect.poll(() => prisma.organizationInvitation.findUnique({
      where: { id: invitationId! },
      select: { acceptedAt: true },
    }).then((row) => Boolean(row?.acceptedAt))).toBe(true);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/dashboard");

    const [user, membership, audit] = await Promise.all([
      prisma.user.findUnique({
        where: { email: existing.email },
        select: { id: true, name: true, role: true, organizationId: true, passwordHash: true },
      }),
      prisma.membership.findUnique({
        where: { userId_organizationId: { userId: existing.id, organizationId: org.id } },
        select: { role: true, isActive: true },
      }),
      prisma.auditLog.findFirst({
        where: { action: "USER_INVITATION_ACCEPTED", entityType: "OrganizationInvitation", entityId: invitationId },
        select: { userId: true, organizationId: true, details: true },
      }),
    ]);
    expect(await prisma.user.count({ where: { email: existing.email } })).toBe(1);
    expect(user).toMatchObject({
      id: existing.id,
      name: "Existing synthetic account",
      role: invitationRole,
      organizationId: org.id,
    });
    expect(user?.passwordHash).toBeTruthy();
    expect(await bcrypt.compare(existingPassword, user!.passwordHash!)).toBe(true);
    expect(membership).toEqual({ role: invitationRole, isActive: true });
    expect(audit).toMatchObject({ userId: existing.id, organizationId: org.id, details: { email: existing.email, role: invitationRole } });
  } finally {
    try {
      await prisma.$transaction(async (tx) => {
        const invitation = await tx.organizationInvitation.findFirst({
          where: { organizationId: organization.id, email: invitationEmail },
          select: { id: true },
        });
        const ids = invitation ? [invitation.id] : invitationId ? [invitationId] : [];
        await tx.auditLog.deleteMany({
          where: {
            OR: [
              { userId: { in: [admin.id, existing.id, wrong.id] } },
              { organizationId: organization.id },
              { entityType: "OrganizationInvitation", entityId: { in: ids } },
            ],
          },
        });
        await tx.organizationInvitation.deleteMany({ where: { organizationId: organization.id, email: invitationEmail } });
        await tx.membership.deleteMany({ where: { OR: [{ userId: { in: [admin.id, existing.id, wrong.id] } }, { organizationId: organization.id }] } });
        await tx.user.deleteMany({ where: { id: { in: [admin.id, existing.id, wrong.id] } } });
        await tx.organization.deleteMany({ where: { id: organization.id } });
      });
      await deleteSyntheticMessagesForRecipients([existing.email, wrong.email]);
    } finally {
      await prisma.$disconnect();
    }
  }
});
