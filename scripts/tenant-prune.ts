import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Args = {
  slug?: string;
  id?: string;
  deleteCandidateIds: string[];
  dryRun: boolean;
  confirmDelete: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    deleteCandidateIds: [],
    dryRun: false,
    confirmDelete: false,
  };

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
      continue;
    }

    if (token === "--delete-candidate") {
      const candidateId = argv[index + 1];
      if (candidateId) {
        args.deleteCandidateIds.push(candidateId);
      }
      index += 1;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--confirm-delete") {
      args.confirmDelete = true;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.slug && !args.id) {
    throw new Error("Pass --slug <slug> or --id <organizationId>.");
  }

  if (args.deleteCandidateIds.length === 0) {
    throw new Error("Pass at least one --delete-candidate <candidateId>.");
  }

  const organization = await prisma.organization.findFirst({
    where: args.id ? { id: args.id } : { slug: args.slug },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!organization) {
    throw new Error(`Organization not found for ${args.slug ? `slug=${args.slug}` : `id=${args.id}`}`);
  }

  const matches = await prisma.candidate.findMany({
    where: {
      organizationId: organization.id,
      id: { in: args.deleteCandidateIds },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const foundIds = new Set(matches.map((candidate) => candidate.id));
  const missingIds = args.deleteCandidateIds.filter((candidateId) => !foundIds.has(candidateId));

  const summary = {
    organization,
    dryRun: args.dryRun,
    confirmDelete: args.confirmDelete,
    requestedCandidateIds: args.deleteCandidateIds,
    matchedCandidates: matches,
    missingCandidateIds: missingIds,
  };

  if (args.dryRun || !args.confirmDelete) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          action: args.confirmDelete
            ? "Dry run only. No records deleted."
            : "Confirmation missing. Re-run with --confirm-delete to execute.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await prisma.candidate.deleteMany({
    where: {
      organizationId: organization.id,
      id: { in: matches.map((candidate) => candidate.id) },
    },
  });

  console.log(
    JSON.stringify(
      {
        ...summary,
        deletedCount: result.count,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
