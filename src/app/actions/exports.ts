"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function exportCandidatesExcel(statusFilter?: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const userRole = session.user.role;
  const userId = session.user.id;

  const whereClause: any = statusFilter ? { status: statusFilter as any } : {};
  
  // Seguridad por rol
  if (userRole === "INTERMEDIARIO") {
    whereClause.intermediaryId = userId;
  }

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: { 
      intermediary: { select: { name: true } }, 
      documents: true 
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = candidates.map((c) => ({
    "Nombre": `${c.firstName} ${c.lastName}`,
    "Email": c.email ?? "",
    "Teléfono": c.phone ?? "",
    "País": c.country,
    "Estado": c.status,
    "Intermediario": c.intermediary.name,
    "Pasaporte": c.passportNumber ?? "",
    "Vence Pasaporte": c.passportExpiry?.toLocaleDateString("es-ES") ?? "",
    "PESEL": c.peselNumber ?? "",
    "Voivodato": c.voivodatoNumber ?? "",
    "Pagó 400 PLN": c.paid400pln ? "Sí" : "No",
    "Ubicación": c.locationStatus,
    "Registrado": c.createdAt.toLocaleDateString("es-ES"),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Candidatos");
  
  // Retornamos base64 para que el cliente lo descargue
  const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return buffer;
}
