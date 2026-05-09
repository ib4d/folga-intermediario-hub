import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.candidate.findMany();
  console.log("Candidates in DB:", JSON.stringify(candidates.map(c => ({ id: c.id, firstName: c.firstName, organizationId: c.organizationId })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
