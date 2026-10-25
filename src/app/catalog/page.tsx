import type { Metadata } from "next";
import { CatalogPage } from "@/components/public-catalog";

export const metadata: Metadata = { title: "DreambikePH | Catalog", description: "Browse available DreambikePH motorcycles." };

export default function Page() { return <CatalogPage />; }
