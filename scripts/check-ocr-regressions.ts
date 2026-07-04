import assert from "node:assert/strict";
import { shouldTryBatchCandidateHeuristicMatch } from "../src/lib/document-batch";
import { parseIdentityDocumentText } from "../src/lib/ocr";

const carlosPassport = `
REPUBLICA DE COLOMBIA
Tipo / Type Cod. pais / Country code Pasaporte N / Passport No.
P COL AX689190
PASAPORTE
PASSPORT AGUILERA SUAREZ
Nombres / Given names
CARLOS ANDRES
Nacionalidad / Nationality
COLOMBIANA
Fecha de nacimiento / Date of birth
26 ENE/JAN 1992
Num. personal / Personal No.
CC1121886718
Sexo / Sex Lugar de nacimiento / Place of birth
M MOGOTES COL
Fecha de expedicion / Date of issue Autoridad / Authority
02 OCT/OCT 2021 G. META
Fecha de vencimiento / Date of expiry
02 OCT/OCT 2031
P<COLAGUILERA<XSUAREZ<<CARLOS<ANDRES<<<<<<<<<
AX689190<2COL9201268M3110027CC1121886718<<14
`;

const alfredoPassport = `
REPUBLICA DE COLOMBIA
Tipo / Type Cod. pais / Country code Pasaporte N / Passport No.
P COL BF872686
PASAPORTE
PASSPORT SEGURA CUEVAS
Nombres / Given names
ALFREDO ENRIQUE
Nacionalidad / Nationality
COLOMBIANA
Fecha de nacimiento / Date of birth Num. personal / Personal No.
30 AGO/AUG 1994 CC1140872493
Sexo / Sex Lugar de nacimiento / Place of birth
M BARRANQUILLA COL
Fecha de expedicion / Date of issue Autoridad / Authority
11 MAR/MAR 2025 G. ATLANTICO
Fecha de vencimiento / Date of expiry
11 MAR/MAR 2035
P<COLSEGURA<CUEVAS<<ALFREDO<ENRIQUE<<<<<<<<<
BF872686<5COL9408300M3503111CC1140872493<<74
`;

const kartaPobytu = `
KARTA POBYTU
RESIDENCE PERMIT
I<POLABC1234567<<<<<<<<<<<<<<<
9001011F3001012POL<<<<<<<<<<<<
KOWALSKA<<ANNA<<<<<<<<<<<<<<<<
`;

const carlosCompactOcr = `
REPUBLICA DE COLOMBIA
PASAPORTE
PASSPORT AGUILERA SUAREZ
Nombres / Given names
CARLOS ANDRES
Fecha de expedicion / Date of issue Autoridad / Authority
020CT/OCT2021 _ . G.META
Fecha de vencimiento / Date of expiry
02 OCT/OCT 2031
P<COLAGUILERA<KSUAREZ<<CARLOS<ANDRES<<<K<LLLLKKK
AX689190<2C0L9201268M3110027CC1121886718<<14
`;

const kartaFrontOcr = `
RED744678
CAMACHO. RODRIGUEZ
Dickson Rodulfo
PLEC/SEX OBYWATELSTWO/NATIONALITY DATA URODZENIA/DATE OF BIRTH
M COL 21 05 1984
RODZAJ ZEZWOLENIA/TYPE OF PERMIT
ZEZWOLENIE NA POBYT CZASOWY
`;

const kartaBackOcr = `
UWAGI/REMARKS
DOSTEP DO RYNKU PRACY
DATA WYDANIA I ORGAN WYDAJACY/DATE OF ISSUE AND ISSUING AUTHORITY
22 10 20825 WOJEWODA EODZKI
MIEJSCE I KRAJ URODZENIA/PLACE AND COUNTRY OF BIRTH
FONSECA, KOLUMBIA
NUMER EWIDENCYJNY PESEL/PERSONAL NUMBER (PESEL)
84652126071
IRPOLRS97446788<<<<<<<<<<<<<<
8405210M2809296C0L<<<<<<<<<<<<0
CAMACHO<KRODRIGUEZ<<DICKSON<ROD
`;
const pesel = `
NUMER PESEL
90010112345
IMIĘ (IMIONA)
ANNA
NAZWISKO
KOWALSKA
DATA URODZENIA
1990-01-01
URZĄD GMINY
WARSZAWA
`;

const permanentKarta = `
KARTA POBYTU
RODZAJ ZEZWOLENIA/TYPE OF PERMIT
ZEZWOLENIE NA POBYT STAŁY
`;

