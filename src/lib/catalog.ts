export type CatalogItem = {
  id: string;
  title: string;
  brand: string;
  category: string;
  engine_cc: number | null;
  year_model: string;
  odometer_km: number | null;
  cash_price: number | null;
  swapping_value: number | null;
  image_url: string;
  condition_notes: string;
  is_available: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogItemInput = Omit<CatalogItem, "id" | "created_at" | "updated_at">;

export const emptyCatalogItem: CatalogItemInput = {
  title: "",
  brand: "",
  category: "Street",
  engine_cc: null,
  year_model: "",
  odometer_km: null,
  cash_price: null,
  swapping_value: null,
  image_url: "",
  condition_notes: "",
  is_available: true,
  is_published: false
};

export const catalogCategories = ["Scooter", "Street", "Sport", "Adventure", "Cruiser", "Other"];

export function peso(value: number | null) {
  return value == null ? "Ask for price" : `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}
