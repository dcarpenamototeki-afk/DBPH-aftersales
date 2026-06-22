import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { caCoordinates } from "@/lib/ca-config";
import type { CaForm, CaPaymentKey } from "@/lib/ca-config";

export const dynamic = "force-dynamic";

function uppercase(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

function fittedSize(
  text: string,
  font: { widthOfTextAtSize(text: string, size: number): number },
  size: number,
  maxWidth: number,
  minSize = 7
) {
  let fitted = size;
  while (fitted > minSize && font.widthOfTextAtSize(text, fitted) > maxWidth) fitted -= 0.25;
  return fitted;
}

function money(value: string) {
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(numeric) && numeric ? numeric.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

function middleInitial(value: string) {
  const cleaned = uppercase(value).replace(/\./g, "");
  return cleaned ? `${cleaned}.` : "";
}

type RichSegment = {
  text: string;
  font: PDFFont;
  underline?: boolean;
  wideSpacing?: boolean;
};

function richLines(segments: RichSegment[], size: number, maxWidth: number) {
  const tokens = segments.flatMap((segment) =>
    segment.text
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({ ...segment, text }))
  );
  const lines: Array<Array<RichSegment & { drawText: string }>> = [[]];
  let lineWidth = 0;

  tokens.forEach((token) => {
    const currentLine = lines[lines.length - 1];
    const prefix = currentLine.length && !/^[,.;:)]/.test(token.text) ? (token.wideSpacing ? "  " : " ") : "";
    const drawText = `${prefix}${token.text}`;
    const width = token.font.widthOfTextAtSize(drawText, size);

    if (currentLine.length && lineWidth + width > maxWidth) {
      lines.push([{ ...token, drawText: token.text }]);
      lineWidth = token.font.widthOfTextAtSize(token.text, size);
    } else {
      currentLine.push({ ...token, drawText });
      lineWidth += width;
    }
  });

  return lines;
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  try {
    const form = (await request.json()) as CaForm;
    const required = ["surname", "firstName", "completeAddress", "agreedPrice", "unitDetails", "unitColor", "engineNumber", "chassisNumber", "contactNumber", "seller"] as const;
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
    const fullName = [uppercase(form.firstName), middleInitial(form.middleInitial), uppercase(form.surname)].filter(Boolean).join("  ");
    const date = new Date()
      .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Manila" })
      .toUpperCase();

    const draw = (
      value: string,
      coordinate: { x: number; y: number; size: number; maxWidth: number; minSize?: number },
      useBold = false
    ) => {
      const font = useBold ? bold : regular;
      const text = uppercase(value);
      const size = fittedSize(text, font, coordinate.size, coordinate.maxWidth, coordinate.minSize);
      page.drawText(text, { x: coordinate.x, y: coordinate.y, size, font, color });
    };

    const drawCentered = (
      value: string,
      line: { x1: number; x2: number; y: number },
      size: number
    ) => {
      const text = uppercase(value);
      const availableWidth = line.x2 - line.x1;
      const fitted = fittedSize(text, bold, size, availableWidth, 7);
      const width = bold.widthOfTextAtSize(text, fitted);
      page.drawText(text, {
        x: line.x1 + (availableWidth - width) / 2,
        y: line.y + 1.5,
        size: fitted,
        font: bold,
        color
      });
    };

    const drawVendeeParagraph = () => {
      const segments: RichSegment[] = [
        { text: "and", font: regular },
        { text: fullName, font: bold, underline: true, wideSpacing: true },
        { text: ", of legal age, Filipino citizen, with residence and postal address at", font: regular },
        { text: uppercase(form.completeAddress), font: regular, underline: true },
        { text: "herein after referred to as", font: regular },
        { text: "\"VENDEE\"", font: bold }
      ];
      const maxWidth = 490;
      let size = 10;
      let lines = richLines(segments, size, maxWidth);
      while (lines.length > 4 && size > 7.5) {
        size -= 0.25;
        lines = richLines(segments, size, maxWidth);
      }

      page.drawRectangle({
        x: 42,
        y: 596,
        width: 510,
        height: 82,
        color: rgb(1, 1, 1)
      });

      const lineHeight = size + 3;
      lines.forEach((line, lineIndex) => {
        const lineWidth = line.reduce((total, token) => total + token.font.widthOfTextAtSize(token.drawText, size), 0);
        let x = lineIndex === 0 ? 73 : 53;
        if (lineIndex === 0) x += Math.max(0, (450 - lineWidth) / 2);
        const y = 654 - lineIndex * lineHeight;

        line.forEach((token) => {
          const width = token.font.widthOfTextAtSize(token.drawText, size);
          page.drawText(token.drawText, { x, y, size, font: token.font, color });
          if (token.underline) {
            page.drawLine({
              start: { x: x + (token.drawText.startsWith(" ") ? token.font.widthOfTextAtSize(" ", size) : 0), y: y - 1 },
              end: { x: x + width, y: y - 1 },
              thickness: 0.55,
              color
            });
          }
          x += width;
        });
      });
    };

    Object.values(caCoordinates.lines).forEach((line) => {
      page.drawLine({
        start: { x: line.x1, y: line.y },
        end: { x: line.x2, y: line.y },
        thickness: 0.8,
        color
      });
    });

    draw(date, caCoordinates.date);
    drawVendeeParagraph();
    draw(money(form.agreedPrice), caCoordinates.purchasePrice, true);
    draw(form.unitDetails, caCoordinates.unitDetails, true);
    draw(form.unitColor, caCoordinates.unitColor, true);
    draw(form.engineNumber, caCoordinates.engineNumber, true);
    draw(form.chassisNumber, caCoordinates.chassisNumber, true);
    draw(form.contactNumber, caCoordinates.contactNumber, true);
    drawCentered(form.seller, caCoordinates.lines.seller, caCoordinates.sellerName.size);
    drawCentered(fullName, caCoordinates.lines.buyer, caCoordinates.buyerName.size);

    paymentKeys.forEach((key) => {
      const payment = form.payments[key] ?? { enabled: false, amount: "" };
      const coordinate = caCoordinates.payments[key];

      page.drawRectangle({
        x: 211,
        y: coordinate.y - 2,
        width: 135,
        height: 11,
        color: rgb(1, 1, 1)
      });
      page.drawText("PHP.", {
        x: 215,
        y: coordinate.y,
        size: 8,
        font: regular,
        color
      });
      page.drawLine({
        start: { x: 242, y: coordinate.y - 0.5 },
        end: { x: 342, y: coordinate.y - 0.5 },
        thickness: 0.65,
        color
      });

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
