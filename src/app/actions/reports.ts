"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import * as XLSX from "xlsx";

/**
 * Generates a comprehensive performance report for the organization.
 */
export async function generatePerformanceReport() {
  const tenant = await requireTenant();

  const [candidates, org] = await Promise.all([
    prisma.candidate.findMany({
      where: { organizationId: tenant.organizationId! },
      include: { 
        intermediary: { select: { name: true } },
        _count: { select: { documents: true } }
      }
    }),
    prisma.organization.findUnique({
      where: { id: tenant.organizationId! }
    })
  ]);

  const data = candidates.map((c: any) => ({
    "Nombre": `${c.firstName} ${c.lastName}`,
    "País": c.country,
    "Estado": c.status,
    "Intermediario": c.intermediary?.name || "Interno",
    "Documentos": c._count.documents,
    "Pago 400 PLN": c.paid400pln ? "SÍ" : "NO",
    "Fecha Registro": c.createdAt.toLocaleDateString(),
    "Última Actualización": c.updatedAt.toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Performance Report");

  // Add Metadata Worksheet
  const meta = [
    ["Reporte de Rendimiento"],
    ["Organización", org?.name || "N/A"],
    ["Generado por", tenant.userId],
    ["Fecha", new Date().toLocaleString()],
    ["Total Candidatos", candidates.length]
  ];
  const metaSheet = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(workbook, metaSheet, "Resumen");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = buffer.toString("base64");
  const filename = `performance_report_${org?.slug || 'org'}_${new Date().toISOString().split('T')[0]}.xlsx`;

  return { base64, filename };
}

/**
 * Generates a legal compliance report.
 */
export async function generateLegalComplianceReport() {
  const tenant = await requireTenant();

  const candidates = await prisma.candidate.findMany({
    where: { 
      organizationId: tenant.organizationId!,
      status: { in: ["EN_REVISION_LEGAL", "APROBADO"] }
    },
    include: {
      documents: {
        where: { type: { in: ["PASSPORT", "KARTA_POBYTU", "PESEL"] } }
      }
    }
  });

  const data = candidates.map((c: any) => {
    const hasPassport = c.documents.some(d: any => d: any.type === "PASSPORT");
    const hasPesel = c.documents.some(d: any => d: any.type === "PESEL");
    const hasKarta = c.documents.some(d: any => d: any.type === "KARTA_POBYTU");

    return {
      "Candidato": `${c.firstName} ${c.lastName}`,
      "Pasaporte": c.passportNumber || "Falta",
      "Pasaporte Doc": hasPassport ? "Subido" : "FALTA",
      "PESEL": c.peselNumber || "N/A",
      "PESEL Doc": hasPesel ? "Subido" : "Falta",
      "Karta Pobytu": c.kartaPobytuNumber || "N/A",
      "Karta Doc": hasKarta ? "Subido" : "Falta",
      "Estado": c.status,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cumplimiento Legal");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = buffer.toString("base64");
  const filename = `legal_compliance_${new Date().toISOString().split('T')[0]}.xlsx`;

  return { base64, filename };
}