const singleLongSurnamePassport = `
PASSPORT
Surname
KOWALSKA
Given names
ANNA MARIA
P<POLKOWALSKA<<ANNA<MARIA<<<<<<<<<<<<<<
AB1234567<POL9001011F3001012<<<<<<<<<<<<<<04
`;

const carlos = parseIdentityDocumentText(carlosPassport);
assert.equal(carlos.documentType, "PASSPORT");
assert.equal(carlos.documentNumber, "AX689190");
assert.equal(carlos.firstName, "CARLOS ANDRES");
assert.equal(carlos.lastName, "AGUILERA SUAREZ");
assert.equal(carlos.personalNumber, "CC1121886718");
assert.equal(carlos.dateOfBirth, "1992-01-26");
assert.equal(carlos.dateOfIssue, "2021-10-02");
assert.equal(carlos.dateOfExpiry, "2031-10-02");
assert.equal(carlos.sex, "M");
assert.equal(carlos.nationality, "COL");
assert.equal(carlos.issuingCountry, "COL");
assert.equal(carlos.placeOfBirth, "MOGOTES");
assert.equal(carlos.issuingAuthority, "G. META");

const alfredo = parseIdentityDocumentText(alfredoPassport);
assert.equal(alfredo.documentType, "PASSPORT");
assert.equal(alfredo.documentNumber, "BF872686");
assert.equal(alfredo.firstName, "ALFREDO ENRIQUE");
assert.equal(alfredo.lastName, "SEGURA CUEVAS");
assert.equal(alfredo.personalNumber, "CC1140872493");
assert.equal(alfredo.dateOfBirth, "1994-08-30");
assert.equal(alfredo.dateOfIssue, "2025-03-11");
assert.equal(alfredo.dateOfExpiry, "2035-03-11");
assert.equal(alfredo.sex, "M");
assert.equal(alfredo.placeOfBirth, "BARRANQUILLA");
assert.equal(alfredo.issuingAuthority, "G. ATLANTICO");

const karta = parseIdentityDocumentText(kartaPobytu);
assert.equal(karta.documentType, "KARTA_POBYTU");
assert.equal(karta.firstName, "ANNA");
assert.equal(karta.lastName, "KOWALSKA");
assert.equal(karta.issuingCountry, "POL");

const compactCarlos = parseIdentityDocumentText(carlosCompactOcr);
assert.equal(compactCarlos.dateOfIssue, "2021-10-02");
assert.equal(compactCarlos.dateOfExpiry, "2031-10-02");
assert.equal(compactCarlos.issuingAuthority, "G.META");

const kartaFront = parseIdentityDocumentText(kartaFrontOcr);
assert.equal(kartaFront.documentType, "KARTA_POBYTU");
assert.equal(kartaFront.documentDisposition, "PRIMARY");
assert.equal(kartaFront.firstName, "DICKSON RODULFO");
assert.equal(kartaFront.lastName, "CAMACHO RODRIGUEZ");
assert.equal(kartaFront.kartaPobytuType, "Permiso de residencia temporal");

const kartaBack = parseIdentityDocumentText(kartaBackOcr);
assert.equal(kartaBack.documentType, "KARTA_POBYTU");
assert.equal(kartaBack.documentDisposition, "BACK");
assert.equal(kartaBack.personalNumber, "84052126071");
assert.equal(kartaBack.documentNumber, "RS9744678");
assert.equal(kartaBack.dateOfBirth, "1984-05-21");
assert.equal(kartaBack.dateOfIssue, "2025-10-22");
assert.equal(kartaBack.dateOfExpiry, "2028-09-29");
assert.equal(kartaBack.sex, "M");
assert.equal(kartaBack.nationality, "COL");
assert.equal(kartaBack.issuingCountry, "POL");
assert.equal(
  shouldTryBatchCandidateHeuristicMatch({
    documentType: kartaBack.documentType,
    documentDisposition: kartaBack.documentDisposition,
  }),
  true,
);

const singleLongSurname = parseIdentityDocumentText(singleLongSurnamePassport);
assert.equal(singleLongSurname.lastName, "KOWALSKA");

const permanentKartaResult = parseIdentityDocumentText(permanentKarta);
assert.equal(permanentKartaResult.documentType, "KARTA_POBYTU");
assert.equal(permanentKartaResult.kartaPobytuType, "Permiso de residencia permanente");

const peselResult = parseIdentityDocumentText(pesel);
assert.equal(peselResult.documentType, "PESEL");
assert.equal(peselResult.personalNumber, "90010112345");
assert.equal(peselResult.firstName, "ANNA");
assert.equal(peselResult.lastName, "KOWALSKA");

console.log("OCR regression checks passed.");
