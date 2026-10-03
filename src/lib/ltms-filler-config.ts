export type LtmsFieldKey =
  | "ltoClientId"
  | "lastName"
  | "firstName"
  | "middleName"
  | "email"
  | "mobile"
  | "registeredAddressLicense"
  | "houseNo"
  | "streetVillage"
  | "province"
  | "cityMunicipality"
  | "barangay"
  | "zipCode";

export type LtmsFieldDefinition = {
  key: LtmsFieldKey;
  label: string;
  inputType?: "email" | "tel" | "text";
};

export type LtmsTextCoordinate = {
  field: LtmsFieldKey;
  x: number;
  y: number;
  maxWidth?: number;
  fontSize?: number;
};

export type LtmsTemplateConfig = {
  title: string;
  imagePath: string;
  outputName: string;
  font: string;
  fillStyle: string;
  coordinates: LtmsTextCoordinate[];
};

export const ltmsFields: LtmsFieldDefinition[] = [
  { key: "ltoClientId", label: "LTO Client ID" },
  { key: "lastName", label: "Last Name" },
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "email", label: "Email", inputType: "email" },
  { key: "mobile", label: "Mobile", inputType: "tel" },
  { key: "registeredAddressLicense", label: "Registered Address (License)" },
  { key: "houseNo", label: "House No" },
  { key: "streetVillage", label: "Street/Village" },
  { key: "province", label: "Province" },
  { key: "cityMunicipality", label: "City/Municipality" },
  { key: "barangay", label: "Barangay" },
  { key: "zipCode", label: "ZIP Code" }
];

export const emptyLtmsForm = ltmsFields.reduce(
  (values, field) => ({ ...values, [field.key]: "" }),
  {} as Record<LtmsFieldKey, string>
);

export const ltmsTemplates: LtmsTemplateConfig[] = [
  {
    title: "LTMS Page 1",
    imagePath: "/ltms_p1.png",
    outputName: "filled_ltms_p1.png",
    font: "bold 26px Arial",
    fillStyle: "#111827",
    coordinates: [
      { field: "ltoClientId", x: 78, y: 376, maxWidth: 470 },
      { field: "lastName", x: 78, y: 496, maxWidth: 470 },
      { field: "firstName", x: 78, y: 617, maxWidth: 470 },
      { field: "middleName", x: 78, y: 737, maxWidth: 470 },
      { field: "email", x: 136, y: 979, maxWidth: 380, fontSize: 22 },
      { field: "mobile", x: 78, y: 1325, maxWidth: 405 }
    ]
  },
  {
    title: "LTMS Page 2",
    imagePath: "/ltms_p2.png",
    outputName: "filled_ltms_p2.png",
    font: "bold 30px Arial",
    fillStyle: "#111827",
    coordinates: [
      { field: "registeredAddressLicense", x: 92, y: 347, maxWidth: 625, fontSize: 25 },
      { field: "houseNo", x: 92, y: 900, maxWidth: 625 },
      { field: "streetVillage", x: 92, y: 1022, maxWidth: 625 },
      { field: "province", x: 92, y: 1166, maxWidth: 625 },
      { field: "cityMunicipality", x: 92, y: 1301, maxWidth: 625 },
      { field: "barangay", x: 92, y: 1433, maxWidth: 625 },
      { field: "zipCode", x: 92, y: 1570, maxWidth: 625 }
    ]
  }
];
