"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileCheck2, X } from "lucide-react";
import type { CaForm, CaPaymentKey, CaTemplateType } from "@/lib/ca-config";
import { PageHeader } from "./page-header";

const emptyForm: CaForm = {
  surname: "",
  firstName: "",
  middleInitial: "",
  completeAddress: "",
  agreedPrice: "",
  unitDetails: "",
  unitColor: "",
  engineNumber: "",
  chassisNumber: "",
  contactNumber: "",
  seller: "",
  payments: {
    downpayment: { enabled: false, amount: "" },
    reservation: { enabled: false, amount: "" },
    bankTransfer: { enabled: false, amount: "" },
    cash: { enabled: false, amount: "" }
  }
};

const payments: Array<{ key: CaPaymentKey; label: string }> = [
  { key: "downpayment", label: "Downpayment" },
  { key: "reservation", label: "TOO / REG" },
  { key: "bankTransfer", label: "EWB / Bank Transfer" },
  { key: "cash", label: "Cash" }
];

export function CreateCaPage() {
  const [form, setForm] = useState<CaForm>(emptyForm);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("DREAMBIKE_CA.pdf");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<CaTemplateType | null>(null);
  const pdfRef = useRef("");

  useEffect(() => {
    pdfRef.current = pdfUrl;
  }, [pdfUrl]);

  useEffect(() => () => {
    if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
  }, []);

  function setValue(key: keyof Omit<CaForm, "payments">, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setPayment(key: CaPaymentKey, update: Partial<CaForm["payments"][CaPaymentKey]>) {
    setForm((current) => ({
      ...current,
      payments: { ...current.payments, [key]: { ...current.payments[key], ...update } }
    }));
  }

  function clearPdf() {
    if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
    pdfRef.current = "";
    setPdfUrl("");
  }

  function reset() {
    clearPdf();
    setForm(emptyForm);
    setMessage("");
  }

  async function generate(templateType: CaTemplateType) {
    setLoading(templateType);
    const unitLabel = templateType === "bristol" ? "Bristol Units" : "Used/Swap Units";
    setMessage(`Generating ${unitLabel} C.A PDF. Google Docs may take a few seconds.`);
    clearPdf();
    const response = await fetch("/api/create-ca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, templateType })
    });
    if (!response.ok) {
      const body = await response.json();
      setMessage(body.error ?? "Unable to generate C.A PDF.");
      setLoading(null);
      return;
    }
    const blob = await response.blob();
    const match = (response.headers.get("content-disposition") ?? "").match(/filename="([^"]+)"/);
    setPdfName(match?.[1] ?? "DREAMBIKE_CA.pdf");
    setPdfUrl(URL.createObjectURL(blob));
    setMessage(`${unitLabel} C.A PDF is ready for preview and download.`);
    setLoading(null);
  }

  return (
    <>
      <PageHeader title="Create C.A">
        <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={reset}>
          <X size={16} />
          Exit / Clear
        </button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[440px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h3 className="mb-3 font-semibold text-ink">Client Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Surname<input value={form.surname} onChange={(event) => setValue("surname", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Name<input value={form.firstName} onChange={(event) => setValue("firstName", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Middle Initial<input maxLength={3} value={form.middleInitial} onChange={(event) => setValue("middleInitial", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Complete Address<textarea rows={2} value={form.completeAddress} onChange={(event) => setValue("completeAddress", event.target.value)} /></label>
          </div>

          <h3 className="mb-3 mt-5 font-semibold text-ink">Unit Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Agreed Price<input placeholder="P 0.00 or SWAP UNIT" value={form.agreedPrice} onChange={(event) => setValue("agreedPrice", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Unit Details<input value={form.unitDetails} onChange={(event) => setValue("unitDetails", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Unit Color<input value={form.unitColor} onChange={(event) => setValue("unitColor", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Engine Number<input value={form.engineNumber} onChange={(event) => setValue("engineNumber", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Chassis Number<input value={form.chassisNumber} onChange={(event) => setValue("chassisNumber", event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Contact Number<input value={form.contactNumber} onChange={(event) => setValue("contactNumber", event.target.value)} /></label>
          </div>

          <div className="mt-5 grid gap-3">
            {payments.map((payment) => {
              const value = form.payments[payment.key];
              return (
                <div key={payment.key} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[1fr_auto_150px] sm:items-center">
                  <span className="text-sm font-semibold text-ink">{payment.label}</span>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input checked={value.enabled} type="checkbox" onChange={(event) => setPayment(payment.key, { enabled: event.target.checked, amount: event.target.checked ? value.amount : "" })} />
                    Yes
                  </label>
                  <input
                    disabled={!value.enabled}
                    inputMode="decimal"
                    min="0"
                    placeholder="Amount"
                    type="text"
                    value={value.amount}
                    onChange={(event) => setPayment(payment.key, { amount: event.target.value })}
                  />
                </div>
              );
            })}
          </div>

          <label className="mt-5 grid gap-1.5 text-sm font-medium text-slate-700">DBPH Representative (Seller)<input value={form.seller} onChange={(event) => setValue("seller", event.target.value)} /></label>
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={Boolean(loading)}
              onClick={() => generate("bristol")}
              type="button"
            >
              <FileCheck2 size={16} />
              {loading === "bristol" ? "Generating..." : "BRISTOL UNITS"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={Boolean(loading)}
              onClick={() => generate("usedSwap")}
              type="button"
            >
              <FileCheck2 size={16} />
              {loading === "usedSwap" ? "Generating..." : "USED/SWAP UNITS"}
            </button>
          </div>
        </section>

        <section className="min-h-[720px] rounded-lg border border-line bg-white p-4 shadow-soft">
          {pdfUrl ? (
            <>
              <div className="mb-3 flex justify-end">
                <a className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" download={pdfName} href={pdfUrl}>
                  <Download size={16} />
                  Download PDF
                </a>
              </div>
              <iframe className="h-[760px] w-full rounded-md border border-line" src={pdfUrl} title="C.A PDF Preview" />
            </>
          ) : (
            <div className="grid min-h-[680px] place-items-center text-center text-sm text-slate-500">Generated C.A preview will appear here.</div>
          )}
        </section>
      </div>
    </>
  );
}
