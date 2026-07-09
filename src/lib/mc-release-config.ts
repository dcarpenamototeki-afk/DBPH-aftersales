export const mcReleaseConfig = {
  spreadsheetId: "1EGpdZ4itHD0VJLOtP0RTanrUUbcvlICgD0oRNQPND5I",
  stocksSheet: "MC Stocks In",
  stocksFirstDataRow: 3,
  stocksUnitModelColumn: "H",
  stocksPnpCsrStatusColumn: "M",
  journalSheet: "MC Journal",
  firstJournalRow: 41,
  journalLookupColumn: "X",
  journalScanColumns: ["X", "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC", "BK"],
  journalWrittenColumns: [
    "A", "U", "V", "X", "AD", "AE", "AF", "AL", "AP", "AQ", "AR", "AS",
    "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC", "BD", "BE", "BF",
    "BJ", "BK", "BL", "BM", "BV", "BX", "BZ"
  ],
  stockCheckboxColumn: "O",
  printableSheets: [
    { title: "Reg.Form 1", scale: "4", size: "A4", margin: "0.25" },
    { title: "waiver", scale: "4", size: "A4", margin: "0.25" },
    { title: "promo", scale: "4", size: "A4", margin: "0.25" },
    { title: "warranty", range: "A1:AW54", scale: "4", size: "LETTER", margin: "0.10" },
    { title: "warranty", range: "A56:AW111", scale: "4", size: "LETTER", margin: "0.10" },
    { title: "warranty", range: "A112:AW166", scale: "4", size: "LETTER", margin: "0.10" }
  ],
  fixedValues: {
    releaseStatus: "Unit Released",
    releasedBy: "SIR ANDREW",
    paymentType: "Cash",
    notApplicable: "N/A",
    branch: "DBPH"
  }
} as const;

export type McReleaseForm = {
  unitCode: string;
  releaseDate: string;
  surname: string;
  firstName: string;
  middleName: string;
  birthday: string;
  cpNumber: string;
  addressLine: string;
  barangay: string;
  cityTown: string;
  province: string;
  waiver: string;
  amount: string;
};

export type MotorcycleMatch = {
  sourceRow: number;
  unitCode: string;
  unitModel: string;
  engineNumber: string;
  chassisNumber: string;
  color: string;
  pnpCsrStatus: string;
};

export type MotorcycleCatalog = {
  models: string[];
  motorcycles: MotorcycleMatch[];
};
