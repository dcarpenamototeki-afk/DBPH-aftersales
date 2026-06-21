export type CaPaymentKey = "downpayment" | "bankTransfer" | "tooReg" | "cash";

export type CaForm = {
  surname: string;
  firstName: string;
  middleInitial: string;
  completeAddress: string;
  unitColor: string;
  engineNumber: string;
  contactNumber: string;
  seller: string;
  payments: Record<CaPaymentKey, { enabled: boolean; amount: string }>;
};

export const caTemplatePath = "/dreambike-contract-agreement-template.pdf";

export const caCoordinates = {
  date: { x: 457, y: 795, size: 9, maxWidth: 66 },
  clientName: { x: 99, y: 649, size: 10, maxWidth: 185 },
  address: { x: 118, y: 635, size: 9, maxWidth: 235 },
  purchasePrice: { x: 365, y: 580, size: 10, maxWidth: 90 },
  unitColor: { x: 216, y: 525, size: 10, maxWidth: 210 },
  engineNumber: { x: 216, y: 497, size: 10, maxWidth: 210 },
  contactNumber: { x: 216, y: 442, size: 10, maxWidth: 210 },
  sellerName: { x: 92, y: 165, size: 9, maxWidth: 170 },
  buyerName: { x: 332, y: 165, size: 9, maxWidth: 170 },
  payments: {
    downpayment: { yesX: 149, noX: 190, amountX: 245, y: 403 },
    bankTransfer: { yesX: 149, noX: 190, amountX: 245, y: 391 },
    tooReg: { yesX: 149, noX: 190, amountX: 245, y: 380 },
    cash: { yesX: 149, noX: 190, amountX: 245, y: 368 }
  }
} as const;
