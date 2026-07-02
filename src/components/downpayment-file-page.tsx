"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileCheck2, X } from "lucide-react";
import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import {
  DownpaymentForm,
  DownpaymentTextField,
  downpaymentTemplatePath,
  downpaymentTextFields,
  emptyDownpaymentForm,
  signatureDateField
} from "@/lib/downpayment-file-config";
import { PageHeader } from "./page-header";

function fitText(font: PDFFont, text: string, field: DownpaymentTextField) {
  let size = field.size;
  while (size > 5.5 && font.widthOfTextAtSize(text, size) > field.maxWidth) size -= 0.25;
  return size;
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function formatAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("en-PH", { maximumFractionDigits: 2 }) : value;
}

function safeFileName(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "CLIENT";
}

export function DownpaymentFilePage() {
  const [form, setForm] = useState<DownpaymentForm>(emptyDownpaymentForm);
  const [pdfUrl, setPdfUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const pdfUrlRef = useRef("");

  useEffect(() => {
    pdfUrlRef.current = pdfUrl;
  }, [pdfUrl]);

  useEffect(() => () => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
  }, []);

  function updateValue(key: keyof DownpaymentForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clearGenerated() {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = "";
    setPdfUrl("");
  }

  function reset() {
    clearGenerated();
    setForm({ ...emptyDownpaymentForm, date: new Date().toISOString().slice(0, 10) });
    setMessage("");
  }

  async function generatePdf() {
    const missing = Object.entries(form).find(([, value]) => !String(value).trim());
    if (missing) {
      setMessage("Please complete all fields before generating the PDF.");
      return;
    }

    setLoading(true);
    setMessage("");
    clearGenerated();

    try {
      const templateResponse = await fetch(downpaymentTemplatePath);
      if (!templateResponse.ok) throw new Error("Unable to load the Downpayment File template.");

      const document = await PDFDocument.load(await templateResponse.arrayBuffer());
      const page = document.getPage(0);
      const font = await document.embedFont(StandardFonts.HelveticaBold);
      const values: Record<string, string> = {
        ...form,
        date: formatDate(form.date),
        totalPurchasePrice: formatAmount(form.totalPurchasePrice),
        downPaymentReceived: formatAmount(form.downPaymentReceived),
        signatureName: form.fullName
      };

      Object.entries(downpaymentTextFields).forEach(([key, field]) => {
        const text = (values[key] ?? "").trim().toUpperCase();
        page.drawText(text, {
          x: field.x,
          y: field.y,
          size: fitText(font, text, field),
          font,
          color: rgb(0.03, 0.03, 0.03)
        });
      });

      const signatureDate = formatDate(form.date);
      page.drawText(signatureDate, {
        x: signatureDateField.x,
        y: signatureDateField.y,
        size: fitText(font, signatureDate, signatureDateField),
        font,
        color: rgb(0.03, 0.03, 0.03)
      });

      const bytes = await document.save();
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
      setMessage("Downpayment File is ready for preview and download.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate the Downpayment File.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Downpayment File">
        <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={reset}>
          <X size={16} />
          Exit / Clear
        </button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[440px_minmax(0,1fr)]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h3 className="font-semibold text-ink">Client Info</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Full Name<input value={form.fullName} onChange={(event) => updateValue("fullName", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Present Address<textarea rows={2} value={form.presentAddress} onChange={(event) => updateValue("presentAddress", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">CP #<input inputMode="tel" value={form.contactNumber} onChange={(event) => updateValue("contactNumber", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Valid ID Presented<input value={form.validIdPresented} onChange={(event) => updateValue("validIdPresented", event.target.value)} /></label>
          </div>

          <h3 className="mt-5 font-semibold text-ink">Payment Details</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Total Purchase Price<input min="0" type="number" value={form.totalPurchasePrice} onChange={(event) => updateValue("totalPurchasePrice", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Down Payment Amount Received<input min="0" type="number" value={form.downPaymentReceived} onChange={(event) => updateValue("downPaymentReceived", event.target.value)} /></label>
          </div>

          <h3 className="mt-5 font-semibold text-ink">Unit Description</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Year Model<input value={form.yearModel} onChange={(event) => updateValue("yearModel", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Brand / Series / Color<input value={form.brandSeriesColor} onChange={(event) => updateValue("brandSeriesColor", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Engine Number<input value={form.engineNumber} onChange={(event) => updateValue("engineNumber", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Chassis Number<input value={form.chassisNumber} onChange={(event) => updateValue("chassisNumber", event.target.value)} /></label>
          </div>

          <h3 className="mt-5 font-semibold text-ink">For Signature</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Name<input disabled value={form.fullName} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Date<input type="date" value={form.date} onChange={(event) => updateValue("date", event.target.value)} /></label>
          </div>

          {message ? <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</p> : null}
          <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loading} onClick={generatePdf}>
            <FileCheck2 size={16} />
            {loading ? "Generating..." : "Generate PDF"}
          </button>
        </section>

        <section className="min-h-[720px] rounded-lg border border-line bg-white p-4 shadow-soft">
          {pdfUrl ? (
            <>
              <div className="mb-3 flex justify-end">
                <a className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" download={`Downpayment_${safeFileName(form.fullName)}.pdf`} href={pdfUrl}>
                  <Download size={16} />
                  Download PDF
                </a>
              </div>
              <iframe className="h-[780px] w-full rounded-md border border-line" src={pdfUrl} title="Downpayment File Preview" />
            </>
          ) : (
            <div className="grid min-h-[680px] place-items-center text-center text-sm text-slate-500">Generated Downpayment File preview will appear here.</div>
          )}
        </section>
      </div>
    </>
  );
}
