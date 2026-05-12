import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const prismaRuntime = Prisma as unknown as Record<string, unknown>;
  const candidateStatus = prismaRuntime.CandidateStatus as Record<string, unknown> | undefined;
  const enumContainer = prismaRuntime.$Enums as Record<string, unknown> | undefined;

  console.log("CandidateStatus keys:", Object.keys(candidateStatus || {}));
  console.log("$Enums keys:", Object.keys(enumContainer || {}));
}

main().catch(console.error).finally(() => prisma.$disconnect());
