import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Role } from "@prisma/client";
import { expect, test } from "@playwright/test";

const requiredEnvironment = [
  "P4_04_BASE_URL",
  "P4_04_DATABASE_URL",
  "P4_04_MAILPIT_API_URL",
] as const;

test("enforces invitation roles and rejects incompatible accounts", async ({ page }) => {
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
  const emailPrefix = `p404-roles-${fixtureTag}`;
  const password = `Synthetic-${fixtureTag}-Password!`;
  const passwordHash = await bcrypt.hash(password, 12);
  const organizations = {
    admin: { id: `org_p404_admin_${fixtureTag}`, slug: `p404-admin-${fixtureTag}` },
    superadmin: { id: `org_p404_super_${fixtureTag}`, slug: `p404-super-${fixtureTag}` },
    foreign: { id: `org_p404_foreign_${fixtureTag}`, slug: `p404-foreign-${fixtureTag}` },
  };
  const users = {
    admin: { id: `usr_p404_admin_${fixtureTag}`, email: `${emailPrefix}-admin@synthetic.example.invalid` },
    superadmin: { id: `usr_p404_super_${fixtureTag}`, email: `${emailPrefix}-superadmin@synthetic.example.invalid` },
    member: { id: `usr_p404_member_${fixtureTag}`, email: `${emailPrefix}-member@synthetic.example.invalid` },
    foreign: { id: `usr_p404_foreign_${fixtureTag}`, email: `${emailPrefix}-foreign@synthetic.example.invalid` },
    inactive: { id: `usr_p404_inactive_${fixtureTag}`, email: `${emailPrefix}-inactive@synthetic.example.invalid` },
    platform: { id: `usr_p404_platform_${fixtureTag}`, email: `${emailPrefix}-platform@synthetic.example.invalid` },
  };
  const deniedEmails = [users.member.email, users.foreign.email, users.inactive.email, users.platform.email];
  const forgedEmails = [
    `${emailPrefix}-forged-admin@synthetic.example.invalid`,
    `${emailPrefix}-forged-superadmin@synthetic.example.invalid`,
  ];
  const issuedEmails = [
    `${emailPrefix}-intermediario@synthetic.example.invalid`,
    `${emailPrefix}-legal@synthetic.example.invalid`,
    `${emailPrefix}-logistica@synthetic.example.invalid`,
    `${emailPrefix}-admin-role@synthetic.example.invalid`,
  ];
  const allFixtureEmails = [...deniedEmails, ...issuedEmails, ...forgedEmails];
  const roleByEmail = new Map<string, Role>([
    [issuedEmails[0], "INTERMEDIARIO"],
    [issuedEmails[1], "LEGAL"],
    [issuedEmails[2], "LOGISTICA"],
    [issuedEmails[3], "ADMIN"],
  ]);

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

  async function signIn(email: string) {
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
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).not.toBe("/login");
    } catch {
      const loginMessage = await page.locator(".public-login-stack").innerText().catch(() => "Login form was not available.");
      page.off("response", recordAuthResponse);
      throw new Error(`Synthetic login did not establish a session: ${loginMessage}; auth responses: ${authResponses.join(",")}`);
    }
    page.off("response", recordAuthResponse);
    await page.goto(new URL("/dashboard", baseUrl).toString());
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await page.goto(new URL("/ajustes#team-members", baseUrl).toString());
    await expect(page.getByRole("main").locator("#team-members")).toBeVisible();
  }

  async function openInviteModal() {
    await page.getByRole("button", { name: "Invitar Usuario", exact: true }).click();
    const modal = page.locator(".modal-panel");
    await expect(modal.getByRole("heading", { name: "Invitar Nuevo Usuario" })).toBeVisible();
    return modal;
  }

  async function submitInvite(modal: ReturnType<typeof page.locator>, email: string, role: string, name: string) {
    await modal.locator('input[name="name"]').fill(name);
    await modal.locator('input[name="email"]').fill(email);
    await modal.locator('select[name="role"]').selectOption(role);
    await modal.locator('button[type="submit"]').click();
  }

  try {
    await prisma.$transaction(async (tx) => {
      const adminOrg = await tx.organization.create({
        data: { id: organizations.admin.id, name: "ORI Synthetic Role Test — ADMIN", slug: organizations.admin.slug, country: "PL", plan: "STARTER", isActive: true },
      });
      const superadminOrg = await tx.organization.create({
        data: { id: organizations.superadmin.id, name: "ORI Synthetic Role Test — SUPERADMIN", slug: organizations.superadmin.slug, country: "PL", plan: "STARTER", isActive: true },
      });
      const foreignOrg = await tx.organization.create({
        data: { id: organizations.foreign.id, name: "ORI Synthetic Role Test — Foreign", slug: organizations.foreign.slug, country: "PL", plan: "STARTER", isActive: true },
      });
      const actorSpecs = [
        { ...users.admin, role: "ADMIN" as const, organizationId: adminOrg.id, isPlatformAdmin: false },
        { ...users.superadmin, role: "SUPERADMIN" as const, organizationId: superadminOrg.id, isPlatformAdmin: false },
        { ...users.member, role: "INTERMEDIARIO" as const, organizationId: adminOrg.id, isPlatformAdmin: false },
        { ...users.foreign, role: "INTERMEDIARIO" as const, organizationId: foreignOrg.id, isPlatformAdmin: false },
        { ...users.inactive, role: "INTERMEDIARIO" as const, organizationId: null, isPlatformAdmin: false, isActive: false },
        { ...users.platform, role: "SUPERADMIN" as const, organizationId: null, isPlatformAdmin: true },
      ];
      for (const spec of actorSpecs) {
        const user = await tx.user.create({
          data: {
            id: spec.id,
            email: spec.email,
            name: "ORI Synthetic Role Test",
            passwordHash,
            role: spec.role,
            isActive: "isActive" in spec ? spec.isActive : true,
            isPlatformAdmin: spec.isPlatformAdmin,
            organizationId: spec.organizationId,
            settings: { interfaceLanguage: "es" },
          },
        });
        if (user.id === users.admin.id || user.id === users.superadmin.id || user.id === users.member.id || user.id === users.foreign.id) {
          const organizationId = user.id === users.admin.id || user.id === users.member.id
            ? adminOrg.id
            : user.id === users.superadmin.id ? superadminOrg.id : foreignOrg.id;
          await tx.membership.create({
            data: {
              id: `mem_${user.id}`,
              userId: user.id,
              organizationId,
              role: user.role,
              isActive: true,
            },
          });
        }
      }
    });

    const initialMailCount = await mailCount();

    await signIn(users.admin.email);
    const adminModal = await openInviteModal();
    const adminRoleSelect = adminModal.locator('select[name="role"]');
    const adminRoles = await adminRoleSelect.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    expect(adminRoles).toEqual(["INTERMEDIARIO", "LEGAL", "LOGISTICA"]);

    await adminRoleSelect.evaluate((element) => {
      const option = document.createElement("option");
      option.value = "ADMIN";
      option.textContent = "ADMIN";
      (element as HTMLSelectElement).append(option);
    });
    await submitInvite(adminModal, forgedEmails[0], "ADMIN", "Forged ADMIN role");
    await expect(adminModal.getByText("No puedes asignar ese rol desde tu nivel de acceso.", { exact: true })).toBeVisible();

    const deniedMessages = [
      "Ese correo ya tiene acceso a esta organización.",
      "Ese correo ya pertenece a otra organización y no puede añadirse como miembro aquí.",
      "Esta cuenta está desactivada. Un administrador debe revisar su estado antes de invitarla.",
      "No se puede invitar una cuenta de administración global a una organización.",
    ];
    for (let index = 0; index < deniedEmails.length; index += 1) {
      await submitInvite(adminModal, deniedEmails[index], "INTERMEDIARIO", `Rejected account ${index + 1}`);
      await expect(adminModal.getByText(deniedMessages[index], { exact: true })).toBeVisible();
    }

    const deniedInvitations = await prisma.organizationInvitation.count({ where: { email: { in: [...deniedEmails, ...forgedEmails] } } });
    expect(deniedInvitations).toBe(0);
    expect(await mailCount()).toBe(initialMailCount);

    for (const [index, role] of (["INTERMEDIARIO", "LEGAL", "LOGISTICA"] as const).entries()) {
      await submitInvite(adminModal, issuedEmails[index], role, `Allowed ${role}`);
      await expect.poll(() => prisma.organizationInvitation.count({ where: { email: issuedEmails[index], organizationId: organizations.admin.id } })).toBe(1);
      await expect.poll(mailCount).toBe(initialMailCount + index + 1);
    }

    const adminInvitations = await prisma.organizationInvitation.findMany({
      where: { organizationId: organizations.admin.id, email: { in: issuedEmails.slice(0, 3) } },
      select: { email: true, role: true, createdById: true, id: true },
    });
    expect(adminInvitations).toHaveLength(3);
    for (const invitation of adminInvitations) {
      expect(invitation.role).toBe(roleByEmail.get(invitation.email));
      expect(invitation.createdById).toBe(users.admin.id);
    }

    await page.context().clearCookies();
    await signIn(users.superadmin.email);
    const superadminModal = await openInviteModal();
    const superadminRoleSelect = superadminModal.locator('select[name="role"]');
    const superadminRoles = await superadminRoleSelect.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    expect(superadminRoles).toEqual(["INTERMEDIARIO", "LEGAL", "LOGISTICA", "ADMIN"]);

    await superadminRoleSelect.evaluate((element) => {
      const option = document.createElement("option");
      option.value = "SUPERADMIN";
      option.textContent = "SUPERADMIN";
      (element as HTMLSelectElement).append(option);
    });
    await submitInvite(superadminModal, forgedEmails[1], "SUPERADMIN", "Forged SUPERADMIN role");
    await expect(superadminModal.getByText("Revisa el nombre, el correo y el rol. El nombre debe tener entre 2 y 100 caracteres.", { exact: true })).toBeVisible();
    await submitInvite(superadminModal, issuedEmails[3], "ADMIN", "Allowed ADMIN");
    await expect.poll(() => prisma.organizationInvitation.count({ where: { email: issuedEmails[3], organizationId: organizations.superadmin.id } })).toBe(1);
    await expect.poll(mailCount).toBe(initialMailCount + 4);

    const invitations = await prisma.organizationInvitation.findMany({
      where: { email: { in: issuedEmails } },
      select: { id: true, email: true, role: true, organizationId: true, createdById: true },
    });
    expect(invitations).toHaveLength(4);
    const invitationIds = invitations.map((invitation) => invitation.id);
    const audits = await prisma.auditLog.findMany({
      where: { entityType: "OrganizationInvitation", entityId: { in: invitationIds } },
      select: { userId: true, organizationId: true, details: true },
    });
    expect(audits).toHaveLength(4);
    for (const audit of audits) {
      const belongsToAdmin = audit.organizationId === organizations.admin.id;
      expect(audit.userId).toBe(belongsToAdmin ? users.admin.id : users.superadmin.id);
      expect([organizations.admin.id, organizations.superadmin.id]).toContain(audit.organizationId);
      expect(JSON.stringify(audit.details)).not.toMatch(/token|inviteUrl|#token=|https?:\/\//i);
    }

    expect(invitations.map(({ email }) => roleByEmail.get(email)).sort()).toEqual(["ADMIN", "INTERMEDIARIO", "LEGAL", "LOGISTICA"]);
    expect(await prisma.organizationInvitation.count({ where: { email: { in: [...deniedEmails, ...forgedEmails] } } })).toBe(0);
  } finally {
    try {
      await prisma.$transaction(async (tx) => {
        const fixtureInvitations = await tx.organizationInvitation.findMany({
          where: { email: { in: allFixtureEmails } },
          select: { id: true },
        });
        await tx.auditLog.deleteMany({
          where: {
            OR: [
              { userId: { in: Object.values(users).map((user) => user.id) } },
              { organizationId: { in: Object.values(organizations).map((organization) => organization.id) } },
              { entityType: "OrganizationInvitation", entityId: { in: fixtureInvitations.map((invitation) => invitation.id) } },
            ],
          },
        });
        await tx.organizationInvitation.deleteMany({ where: { email: { in: allFixtureEmails } } });
        await tx.membership.deleteMany({
          where: {
            OR: [
              { userId: { in: Object.values(users).map((user) => user.id) } },
              { organizationId: { in: Object.values(organizations).map((organization) => organization.id) } },
            ],
          },
        });
        await tx.user.deleteMany({ where: { id: { in: Object.values(users).map((user) => user.id) } } });
        await tx.organization.deleteMany({ where: { id: { in: Object.values(organizations).map((organization) => organization.id) } } });
      });
      await deleteSyntheticMessagesForRecipients(allFixtureEmails);
    } finally {
      await prisma.$disconnect();
    }
  }
});
