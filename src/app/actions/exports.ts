"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function exportCandidatesToXLSX(): Promise<{ base64: string; filename: string } | null> {
  const session = await auth();
  if (!session) return null;
  if (!["ADMIN", "SUPERADMIN", "LEGAL"].includes(session.user.role)) return null;

  const whereClause =
    session.user.role === "INTERMEDIARIO" ? { intermediaryId: session.user.id } : {};

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: { intermediary: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = candidates.map((c: any) => ({
    imie: c.firstName ?? "",
    nazwisko: c.lastName ?? "",
    Pe: c.gender ?? "",
    Data_urodzenia: c.dateOfBirth ? c.dateOfBirth.toISOString().split("T")[0] : "",
    Miejsce_urodzenia: c.birthPlace ?? "",
    Obywatelstwo: c.citizenship ?? "",
    Panstwo_urodzenia: c.birthCountry ?? "",
    Narodowosc: c.nationality ?? "",
    Wzrost: c.heightCm ?? "",
    Telefon: c.phone ?? "",
    Email: c.email ?? "",
    PESEL: c.peselNumber ?? "",
    Paszport_seria_numer: c.passportNumber ?? "",
    Paszport_data_wydania: c.passportIssueDate ? c.passportIssueDate.toISOString().split("T")[0] : "",
    Paszport_data_waznosci: c.passportExpiry ? c.passportExpiry.toISOString().split("T")[0] : "",
    Paszport_biometryczny: c.passportBiometric ? "Tak" : "Nie",
    Karta_pobytu_seria_numer: c.kartaPobytuNumber ?? "",
    Karta_pobytu_data_wydania: c.kartaPobytuIssueDate ? c.kartaPobytuIssueDate.toISOString().split("T")[0] : "",
    Karta_pobytu_data_waznosci: c.kartaPobytuExpiry ? c.kartaPobytuExpiry.toISOString().split("T")[0] : "",
    Karta_pobytu_typ: c.kartaPobytuType ?? "",
    Decyzja_seria_numer: c.voivodatoNumber ?? "",
    Decyzja_data_wydania: c.voivodatoIssueDate ? c.voivodatoIssueDate.toISOString().split("T")[0] : "",
    Decyzja_data_waznosci: c.voivodatoExpiry ? c.voivodatoExpiry.toISOString().split("T")[0] : "",
    Decyzja_status: c.voivodatoStatus ?? "",
    Zrodlo_rekrutacji: c.recruitmentSource ?? "",
    Opiekun_rekrutacji: c.recruiterId ?? "",
    Data_przyjazdu: c.arrivalDate ? c.arrivalDate.toISOString().split("T")[0] : "",
    Zakwaterowanie: c.accommodation ?? "",
    Szczegoly_zakwaterowania: c.accommodationNotes ?? "",
    Uwagi_do_przyjazdu: c.arrivalNotes ?? "",
    Status_kandydata: c.status ?? "",
    Powod_rezygnacji: c.rejectionReason ?? "",
    Zaplacil_400PLN: c.paid400pln ? "Tak" : "Nie",
    Data_platnosci: c.paymentDate ? c.paymentDate.toISOString().split("T")[0] : "",
    GDPR_RODO: c.gdprConsent ? "Tak" : "Nie",
    Lokalizacja: c.locationStatus ?? "",
    Adres_polska: c.polishAddress ?? "",
    Miasto_polska: c.polishCity ?? "",
    Intermediario: c.intermediary?.name ?? "",
    OCR_przetworzone: c.ocrProcessed ? "Tak" : "Nie",
    OCR_zrodlo: c.ocrSource ?? "",
    Data_utworzenia: c.createdAt.toISOString().split("T")[0],
    Uwagi: c.notes ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Kandydaci");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = Buffer.from(buffer).toString("base64");
  const filename = `folga-candidatos-${new Date().toISOString().split("T")[0]}.xlsx`;
  return { base64, filename };
}