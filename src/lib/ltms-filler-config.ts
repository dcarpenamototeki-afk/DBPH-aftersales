export type LtmsFieldKey =
  | "lastName"
  | "firstName"
  | "middleName"
  | "email"
  | "telephone"
  | "mobile"
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
  { key: "lastName", label: "Last Name" },
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "email", label: "Email", inputType: "email" },
  { key: "telephone", label: "Telephone", inputType: "tel" },
  { key: "mobile", label: "Mobile", inputType: "tel" },
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
    font: "26px Arial",
    fillStyle: "#111827",
    coordinates: [
      { field: "lastName", x: 78, y: 496, maxWidth: 470 },
      { field: "firstName", x: 78, y: 617, maxWidth: 470 },
      { field: "middleName", x: 78, y: 737, maxWidth: 470 },
      { field: "email", x: 136, y: 979, maxWidth: 380, fontSize: 22 },
      { field: "telephone", x: 78, y: 1084, maxWidth: 500 },
      { field: "mobile", x: 78, y: 1325, maxWidth: 405 }
    ]
  },
  {
    title: "LTMS Page 2",
    imagePath: "/ltms_p2.png",
    outputName: "filled_ltms_p2.png",
    font: "26px Arial",
    fillStyle: "#111827",
    coordinates: [
      { field: "houseNo", x: 78, y: 533, maxWidth: 470 },
      { field: "streetVillage", x: 78, y: 654, maxWidth: 470 },
      { field: "province", x: 78, y: 776, maxWidth: 470 },
      { field: "cityMunicipality", x: 78, y: 898, maxWidth: 470 },
      { field: "barangay", x: 78, y: 1020, maxWidth: 470 },
      { field: "zipCode", x: 78, y: 1142, maxWidth: 470 }
    ]
  }
];
