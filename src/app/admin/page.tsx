import type { Metadata } from "next";
import { CatalogAdmin } from "@/components/catalog-admin";

export const metadata: Metadata = { title: "DreambikePH | Admin access", robots: { index: false, follow: false } };

export default function Page() { return <CatalogAdmin />; }
