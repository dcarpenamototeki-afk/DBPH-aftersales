import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { CaTemplateType } from "./ca-config";

type PlaceholderValues = Record<string, string>;

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

const black = rgb(0, 0, 0);
const white = rgb(1, 1, 1);

function value(values: PlaceholderValues, key: string) {
  return String(values[key] ?? "").trim();
}

function phpValue(text: string) {
  return text.replace(/^P\s*/i, "");
}

function pageY(page: PDFPage, top: number, textSize: number) {
  return page.getHeight() - top - textSize;
}

function cover(page: PDFPage, x: number, top: number, width: number, height: number) {
  page.drawRectangle({
    x,
    y: page.getHeight() - top - height,
    width,
    height,
    color: white
  });
}

function drawFittedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    top: number;
    maxWidth: number;
    size?: number;
    minSize?: number;
    font: PDFFont;
    align?: "left" | "center";
  }
) {
  const clean = text.trim();
  if (!clean) return;
  let size = options.size ?? 10;
  const minimum = options.minSize ?? 6;
  while (size > minimum && options.font.widthOfTextAtSize(clean, size) > options.maxWidth) {
    size -= 0.25;
  }
  const width = options.font.widthOfTextAtSize(clean, size);
  const x = options.align === "center" ? options.x + (options.maxWidth - width) / 2 : options.x;
  page.drawText(clean, { x, y: pageY(page, options.top, size), size, font: options.font, color: black });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  options: { x: number; top: number; maxWidth: number; size: number; lineHeight: number; font: PDFFont }
) {
  wrapText(text, options.font, options.size, options.maxWidth).forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: pageY(page, options.top + index * options.lineHeight, options.size),
      size: options.size,
      font: options.font,
      color: black
    });
  });
}

function drawBristol(page: PDFPage, values: PlaceholderValues, fonts: PdfFonts) {
  cover(page, 413, 33, 150, 22);
  drawFittedText(page, `DATE: ${value(values, "{{DATE}}")}`, {
    x: 416, top: 37, maxWidth: 144, size: 10, font: fonts.regular, align: "center"
  });

  const fields = [
    [value(values, "{{BUYER_NAME}}"), 101, 181, 238],
    [value(values, "{{ADDRESS}}"), 216, 195, 334],
    [value(values, "{{AGREED_PRICE}}"), 304, 252, 247],
    [value(values, "{{UNIT_DETAILS}}"), 219, 280, 207],
    [value(values, "{{UNIT_COLOR}}"), 219, 308, 207],
    [value(values, "{{ENGINE_NUMBER}}"), 219, 335, 207],
    [value(values, "{{CHASSIS_NUMBER}}"), 219, 363, 207],
    [value(values, "{{CONTACT_NUMBER}}"), 219, 390, 207]
  ] as const;
  fields.forEach(([text, x, top, maxWidth]) => {
    drawFittedText(page, text, { x, top, maxWidth, size: 9.5, minSize: 6, font: fonts.bold });
  });

  const payments = [
    ["{{DOWNPAYMENT_YES}}", "{{DOWNPAYMENT_AMOUNT}}", 431],
    ["{{RESERVATION_YES}}", "{{RESERVATION_AMOUNT}}", 443],
    ["{{EWB_YES}}", "{{EWB_AMOUNT}}", 454.5],
    ["{{CASH_YES}}", "{{CASH_AMOUNT}}", 466]
  ] as const;
  payments.forEach(([yesKey, amountKey, top]) => {
    if (value(values, yesKey)) {
      page.drawText("X", { x: 190, y: pageY(page, top, 8), size: 8, font: fonts.bold, color: black });
    }
    drawFittedText(page, value(values, amountKey), {
      x: 250, top, maxWidth: 62, size: 8, minSize: 6, font: fonts.regular
    });
  });

  drawFittedText(page, value(values, "{{SELLER_NAME}}"), {
    x: 88, top: 598, maxWidth: 166, size: 9, minSize: 6, font: fonts.bold, align: "center"
  });
  drawFittedText(page, value(values, "{{BUYER_NAME}}"), {
    x: 340, top: 598, maxWidth: 166, size: 9, minSize: 6, font: fonts.bold, align: "center"
  });
}

