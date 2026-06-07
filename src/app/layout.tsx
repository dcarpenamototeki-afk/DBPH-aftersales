import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motorcycle ORCR Tracker",
  description: "Internal ORCR, plate, sales invoice, and inventory tracker"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
