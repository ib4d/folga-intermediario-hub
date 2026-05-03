import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("CandidateStatus keys:", Object.keys((Prisma as any).CandidateStatus || {}));
  console.log("$Enums keys:", Object.keys((Prisma as any).$Enums || {}));
}

main().catch(console.error).finally(() => prisma.$disconnect());
