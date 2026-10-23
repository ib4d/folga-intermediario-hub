import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const syntheticUrl = databaseUrl ? new URL(databaseUrl) : null;
const databaseName = syntheticUrl?.pathname.replace(/^\//, "");

if (
  process.env.SYNTHETIC_WORKSPACE !== "1" ||
  process.env.APP_RELEASE !== "synthetic-local" ||
  syntheticUrl?.hostname !== "synthetic-db" ||
  databaseName !== "ori_cruit_synthetic"
) {
  throw new Error(
    "Synthetic seed refused. It only runs against the isolated ori-cruit-hub-synthetic database."
  );
}

const seedPassword = process.env.SYNTHETIC_SEED_PASSWORD;
if (!seedPassword || seedPassword.length < 16) {
  throw new Error("SYNTHETIC_SEED_PASSWORD must be set and contain at least 16 characters.");
}

const prisma = new PrismaClient();

async function main() {
  // Empty update objects make this a create-if-missing seed; restarts preserve edits.
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const organization = await prisma.organization.upsert({
    where: { slug: "ori-synthetic-lab" },
    update: {},
    create: {
      id: "org_ori_synthetic_lab",
      name: "ORI Synthetic Lab — TEST DATA ONLY",
      slug: "ori-synthetic-lab",
      country: "PL",
      plan: "STARTER",
      isActive: true,
    },
  });

  const userSpecs = [
    { email: "admin@synthetic.example.invalid", name: "Synthetic Tenant Admin", role: "ADMIN" },
    { email: "operator@synthetic.example.invalid", name: "Synthetic Intermediary", role: "INTERMEDIARIO" },
    { email: "legal@synthetic.example.invalid", name: "Synthetic Legal Reviewer", role: "LEGAL" },
    { email: "logistics@synthetic.example.invalid", name: "Synthetic Logistics Operator", role: "LOGISTICA" },
  ];

  const users = new Map();
  for (const spec of userSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: {
        email: spec.email,
        name: spec.name,
        passwordHash,
        role: spec.role,
        isActive: true,
        isPlatformAdmin: false,
        organizationId: organization.id,
      },
    });
    users.set(spec.role, user);
    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        organizationId: organization.id,
        role: spec.role,
        isActive: user.isActive,
      },
    });
  }

  const candidates = [
    {
      id: "synthetic_candidate_001",
      lastName: "SYNTHETIC-001",
      status: "RECOPILANDO_DOCS",
      locationStatus: "EN_ORIGEN",
    },
    {
      id: "synthetic_candidate_002",
      lastName: "SYNTHETIC-002",
      status: "EN_REVISION_LEGAL",
      locationStatus: "EN_ORIGEN",
    },
    {
      id: "synthetic_candidate_003",
      lastName: "SYNTHETIC-003",
      status: "EN_PROCESO_PERMISO",
      locationStatus: "EN_ORIGEN",
    },
    {
      id: "synthetic_candidate_004",
      lastName: "SYNTHETIC-004",
      status: "CONTRATADO",
      locationStatus: "EN_TRANSITO",
    },
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const fixture = candidates[index];
    await prisma.candidate.upsert({
      where: { id: fixture.id },
      update: {},
      create: {
        id: fixture.id,
        firstName: "CANDIDATE",
        lastName: fixture.lastName,
        email: `candidate-${index + 1}@synthetic.example.invalid`,
        citizenship: "SYNTHETIC",
        nationality: "SYNTHETIC",
        country: "COL",
        status: fixture.status,
        locationStatus: fixture.locationStatus,
        notes: "SYNTHETIC TEST RECORD — contains no real person's data.",
        gdprConsent: false,
        organizationId: organization.id,
        intermediaryId: users.get("INTERMEDIARIO").id,
      },
    });
  }

  const pilotProspects = [
    { code: "P01", brand: "Worklink Asia", slug: "sim-p01-worklink-asia", kraz: "UNCONFIRMED" },
    { code: "P02", brand: "I&A Recruiting, Consulting & Legal", slug: "sim-p02-ia-recruiting", kraz: "32480" },
    { code: "P03", brand: "Auresa", slug: "sim-p03-auresa", kraz: "34212" },
    { code: "P04", brand: "Pako HR", slug: "sim-p04-pako-hr", kraz: "25314" },
    { code: "P05", brand: "Magnar AP", slug: "sim-p05-magnar-ap", kraz: "26115" },
    { code: "P06", brand: "NextWork / Quickplus", slug: "sim-p06-nextwork-quickplus", kraz: "NO-MATCH-QUICKPLUS-NIP" },
    { code: "P07", brand: "Primework Group", slug: "sim-p07-primework", kraz: "31795" },
    { code: "P08", brand: "Punto HR", slug: "sim-p08-punto-hr", kraz: "REMOVED-2026-07-25" },
    { code: "P09", brand: "JOBCEN / PW MATYSART", slug: "sim-p09-jobcen", kraz: "27207" },
    { code: "P10", brand: "WORKSOL", slug: "sim-p10-worksol", kraz: "6076" },
  ];

  const personaRoles = [
    { key: "manager", label: "Manager (synthetic)", role: "ADMIN" },
    { key: "recruiter", label: "Recruiter (synthetic)", role: "INTERMEDIARIO" },
    { key: "broker", label: "Broker / intermediary (synthetic)", role: "INTERMEDIARIO" },
    { key: "legal", label: "Legal reviewer (synthetic)", role: "LEGAL" },
    { key: "logistics", label: "Logistics coordinator (synthetic)", role: "LOGISTICA" },
  ];
  const pilotStatuses = [
    "RECOPILANDO_DOCS",
    "EN_REVISION_LEGAL",
    "EN_PROCESO_PERMISO",
    "CONTRATADO",
    "DOCUMENTACION_PENDIENTE",
    "APROBADO",
    "REVISION_ADICIONAL",
    "EN_REVISION_LEGAL",
    "RECOPILANDO_DOCS",
    "CONTRATADO",
  ];

  let seededPilotUsers = 0;
  for (let index = 0; index < pilotProspects.length; index += 1) {
    const prospect = pilotProspects[index];
    const simulatedOrgName = `SIMULATED PROSPECT ${prospect.code} — NOT AFFILIATED — ${prospect.brand}`;
    const prospectOrg = await prisma.organization.upsert({
      where: { slug: prospect.slug },
      update: {},
      create: {
        id: `org_${prospect.slug.replaceAll("-", "_")}`,
        name: simulatedOrgName,
        slug: prospect.slug,
        country: "PL",
        plan: "STARTER",
        isActive: true,
      },
    });

    const pilotUsers = new Map();
    for (const persona of personaRoles) {
      const email = `${prospect.slug}-${persona.key}@synthetic.example.invalid`;
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: `${prospect.code} — ${persona.label}`,
          passwordHash,
          role: persona.role,
          isActive: true,
          isPlatformAdmin: false,
          organizationId: prospectOrg.id,
        },
      });
      pilotUsers.set(persona.key, user);
      await prisma.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: prospectOrg.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          organizationId: prospectOrg.id,
          role: persona.role,
          isActive: user.isActive,
        },
      });
      seededPilotUsers += 1;
    }

    const candidateId = `synthetic_${prospect.code.toLowerCase()}_candidate`;
    const candidateData = {
      firstName: "SYNTHETIC",
      lastName: `${prospect.code}-CANDIDATE`,
      email: `${prospect.slug}-candidate@synthetic.example.invalid`,
      citizenship: "SYNTHETIC",
      nationality: "SYNTHETIC",
      country: "COL",
      status: pilotStatuses[index],
      locationStatus: index % 2 === 0 ? "EN_ORIGEN" : "EN_TRANSITO",
      notes: `SYNTHETIC TEST RECORD for ${prospect.code}; ${prospect.kraz}. No real company affiliation or personal data.`,
      gdprConsent: false,
      organizationId: prospectOrg.id,
      intermediaryId: pilotUsers.get("recruiter").id,
      isArchived: false,
    };
    await prisma.candidate.upsert({
      where: { id: candidateId },
      update: {},
      create: { id: candidateId, ...candidateData },
    });
  }

  console.log(`Ensured isolated synthetic organization ${organization.slug} exists.`);
  console.log(`Ensured ${userSpecs.length + seededPilotUsers} synthetic users exist; existing accounts were preserved.`);
  console.log(`Ensured ${candidates.length + pilotProspects.length} synthetic candidates exist; existing records were preserved.`);
  console.log("Every prospect tenant is labeled NOT AFFILIATED; all personas and candidate records are synthetic. No documents or real customer data were seeded.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
