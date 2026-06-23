import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { getGoogleAuth } from "@/lib/google-sheets";
import type { CaForm, CaPaymentKey } from "@/lib/ca-config";

export const dynamic = "force-dynamic";

const caTemplateDocumentId = "159LvMzWs_8z6eQzbZ9tN7nO3Cti-peLIl4lsg7bgYmU";
const caPaymentKeys: CaPaymentKey[] = [
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

function paymentValues(form: CaForm, key: keyof CaForm["payments"]) {
  const payment = form.payments[key] ?? { enabled: false, amount: "" };
  return {
    yes: payment.enabled ? "X" : "",
    no: payment.enabled ? "" : "X",
    amount: payment.enabled ? money(payment.amount) : ""
  };
}

function replacementGroups(form: CaForm) {
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

  return [
    { names: ["{{DATE}}"], value: date, required: true },
    { names: ["{{BUYER_NAME}}", "{{CLIENT_NAME}}"], value: buyerName, required: true },
    { names: ["{{SURNAME}}"], value: uppercase(form.surname) },
    { names: ["{{FIRST_NAME}}"], value: uppercase(form.firstName) },
    { names: ["{{MIDDLE_INITIAL}}"], value: middleInitial(form.middleInitial) },
    { names: ["{{ADDRESS}}", "{{COMPLETE_ADDRESS}}"], value: uppercase(form.completeAddress), required: true },
    { names: ["{{AGREED_PRICE}}", "{{PURCHASE_PRICE}}"], value: money(form.agreedPrice), required: true },
    { names: ["{{UNIT_DETAILS}}", "{{UNIT_MODEL}}"], value: uppercase(form.unitDetails), required: true },
    { names: ["{{UNIT_COLOR}}", "{{COLOR}}"], value: uppercase(form.unitColor), required: true },
    { names: ["{{ENGINE_NUMBER}}", "{{ENGINE_NO}}"], value: uppercase(form.engineNumber), required: true },
    { names: ["{{CHASSIS_NUMBER}}", "{{CHASSIS_NO}}"], value: uppercase(form.chassisNumber), required: true },
    { names: ["{{CONTACT_NUMBER}}", "{{CP_NUMBER}}"], value: uppercase(form.contactNumber), required: true },
    { names: ["{{SELLER_NAME}}", "{{SELLER}}"], value: uppercase(form.seller), required: true },
    { names: ["{{DOWNPAYMENT_YES}}"], value: downpayment.yes },
    { names: ["{{DOWNPAYMENT_NO}}"], value: downpayment.no },
    { names: ["{{DOWNPAYMENT_AMOUNT}}"], value: downpayment.amount },
    { names: ["{{RESERVATION_YES}}"], value: reservation.yes },
    { names: ["{{RESERVATION_NO}}"], value: reservation.no },
    { names: ["{{RESERVATION_AMOUNT}}"], value: reservation.amount },
    { names: ["{{BANK_TRANSFER_YES}}", "{{EWB_YES}}"], value: bankTransfer.yes },
    { names: ["{{BANK_TRANSFER_NO}}", "{{EWB_NO}}"], value: bankTransfer.no },
    { names: ["{{BANK_TRANSFER_AMOUNT}}", "{{EWB_AMOUNT}}"], value: bankTransfer.amount },
    { names: ["{{CASH_YES}}"], value: cash.yes },
    { names: ["{{CASH_NO}}"], value: cash.no },
    { names: ["{{CASH_AMOUNT}}"], value: cash.amount }
  ];
}

export async function POST(request: NextRequest) {
  const user = await requireAllowedUser(request);
  if (user.error) return user.error;

  let temporaryDocumentId = "";

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

    const paymentWithoutAmount = caPaymentKeys.find(
      (key) => form.payments[key]?.enabled && !String(form.payments[key]?.amount ?? "").trim()
    );
    if (paymentWithoutAmount) return jsonError(`Amount is required for ${paymentWithoutAmount}.`);

    const auth = getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });
    const templateId = process.env.GOOGLE_DOCS_CA_TEMPLATE_ID?.trim() || caTemplateDocumentId;

    const copied = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: `TEMP_CA_${uppercase(form.surname)}_${Date.now()}`
      },
      fields: "id"
    });
    temporaryDocumentId = copied.data.id ?? "";
    if (!temporaryDocumentId) throw new Error("Unable to create a temporary C.A document.");

    const groups = replacementGroups(form);
    const requests = groups.flatMap((group) =>
      group.names.map((name) => ({
        replaceAllText: {
          containsText: {
            text: name,
            matchCase: true
          },
          replaceText: group.value
        }
      }))
    );
    const updated = await docs.documents.batchUpdate({
      documentId: temporaryDocumentId,
      requestBody: { requests }
    });

    let replyIndex = 0;
    const missingPlaceholders: string[] = [];
    groups.forEach((group) => {
      let replacements = 0;
      group.names.forEach(() => {
        replacements += updated.data.replies?.[replyIndex]?.replaceAllText?.occurrencesChanged ?? 0;
        replyIndex += 1;
      });
      if (group.required && replacements === 0) missingPlaceholders.push(group.names[0]);
    });
    if (missingPlaceholders.length) {
      throw new Error(
        `Missing Google Docs placeholders: ${missingPlaceholders.join(", ")}. Add them to the template as plain, unbroken text.`
      );
    }

    const exported = await drive.files.export(
      {
        fileId: temporaryDocumentId,
        mimeType: "application/pdf"
      },
      {
        responseType: "arraybuffer"
      }
    );

    return new NextResponse(Buffer.from(exported.data as ArrayBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="DREAMBIKE_CA_${uppercase(form.surname).replace(/\s+/g, "_")}.pdf"`
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate C.A PDF.", 500);
  } finally {
    if (temporaryDocumentId) {
      try {
        const auth = getGoogleAuth();
        const drive = google.drive({ version: "v3", auth });
        await drive.files.delete({ fileId: temporaryDocumentId });
      } catch {
        // Cleanup failure should not replace the generation result.
      }
    }
  }
}
