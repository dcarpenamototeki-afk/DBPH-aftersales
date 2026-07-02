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
  date: { x: 280, y: 787, maxWidth: 65, size: 10 },
  fullName: { x: 80, y: 602, maxWidth: 166, size: 11 },
  presentAddress: { x: 80, y: 571, maxWidth: 167, size: 10 },
  contactNumber: { x: 84, y: 551, maxWidth: 95, size: 10 },
  validIdPresented: { x: 148, y: 529, maxWidth: 36, size: 9.5 },
  totalPurchasePrice: { x: 159, y: 482, maxWidth: 94, size: 10.5 },
  downPaymentReceived: { x: 206, y: 463, maxWidth: 78, size: 10.5 },
  yearModel: { x: 351, y: 595, maxWidth: 113, size: 10.5 },
  brandSeriesColor: { x: 297, y: 560, maxWidth: 174, size: 10 },
  engineNumber: { x: 367, y: 544, maxWidth: 106, size: 10 },
  chassisNumber: { x: 373, y: 522, maxWidth: 100, size: 10 },
  signatureName: { x: 93, y: 139, maxWidth: 163, size: 10.5 }
};

export const signatureDateField: DownpaymentTextField = {
  x: 439,
  y: 139,
  maxWidth: 45,
  size: 9.5
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
