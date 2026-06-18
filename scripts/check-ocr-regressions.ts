import assert from "node:assert/strict";
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

const pesel = `
NUMER PESEL
90010112345
IMIE (IMIONA)
ANNA
NAZWISKO
KOWALSKA
DATA URODZENIA
1990-01-01
URZAD GMINY
WARSZAWA
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

const peselResult = parseIdentityDocumentText(pesel);
assert.equal(peselResult.documentType, "PESEL");
assert.equal(peselResult.personalNumber, "90010112345");
assert.equal(peselResult.firstName, "ANNA");
assert.equal(peselResult.lastName, "KOWALSKA");

console.log("OCR regression checks passed.");
