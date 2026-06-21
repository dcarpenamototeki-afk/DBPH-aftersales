import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { caCoordinates } from "@/lib/ca-config";
import type { CaForm, CaPaymentKey } from "@/lib/ca-config";

export const dynamic = "force-dynamic";

function uppercase(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

function fitText(text: string, font: { widthOfTextAtSize(text: string, size: number): number }, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let output = text;
  while (output.length > 1 && font.widthOfTextAtSize(`${output}...`, size) > maxWidth) output = output.slice(0, -1);
  return `${output.trim()}...`;
}

function money(value: string) {
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(numeric) && numeric ? numeric.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  try {
    const form = (await request.json()) as CaForm;
    const required = ["surname", "firstName", "completeAddress", "unitColor", "engineNumber", "contactNumber", "seller"] as const;
    const missing = required.find((key) => !uppercase(form[key]));
    if (missing) return jsonError(`${missing} is required.`);
    const paymentKeys = Object.keys(caCoordinates.payments) as CaPaymentKey[];
    const paymentWithoutAmount = paymentKeys.find((key) => form.payments[key]?.enabled && !String(form.payments[key]?.amount ?? "").trim());
    if (paymentWithoutAmount) return jsonError(`Amount is required for ${paymentWithoutAmount}.`);

    const template = await readFile(path.join(process.cwd(), "public", "dreambike-contract-agreement-template.pdf"));
    const document = await PDFDocument.load(template);
    const page = document.getPage(0);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(0.02, 0.08, 0.18);
    const fullName = [form.firstName, form.middleInitial, form.surname].map(uppercase).filter(Boolean).join(" ");
    const date = new Date().toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "2-digit", timeZone: "Asia/Manila" });

    const draw = (value: string, coordinate: { x: number; y: number; size: number; maxWidth: number }, useBold = false) => {
      const font = useBold ? bold : regular;
      const text = fitText(uppercase(value), font, coordinate.size, coordinate.maxWidth);
      page.drawText(text, { x: coordinate.x, y: coordinate.y, size: coordinate.size, font, color });
    };

    draw(date, caCoordinates.date);
    draw(fullName, caCoordinates.clientName, true);
    draw(form.completeAddress, caCoordinates.address);
    draw(form.unitColor, caCoordinates.unitColor, true);
    draw(form.engineNumber, caCoordinates.engineNumber, true);
    draw(form.contactNumber, caCoordinates.contactNumber, true);
    draw(form.seller, caCoordinates.sellerName, true);
    draw(fullName, caCoordinates.buyerName, true);

    const total = paymentKeys.reduce((sum, key) => {
      const payment = form.payments[key];
      return sum + (payment?.enabled ? Number(String(payment.amount ?? "").replace(/,/g, "")) || 0 : 0);
    }, 0);
    draw(total ? total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", caCoordinates.purchasePrice, true);

    paymentKeys.forEach((key) => {
      const payment = form.payments[key] ?? { enabled: false, amount: "" };
      const coordinate = caCoordinates.payments[key];
      page.drawText("X", {
        x: payment.enabled ? coordinate.yesX : coordinate.noX,
        y: coordinate.y,
        size: 8,
        font: bold,
        color
      });
      if (payment.enabled && payment.amount) {
        page.drawText(money(payment.amount), {
          x: coordinate.amountX,
          y: coordinate.y,
          size: 8,
          font: bold,
          color
        });
      }
    });

    const output = await document.save();
    return new NextResponse(Buffer.from(output), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="DREAMBIKE_CA_${uppercase(form.surname).replace(/\s+/g, "_")}.pdf"`
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate C.A PDF.", 500);
  }
}
