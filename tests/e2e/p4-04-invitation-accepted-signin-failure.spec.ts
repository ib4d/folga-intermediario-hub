import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const requiredEnvironment = ["P4_04_BASE_URL", "P4_04_DATABASE_URL", "P4_04_WEB_CONTAINER_NAME"] as const;

test("an accepted invitation remains usable when automatic sign-in fails after commit", async ({ page }) => {
  test.skip(
    process.env.P4_04_RUN_MUTATING_E2E !== "1" || requiredEnvironment.some((key) => !process.env[key]),
    "Requires an explicitly enabled local synthetic invitation fixture.",
  );
  test.setTimeout(60_000);

  const baseUrl = new URL(process.env.P4_04_BASE_URL!);
  const databaseUrl = new URL(process.env.P4_04_DATABASE_URL!);
  expect(["localhost", "127.0.0.1"]).toContain(baseUrl.hostname);
  expect(["localhost", "127.0.0.1"]).toContain(databaseUrl.hostname);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  const fixtureTag = randomUUID().replaceAll("-", "");
  const organizationId = `org_p404_signin_fail_${fixtureTag}`;
  const organizationName = `ORI Synthetic Sign-in Failure ${fixtureTag}`;
  const organizationSlug = `p404-signin-fail-${fixtureTag}`;
  const email = `p404-signin-fail-${fixtureTag}@synthetic.example.invalid`;
  const inviteName = "ORI Synthetic Accepted Sign-in Failure";
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const syntheticPassword = `Synthetic-${fixtureTag}-Accepted!`;
  const triggerName = `p4_04_accept_signin_${fixtureTag}`;
  const functionName = `p4_04_accept_signin_fn_${fixtureTag}`;
  const webContainerName = process.env.P4_04_WEB_CONTAINER_NAME!;
  let triggerMayExist = false;
  let initialRateLimitKeys: string[] = [];

  function readWebLogs() {
    return execFileSync("docker", ["logs", webContainerName], { encoding: "utf8" });
  }

  try {
    const initialBuckets = await prisma.$queryRaw<Array<{ key: string }>>`
      SELECT "key" FROM "RequestRateLimitBucket"
    `;
    initialRateLimitKeys = initialBuckets.map(({ key }) => key);

    await prisma.organization.create({
      data: {
        id: organizationId,
        name: organizationName,
        slug: organizationSlug,
        plan: "STARTER",
        isActive: true,
      },
    });
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        name: inviteName,
        role: "LEGAL",
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: `synthetic_${fixtureTag}`,
      },
      select: { id: true },
    });

    const logsBefore = readWebLogs();
    triggerMayExist = true;
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE "User" SET "isActive" = false WHERE "email" = NEW."email"; RETURN NEW; END; $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER "${triggerName}" AFTER UPDATE OF "acceptedAt" ON "OrganizationInvitation" FOR EACH ROW WHEN (NEW."id" = '${invitation.id}' AND NEW."acceptedAt" IS NOT NULL) EXECUTE FUNCTION "${functionName}"()`,
    );

    await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.123" });
    const invitationUrl = new URL("/invitations/accept?lang=es", baseUrl);
    invitationUrl.hash = new URLSearchParams({ token }).toString();
    await page.goto(invitationUrl.toString());
    await expect(page.locator("#invite-full-name")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
    await page.locator("#invite-full-name").fill(inviteName);
    await page.locator("#invite-password").fill(syntheticPassword);
    await page.getByRole("button", { name: "Aceptar y entrar", exact: true }).click();

    await expect(page.getByRole("status")).toHaveText(
      "La invitación se aceptó, pero no pudimos iniciar tu sesión. Entra con el correo invitado y la contraseña que acabas de crear.",
    );
    const loginLink = page.getByRole("link", { name: "Iniciar sesion", exact: true });
    await expect(loginLink).toHaveAttribute("href", "/login?lang=es");

    const [storedInvitation, user, membership, auditCount] = await Promise.all([
      prisma.organizationInvitation.findUniqueOrThrow({
        where: { id: invitation.id },
        select: { acceptedAt: true, tokenHash: true },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email },
        select: { id: true, isActive: true, organizationId: true },
      }),
      prisma.membership.findFirstOrThrow({
        where: { user: { email }, organizationId },
        select: { role: true, isActive: true },
      }),
      prisma.auditLog.count({ where: { organizationId, action: "USER_INVITATION_ACCEPTED", entityId: invitation.id } }),
    ]);
    expect(storedInvitation.acceptedAt).toBeInstanceOf(Date);
    expect(storedInvitation.tokenHash).toBe(tokenHash);
    expect(user.isActive).toBe(false);
    expect(user.organizationId).toBe(organizationId);
    expect(user.id).toBeTruthy();
    expect(membership).toEqual({ role: "LEGAL", isActive: true });
    expect(auditCount).toBe(1);

    const newLogs = readWebLogs().slice(logsBefore.length);
    expect(newLogs).toContain("Invitation operation failed");
    expect(newLogs).toContain('"operation":"acceptance-sign-in"');
    for (const sensitiveValue of [email, token, tokenHash, syntheticPassword, inviteName, "passwordHash"]) {
      expect(newLogs).not.toContain(sensitiveValue);
    }
  } finally {
    try {
      if (triggerMayExist) {
        await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "OrganizationInvitation"`);
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
        triggerMayExist = false;
      }
    } finally {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.auditLog.deleteMany({ where: { organizationId } });
          await tx.organizationInvitation.deleteMany({ where: { organizationId } });
          await tx.membership.deleteMany({ where: { organizationId } });
          await tx.user.updateMany({ where: { email, organizationId }, data: { organizationId: null } });
          await tx.user.deleteMany({ where: { email } });
          await tx.organization.deleteMany({ where: { id: organizationId } });
        });
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
