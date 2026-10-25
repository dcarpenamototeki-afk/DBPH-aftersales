import type { Metadata } from "next";
import { ContactPage } from "@/components/public-catalog";

export const metadata: Metadata = { title: "DreambikePH | Contact us", description: "Contact DreambikePH in Tondo, Manila." };

export default function Page() { return <ContactPage />; }
