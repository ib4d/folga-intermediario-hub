import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--slug") {
      args.slug = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--id") {
      args.id = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function printOrganizationList() {
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          candidates: true,
          documents: true,
          users: true,
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    JSON.stringify(
      organizations.map((organization) => ({
        ...organization,
        createdAt: organization.createdAt.toISOString(),
      })),
      null,
      2,
    ),
  );
}

async function printOrganizationAudit(args) {
  const organization = await prisma.organization.findFirst({
    where: args.id ? { id: args.id } : args.slug ? { slug: args.slug } : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          candidates: true,
          documents: true,
          users: true,
          memberships: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error(`Organization not found for ${args.slug ? `slug=${args.slug}` : `id=${args.id}`}`);
  }

  const [candidates, documents] = await Promise.all([
    prisma.candidate.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.document.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        type: true,
        number: true,
        candidateId: true,
        ocrStatus: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        organization: {
          ...organization,
          createdAt: organization.createdAt.toISOString(),
        },
        candidates: candidates.map((candidate) => ({
          ...candidate,
          createdAt: candidate.createdAt.toISOString(),
        })),
        documents: documents.map((document) => ({
          ...document,
          createdAt: document.createdAt.toISOString(),
        })),
      },
      null,
      2,
    ),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.slug && !args.id) {
    await printOrganizationList();
    return;
  }

  await printOrganizationAudit(args);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
