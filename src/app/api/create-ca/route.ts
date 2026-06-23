import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import type { CaForm, CaPaymentKey } from "@/lib/ca-config";

export const dynamic = "force-dynamic";

const defaultAppsScriptUrl =
  "https://script.google.com/macros/s/AKfycbzCHocS4kBlxA7c60WRz5AvJXsyne7zR5vGvnF9E4vSJ584z_tII7XrTjZvFpkz8Gmh/exec";
const paymentKeys: CaPaymentKey[] = [
  "downpayment",
  "reservation",
  "bankTransfer",
  "cash"
];

function uppercase(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

function money(value: string) {
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(numeric) && numeric
    ? numeric.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : "";
}

function middleInitial(value: string) {
  const cleaned = uppercase(value).replace(/\./g, "");
  return cleaned ? `${cleaned}.` : "";
}

function paymentValues(form: CaForm, key: CaPaymentKey) {
  const payment = form.payments[key] ?? { enabled: false, amount: "" };
  return {
    yes: payment.enabled ? "X" : "",
    no: payment.enabled ? "" : "X",
    amount: payment.enabled ? money(payment.amount) : ""
  };
}

function createPlaceholderValues(form: CaForm) {
  const buyerName = [
    uppercase(form.firstName),
    middleInitial(form.middleInitial),
    uppercase(form.surname)
  ].filter(Boolean).join(" ");
  const date = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    timeZone: "Asia/Manila"
  });
  const downpayment = paymentValues(form, "downpayment");
  const reservation = paymentValues(form, "reservation");
  const bankTransfer = paymentValues(form, "bankTransfer");
  const cash = paymentValues(form, "cash");

  return {
    "{{DATE}}": date,
    "{{BUYER_NAME}}": buyerName,
    "{{CLIENT_NAME}}": buyerName,
    "{{SURNAME}}": uppercase(form.surname),
    "{{FIRST_NAME}}": uppercase(form.firstName),
    "{{MIDDLE_INITIAL}}": middleInitial(form.middleInitial),
    "{{ADDRESS}}": uppercase(form.completeAddress),
    "{{COMPLETE_ADDRESS}}": uppercase(form.completeAddress),
    "{{AGREED_PRICE}}": money(form.agreedPrice),
    "{{PURCHASE_PRICE}}": money(form.agreedPrice),
    "{{UNIT_DETAILS}}": uppercase(form.unitDetails),
    "{{UNIT_MODEL}}": uppercase(form.unitDetails),
    "{{UNIT_COLOR}}": uppercase(form.unitColor),
    "{{COLOR}}": uppercase(form.unitColor),
    "{{ENGINE_NUMBER}}": uppercase(form.engineNumber),
    "{{ENGINE_NO}}": uppercase(form.engineNumber),
    "{{CHASSIS_NUMBER}}": uppercase(form.chassisNumber),
    "{{CHASSIS_NO}}": uppercase(form.chassisNumber),
    "{{CONTACT_NUMBER}}": uppercase(form.contactNumber),
    "{{CP_NUMBER}}": uppercase(form.contactNumber),
    "{{SELLER_NAME}}": uppercase(form.seller),
    "{{SELLER}}": uppercase(form.seller),
    "{{DOWNPAYMENT_YES}}": downpayment.yes,
    "{{DOWNPAYMENT_NO}}": downpayment.no,
    "{{DOWNPAYMENT_AMOUNT}}": downpayment.amount,
    "{{RESERVATION_YES}}": reservation.yes,
    "{{RESERVATION_NO}}": reservation.no,
    "{{RESERVATION_AMOUNT}}": reservation.amount,
    "{{BANK_TRANSFER_YES}}": bankTransfer.yes,
    "{{BANK_TRANSFER_NO}}": bankTransfer.no,
    "{{BANK_TRANSFER_AMOUNT}}": bankTransfer.amount,
    "{{EWB_YES}}": bankTransfer.yes,
    "{{EWB_NO}}": bankTransfer.no,
    "{{EWB_AMOUNT}}": bankTransfer.amount,
    "{{CASH_YES}}": cash.yes,
    "{{CASH_NO}}": cash.no,
    "{{CASH_AMOUNT}}": cash.amount
  };
}

export async function POST(request: NextRequest) {
  const user = await requireAllowedUser(request);
  if (user.error) return user.error;

  try {
    const form = (await request.json()) as CaForm;
    const required = [
      "surname",
      "firstName",
      "completeAddress",
      "agreedPrice",
      "unitDetails",
      "unitColor",
      "engineNumber",
      "chassisNumber",
      "contactNumber",
      "seller"
    ] as const;
    const missing = required.find((key) => !uppercase(form[key]));
    if (missing) return jsonError(`${missing} is required.`);

    const paymentWithoutAmount = paymentKeys.find(
      (key) => form.payments[key]?.enabled && !String(form.payments[key]?.amount ?? "").trim()
    );
    if (paymentWithoutAmount) return jsonError(`Amount is required for ${paymentWithoutAmount}.`);

    const appsScriptUrl =
      process.env.CREATE_CA_APPS_SCRIPT_URL?.trim() || defaultAppsScriptUrl;
    const secret = process.env.CREATE_CA_APPS_SCRIPT_SECRET?.trim();
    if (!secret) {
      throw new Error("CREATE_CA_APPS_SCRIPT_SECRET is missing in Vercel.");
    }

    const fileName = `DREAMBIKE_CA_${uppercase(form.surname).replace(/\s+/g, "_")}.pdf`;
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret,
        fileName,
        values: createPlaceholderValues(form)
      }),
      cache: "no-store",
      redirect: "follow"
    });
    const responseText = await response.text();
    let result: { error?: string; base64?: string; fileName?: string; mimeType?: string };

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Apps Script returned an invalid response.${responseText ? ` ${responseText.slice(0, 140)}` : ""}`
      );
    }

    if (!response.ok || result.error) {
      throw new Error(result.error || `Apps Script request failed with status ${response.status}.`);
    }
    if (!result.base64) throw new Error("Apps Script did not return a PDF.");

    return new NextResponse(Buffer.from(result.base64, "base64"), {
      headers: {
        "Content-Type": result.mimeType || "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName || fileName}"`
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate C.A PDF.", 500);
  }
}
