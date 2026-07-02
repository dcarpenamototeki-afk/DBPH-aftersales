export type DownpaymentForm = {
  fullName: string;
  presentAddress: string;
  contactNumber: string;
  validIdPresented: string;
  totalPurchasePrice: string;
  downPaymentReceived: string;
  yearModel: string;
  brandSeriesColor: string;
  engineNumber: string;
  chassisNumber: string;
  date: string;
};

export type DownpaymentFieldKey = keyof DownpaymentForm | "signatureName";

export type DownpaymentTextField = {
  x: number;
  y: number;
  maxWidth: number;
  size: number;
};

export const downpaymentTemplatePath = "/downpayment-file-template.pdf";

export const downpaymentTextFields: Record<DownpaymentFieldKey, DownpaymentTextField> = {
  date: { x: 280, y: 785, maxWidth: 65, size: 9 },
  fullName: { x: 72, y: 599, maxWidth: 174, size: 9 },
  presentAddress: { x: 72, y: 568, maxWidth: 175, size: 8 },
  contactNumber: { x: 79, y: 548, maxWidth: 100, size: 8.5 },
  validIdPresented: { x: 140, y: 526, maxWidth: 44, size: 8 },
  totalPurchasePrice: { x: 157, y: 479, maxWidth: 96, size: 9 },
  downPaymentReceived: { x: 204, y: 460, maxWidth: 80, size: 9 },
  yearModel: { x: 351, y: 592, maxWidth: 113, size: 9 },
  brandSeriesColor: { x: 297, y: 568, maxWidth: 174, size: 8.5 },
  engineNumber: { x: 367, y: 541, maxWidth: 106, size: 8.5 },
  chassisNumber: { x: 373, y: 519, maxWidth: 100, size: 8.5 },
  signatureName: { x: 93, y: 136, maxWidth: 163, size: 9 }
};

export const signatureDateField: DownpaymentTextField = {
  x: 439,
  y: 136,
  maxWidth: 45,
  size: 8
};

export const emptyDownpaymentForm: DownpaymentForm = {
  fullName: "",
  presentAddress: "",
  contactNumber: "",
  validIdPresented: "",
  totalPurchasePrice: "",
  downPaymentReceived: "",
  yearModel: "",
  brandSeriesColor: "",
  engineNumber: "",
  chassisNumber: "",
  date: new Date().toISOString().slice(0, 10)
};
