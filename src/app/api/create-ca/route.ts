import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import type { CaForm, CaPaymentKey, CaTemplateType } from "@/lib/ca-config";
import { generateCreateCaPdf } from "@/lib/create-ca-pdf";

export const dynamic = "force-dynamic";

const paymentKeys: CaPaymentKey[] = [
  "downpayment",
  "reservation",
  "bankTransfer",
  "cash"
];

function uppercase(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

function money(value: string, options: { allowZero?: boolean; prefix?: string } = {}) {
  const numeric = Number(String(value ?? "").replace(/[,\sPp]/g, ""));
  if (!Number.isFinite(numeric)) return "";
  if (!numeric && !options.allowZero) return "";
  const formatted = numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${options.prefix ?? ""}${formatted}`;
}

function agreedPrice(value: string) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) return "";
  const numeric = Number(cleaned.replace(/[,\sPp]/g, ""));
  if (Number.isFinite(numeric)) return money(cleaned, { allowZero: true, prefix: "P " });
  return uppercase(cleaned);
}

function middleInitial(value: string) {
  const cleaned = uppercase(value).replace(/\./g, "");
  return cleaned ? `${cleaned}.` : "";
}

function paymentValues(form: CaForm, key: CaPaymentKey) {
  const payment = form.payments[key] ?? { enabled: false, amount: "" };
  return {
    yes: payment.enabled ? "\u2713" : "",
    no: payment.enabled ? "" : "\u2713",
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
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila"
  });
  const downpayment = paymentValues(form, "downpayment");
  const reservation = paymentValues(form, "reservation");
  const bankTransfer = paymentValues(form, "bankTransfer");
  const cash = paymentValues(form, "cash");

  return {
    "{{DATE}}": date,
    "{{BUYER_NAME}}": buyerName,
    "{{BUYER}}": buyerName,
    "{{buyer}}": buyerName,
    "{{CLIENT_NAME}}": buyerName,
    "{{SURNAME}}": uppercase(form.surname),
    "{{FIRST_NAME}}": uppercase(form.firstName),
    "{{MIDDLE_INITIAL}}": middleInitial(form.middleInitial),
    "{{ADDRESS}}": uppercase(form.completeAddress),
    "{{COMPLETE_ADDRESS}}": uppercase(form.completeAddress),
    "{{AGREED_PRICE}}": agreedPrice(form.agreedPrice),
    "{{PURCHASE_PRICE}}": agreedPrice(form.agreedPrice),
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
    "{{DP_YES}}": downpayment.yes,
    "{{DP_NO}}": downpayment.no,
    "{{DP_AMOUNT}}": downpayment.amount,
    "{{RESERVATION_YES}}": reservation.yes,
    "{{RESERVATION_NO}}": reservation.no,
    "{{RESERVATION_AMOUNT}}": reservation.amount,
    "{{TOO_REG_YES}}": reservation.yes,
    "{{TOO_REG_NO}}": reservation.no,
    "{{TOO_REG_AMOUNT}}": reservation.amount,
    "{{BANK_TRANSFER_YES}}": bankTransfer.yes,
    "{{BANK_TRANSFER_NO}}": bankTransfer.no,
    "{{BANK_TRANSFER_AMOUNT}}": bankTransfer.amount,
    "{{EWB_YES}}": bankTransfer.yes,
    "{{EWB_NO}}": bankTransfer.no,
    "{{EWB_AMOUNT}}": bankTransfer.amount,
    "{{EWB_BANK_TRANSFER_YES}}": bankTransfer.yes,
    "{{EWB_BANK_TRANSFER_NO}}": bankTransfer.no,
    "{{EWB_BANK_TRANSFER_AMOUNT}}": bankTransfer.amount,
    "{{CASH_YES}}": cash.yes,
    "{{CASH_NO}}": cash.no,
    "{{CASH_AMOUNT}}": cash.amount
  };
}

export async function POST(request: NextRequest) {
  const user = await requireAllowedUser(request);
  if (user.error) return user.error;

  try {
    const form = (await request.json()) as CaForm & { templateType?: CaTemplateType };
    const templateType = form.templateType ?? "bristol";
    if (templateType !== "bristol" && templateType !== "usedSwap") {
      return jsonError("Invalid C.A template type.");
    }
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

    const unitFileLabel = templateType === "bristol" ? "BRISTOL" : "USED_SWAP";
    const fileName = `DREAMBIKE_CA_${unitFileLabel}_${uppercase(form.surname).replace(/\s+/g, "_")}.pdf`;
    const values = createPlaceholderValues(form);
    const pdf = await generateCreateCaPdf(templateType, values);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate C.A PDF.", 500);
  }
}