function drawUsedSwap(page: PDFPage, values: PlaceholderValues, fonts: PdfFonts) {
  cover(page, 414, 35, 145, 28);
  drawFittedText(page, `DATE: ${value(values, "{{DATE}}")}`, {
    x: 420, top: 43, maxWidth: 133, size: 10, font: fonts.bold, align: "center"
  });

  cover(page, 30, 174, 536, 77);
  drawWrappedText(
    page,
    `and ${value(values, "{{BUYER_NAME}}")}, of legal age, Filipino citizen, with residence and postal address at ${value(values, "{{ADDRESS}}")} herein after referred to as \"VENDEE\"`,
    { x: 36, top: 179, maxWidth: 524, size: 10, lineHeight: 13, font: fonts.regular }
  );
  drawWrappedText(
    page,
    `WHEREAS, the VENDEE has offered to buy and the VENDOR has agreed to sell \"AS IS WHERE IS / NO WARRANTY\" of the unit and BOTH agreed for the price of: PHP ${phpValue(value(values, "{{AGREED_PRICE}}"))}`,
    { x: 36, top: 218, maxWidth: 524, size: 10, lineHeight: 13, font: fonts.regular }
  );

  cover(page, 30, 258, 536, 474);
  const detailRows = [
    ["UNIT DETAILS", value(values, "{{UNIT_DETAILS}}")],
    ["UNIT COLOR", value(values, "{{UNIT_COLOR}}")],
    ["ENGINE NUMBER", value(values, "{{ENGINE_NUMBER}}")],
    ["CHASSIS NUMBER", value(values, "{{CHASSIS_NUMBER}}")],
    ["CONTACT NUMBERS", value(values, "{{CONTACT_NUMBER}}")]
  ];
  const detailTop = 270;
  const detailHeight = 23;
  detailRows.forEach(([label, text], index) => {
    const top = detailTop + index * detailHeight;
    page.drawText(`${label}:`, { x: 90, y: pageY(page, top + 6, 9), size: 9, font: fonts.bold, color: black });
    page.drawRectangle({
      x: 270,
      y: page.getHeight() - top - detailHeight,
      width: 260,
      height: detailHeight,
      borderColor: black,
      borderWidth: 0.7
    });
    drawFittedText(page, text, { x: 277, top: top + 6, maxWidth: 246, size: 9, minSize: 6, font: fonts.bold });
  });

  const paymentRows = [
    ["DOWNPAYMENT", "{{DOWNPAYMENT_YES}}", "{{DOWNPAYMENT_AMOUNT}}"],
    ["EWB / BANK TRANSFER", "{{EWB_YES}}", "{{EWB_AMOUNT}}"],
    ["TOO / REG", "{{TOO_REG_YES}}", "{{TOO_REG_AMOUNT}}"],
    ["CASH", "{{CASH_YES}}", "{{CASH_AMOUNT}}"]
  ] as const;
  const paymentX = 90;
  const paymentTop = 398;
  const paymentHeight = 29;
  const paymentWidths = [205, 48, 187];
  paymentRows.forEach(([label, yesKey, amountKey], index) => {
    const top = paymentTop + index * paymentHeight;
    let x = paymentX;
    paymentWidths.forEach((width) => {
      page.drawRectangle({
        x,
        y: page.getHeight() - top - paymentHeight,
        width,
        height: paymentHeight,
        borderColor: black,
        borderWidth: 0.7
      });
      x += width;
    });
    page.drawText(label, { x: paymentX + 7, y: pageY(page, top + 9, 8), size: 8, font: fonts.bold, color: black });
    if (value(values, yesKey)) {
      page.drawText("X", { x: paymentX + paymentWidths[0] + 19, y: pageY(page, top + 8, 10), size: 10, font: fonts.bold, color: black });
    }
    drawFittedText(page, `PHP. ${value(values, amountKey)}`, {
      x: paymentX + paymentWidths[0] + paymentWidths[1] + 7,
      top: top + 9,
      maxWidth: paymentWidths[2] - 14,
      size: 8,
      minSize: 6,
      font: fonts.bold
    });
  });

  drawWrappedText(
    page,
    "NOW THEREFORE, for and in consideration of the foregoing premises and the payment of the agreed purchase price in the manner and form herein stipulated, the VENDOR hereby agrees to SELL, TRANSFER and CONVEY unto the VENDEE his heirs, assigns and successors-in-interest, and the VENDEE hereby agrees to BUY the PROPERTY subject to the following terms and conditions:",
    { x: 36, top: 532, maxWidth: 524, size: 9, lineHeight: 11.5, font: fonts.regular }
  );

  const signatureTop = 638;
  [[70, value(values, "{{SELLER_NAME}}"), "SELLER"], [326, value(values, "{{BUYER_NAME}}"), "BUYER"]].forEach(
    ([x, name, label]) => {
      page.drawLine({ start: { x: Number(x), y: page.getHeight() - signatureTop }, end: { x: Number(x) + 200, y: page.getHeight() - signatureTop }, thickness: 0.8, color: black });
      drawFittedText(page, String(name), { x: Number(x), top: signatureTop - 14, maxWidth: 200, size: 9, minSize: 6, font: fonts.bold, align: "center" });
      drawFittedText(page, String(label), { x: Number(x), top: signatureTop + 7, maxWidth: 200, size: 11, font: fonts.bold, align: "center" });
    }
  );
}

export async function generateCreateCaPdf(templateType: CaTemplateType, values: PlaceholderValues) {
  let pdf: PDFDocument;
  if (templateType === "bristol") {
    const template = await readFile(
      path.join(process.cwd(), "public", "dreambike-contract-agreement-template.pdf")
    );
    pdf = await PDFDocument.load(template);
  } else {
    pdf = await PDFDocument.create();
    for (const fileName of ["used-swap-contract-page-1.png", "used-swap-contract-page-2.png"]) {
      const imageBytes = await readFile(path.join(process.cwd(), "public", fileName));
      const image = await pdf.embedPng(imageBytes);
      const page = pdf.addPage([596, 842]);
      page.drawImage(image, { x: 0, y: 0, width: 596, height: 842 });
    }
  }
  const fonts: PdfFonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold)
  };
  const firstPage = pdf.getPage(0);
  if (templateType === "bristol") drawBristol(firstPage, values, fonts);
  else drawUsedSwap(firstPage, values, fonts);
  return pdf.save();
}
