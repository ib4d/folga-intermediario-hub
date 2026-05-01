import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("folga2024admin", 12);
  
  await prisma.user.upsert({
    where: { email: "admin@folga.com" },
    update: {
      passwordHash,
      role: "SUPERADMIN",
    },
    create: {
      email: "admin@folga.com",
      name: "Administrador Principal",
      role: "SUPERADMIN",
      passwordHash,
    },
  });
  
  console.log("✅ Seed ejecutado. Usuario: admin@folga.com / folga2024admin");
}

main().catch(console.error).finally(() => prisma.$disconnect());
