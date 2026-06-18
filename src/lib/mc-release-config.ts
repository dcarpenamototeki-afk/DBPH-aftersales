export const mcReleaseConfig = {
  spreadsheetId: "1EGpdZ4itHD0VJLOtP0RTanrUUbcvlICgD0oRNQPND5I",
  stocksSheet: "MC Stocks In",
  journalSheet: "MC Journal",
  firstJournalRow: 27,
  journalScanColumns: ["X", "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC", "BK"],
  stockCheckboxColumn: "O",
  printableSheets: ["Reg.Form 1", "waiver", "promo", "warranty"],
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
};

export type MotorcycleCatalog = {
  models: string[];
  motorcycles: MotorcycleMatch[];
};
