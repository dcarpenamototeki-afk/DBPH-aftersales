import type { Metadata } from "next";
import { HomePage } from "@/components/public-catalog";

export const metadata: Metadata = { title: "DreambikePH | Pre-owned motorcycles" };

export default function Page() {
  return <HomePage />;
}
