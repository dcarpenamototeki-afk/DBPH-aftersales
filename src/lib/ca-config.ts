export type CaPaymentKey = "downpayment" | "reservation" | "bankTransfer" | "cash";

export type CaForm = {
  surname: string;
  firstName: string;
  middleInitial: string;
  completeAddress: string;
  agreedPrice: string;
  unitDetails: string;
  unitColor: string;
  engineNumber: string;
  chassisNumber: string;
  contactNumber: string;
  seller: string;
  payments: Record<CaPaymentKey, { enabled: boolean; amount: string }>;
};

export const caTemplateDocumentId = "159LvMzWs_8z6eQzbZ9tN7nO3Cti-peLIl4lsg7bgYmU";

export const caPaymentKeys: CaPaymentKey[] = [
  "downpayment",
  "reservation",
  "bankTransfer",
  "cash"
];
