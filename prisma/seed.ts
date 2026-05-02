/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("folga2024admin", 12);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@folga.com" },
    update: { passwordHash, role: "SUPERADMIN" },
    create: { email: "admin@folga.com", name: "Administrador Principal", role: "SUPERADMIN", passwordHash },
  });

  const legal = await prisma.user.upsert({
    where: { email: "legal@folga.com" },
    update: { passwordHash, role: "LEGAL" },
    create: { email: "legal@folga.com", name: "Equipo Legal 1", role: "LEGAL", passwordHash },
  });

  const intermediary = await prisma.user.upsert({
    where: { email: "maria@folga.com" },
    update: { passwordHash, role: "INTERMEDIARIO" },
    create: { email: "maria@folga.com", name: "Maria G. (Intermediaria)", role: "INTERMEDIARIO", passwordHash },
  });

  // Crear Candidato de prueba
  const candidate1 = await (prisma as any).candidate.upsert({
    where: { email: "abad@bolanos.com" },
    update: {},
    create: {
      firstName: "Abad",
      lastName: "Bolanos",
      email: "abad@bolanos.com",
      phone: "+48123456789",
      country: "Cuba",
      status: "RECOPILANDO_DOCS",
      intermediaryId: intermediary.id,
      locationStatus: "EN_ORIGEN",
      paid400pln: false,
    } as any,
  });

  const candidate2 = await (prisma as any).candidate.upsert({
    where: { email: "juan@perez.com" },
    update: {},
    create: {
      firstName: "Juan",
      lastName: "Perez",
      email: "juan@perez.com",
      phone: "+48987654321",
      country: "Colombia",
      status: "APROBADO",
      intermediaryId: intermediary.id,
      locationStatus: "EN_TRANSITO",
      paid400pln: true,
      paymentDate: new Date(),
    } as any,
  });

  // Crear Notificación
  await (prisma as any).notification.create({
    data: {
      candidateId: candidate1.id,
      type: "DOC_REQUIRED",
      message: "Abad Bolanos necesita subir su pasaporte para continuar.",
    } as any,
  });

  console.log("✅ Seed ejecutado.");
  console.log("- Admin: admin@folga.com / folga2024admin");
  console.log("- Legal: legal@folga.com / folga2024admin");
  console.log("- Intermediario: maria@folga.com / folga2024admin");
}

main().catch(console.error).finally(() => prisma.$disconnect());
