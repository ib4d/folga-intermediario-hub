import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const requiredEnvironment = [
  "P4_04_BASE_URL",
  "P4_04_EXPECTED_ORG_ID",
  "P4_04_ATTACK_ORG_ID",
  "P4_04_DATABASE_URL",
] as const;

test("ignores client supplied role and organization when accepting an invitation", async ({ page }) => {
  test.skip(
    process.env.P4_04_RUN_MUTATING_E2E !== "1" || requiredEnvironment.some((key) => !process.env[key]),
    "Requires an explicitly enabled local synthetic invitation fixture.",
  );
  test.setTimeout(60_000);

  const baseUrl = new URL(process.env.P4_04_BASE_URL!);
  const databaseUrl = new URL(process.env.P4_04_DATABASE_URL!);
  const expectedOrganizationId = process.env.P4_04_EXPECTED_ORG_ID!;
  const attackOrganizationId = process.env.P4_04_ATTACK_ORG_ID!;
  const email = `p4-04-tamper-${randomUUID()}@synthetic.example.invalid`;
  const fullName = "ORI Synthetic Invitation Fixture";
  const password = randomBytes(24).toString("base64url");
  const invitedRole = "LEGAL";

  expect(["localhost", "127.0.0.1"]).toContain(baseUrl.hostname);
  expect(["localhost", "127.0.0.1"]).toContain(databaseUrl.hostname);
  expect(attackOrganizationId).not.toBe(expectedOrganizationId);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  let fixtureInvitationId: string | null = null;

  try {
    const healthResponse = await fetch(new URL("/api/health", baseUrl), {
      signal: AbortSignal.timeout(4_000),
    });
    expect(healthResponse.status).toBe(200);

    const organizations = await prisma.organization.findMany({
      where: { id: { in: [expectedOrganizationId, attackOrganizationId] } },
      select: { id: true, isActive: true },
    });
    expect(organizations).toHaveLength(2);
    expect(organizations.every((organization) => organization.isActive)).toBe(true);

    const creator = await prisma.membership.findFirst({
      where: {
        organizationId: expectedOrganizationId,
        isActive: true,
        role: { in: ["ADMIN", "SUPERADMIN"] },
        user: { isActive: true },
      },
      select: { userId: true },
    });
    expect(creator).not.toBeNull();

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: expectedOrganizationId,
        email,
        name: fullName,
        role: invitedRole,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: creator!.userId,
      },
      select: { id: true },
    });
    fixtureInvitationId = invitation.id;

    const invitationUrl = new URL("/invitations/accept?lang=en", baseUrl);
    invitationUrl.hash = new URLSearchParams({ token }).toString();
    try {
      await page.goto(invitationUrl.toString());
    } catch {
      throw new Error("Could not open the local synthetic invitation page.");
    }

    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await page.locator('input[name="fullName"]').fill(fullName);
    await page.locator('input[name="password"]').fill(password);
    await page.locator("form").evaluate((form, attackOrgId) => {
      for (const [name, value] of [
        ["role", "SUPERADMIN"],
        ["organizationId", attackOrgId],
      ]) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
    }, attackOrganizationId);
    await page.locator('button[type="submit"]').click();

    await expect.poll(async () => {
      const accepted = await prisma.organizationInvitation.findUnique({
        where: { id: fixtureInvitationId! },
        select: { acceptedAt: true },
      });
      return Boolean(accepted?.acceptedAt);
    }, { timeout: 30_000 }).toBe(true);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, organizationId: true, isActive: true },
    });
    expect(user).not.toBeNull();
    expect(user).toMatchObject({ role: invitedRole, organizationId: expectedOrganizationId, isActive: true });

    const [expectedMembership, attackMembership, audit] = await Promise.all([
      prisma.membership.findUnique({
        where: { userId_organizationId: { userId: user!.id, organizationId: expectedOrganizationId } },
        select: { role: true, isActive: true },
      }),
      prisma.membership.findUnique({
        where: { userId_organizationId: { userId: user!.id, organizationId: attackOrganizationId } },
        select: { id: true },
      }),
      prisma.auditLog.findFirst({
        where: {
          action: "USER_INVITATION_ACCEPTED",
          entityType: "OrganizationInvitation",
          entityId: fixtureInvitationId,
        },
        select: { organizationId: true, details: true },
      }),
    ]);

    expect(expectedMembership).toMatchObject({ role: invitedRole, isActive: true });
    expect(attackMembership).toBeNull();
    expect(audit?.organizationId).toBe(expectedOrganizationId);
    expect(audit?.details).toMatchObject({ email, role: invitedRole });
  } finally {
    try {
      if (fixtureInvitationId) {
        await prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.findUnique({ where: { email }, select: { id: true } });
          if (createdUser) {
            await tx.auditLog.deleteMany({ where: { userId: createdUser.id } });
            await tx.membership.deleteMany({ where: { userId: createdUser.id } });
            await tx.user.deleteMany({ where: { id: createdUser.id } });
          }
          await tx.auditLog.deleteMany({
            where: { entityType: "OrganizationInvitation", entityId: fixtureInvitationId! },
          });
          await tx.organizationInvitation.deleteMany({ where: { id: fixtureInvitationId! } });
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
