"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileCheck2, RefreshCw, Undo2, X } from "lucide-react";
import type { McReleaseForm, MotorcycleCatalog, MotorcycleMatch } from "@/lib/mc-release-config";
import { PageHeader } from "./page-header";

const today = new Date().toISOString().slice(0, 10);
const initialForm: McReleaseForm = {
  unitCode: "",
  releaseDate: today,
  surname: "",
  firstName: "",
  middleName: "",
  birthday: "",
  cpNumber: "",
  addressLine: "",
  barangay: "",
  cityTown: "",
  province: "",
  waiver: "",
  amount: ""
};

const fields: Array<{ key: keyof McReleaseForm; label: string; type?: string; required?: boolean }> = [
  { key: "releaseDate", label: "Release Date", type: "date", required: true },
  { key: "surname", label: "Surname", required: true },
  { key: "firstName", label: "First Name", required: true },
  { key: "middleName", label: "Middle Name" },
  { key: "birthday", label: "Birthday", type: "date", required: true },
  { key: "cpNumber", label: "CP Number", type: "tel", required: true },
  { key: "addressLine", label: "Blk/House No./Street/Subdivision", required: true },
  { key: "barangay", label: "Barangay", required: true },
  { key: "cityTown", label: "City/Town", required: true },
  { key: "province", label: "Province", required: true },
  { key: "waiver", label: "Waiver" },
  { key: "amount", label: "Amount", type: "number", required: true }
];

export function McReleasePage() {
  const [form, setForm] = useState<McReleaseForm>(initialForm);
  const [catalog, setCatalog] = useState<MotorcycleCatalog>({ models: [], motorcycles: [] });
  const [selectedModel, setSelectedModel] = useState("");
  const [motor, setMotor] = useState<MotorcycleMatch | null>(null);
  const [message, setMessage] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("MC_Release_Documents.pdf");
  const [lastSaved, setLastSaved] = useState<{ journalRow: number; stockRow: number; unitCode: string } | null>(null);
  const pdfRef = useRef("");

  useEffect(() => {
    pdfRef.current = pdfUrl;
  }, [pdfUrl]);

  useEffect(() => {
    return () => {
      if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
    };
  }, []);

  function setValue(key: keyof McReleaseForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "unitCode") setMotor(null);
  }

  const modelMotorcycles = catalog.motorcycles
    .filter((item) => item.unitModel.trim().toUpperCase() === selectedModel.trim().toUpperCase());
  const normalizedPnpStatus = motor?.pnpCsrStatus.trim().toUpperCase() ?? "";
  const hasClearance = normalizedPnpStatus === "WITH CLEARANCE";
  const noClearance = normalizedPnpStatus === "NO CP";
  const displayedPnpStatus = noClearance ? "NO PNP CLEARANCE" : normalizedPnpStatus || "-";

  const clearPdf = useCallback(() => {
    if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
    pdfRef.current = "";
    setPdfUrl("");
  }, []);

  function reset() {
    clearPdf();
    setForm({ ...initialForm, releaseDate: new Date().toISOString().slice(0, 10) });
    setSelectedModel("");
    setMotor(null);
    setLastSaved(null);
    setMessage("");
  }

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setMessage("");
    clearPdf();
    const response = await fetch("/api/mc-release");
    const body = await response.json();
    if (!response.ok) {
      setCatalog({ models: [], motorcycles: [] });
      setMotor(null);
      setMessage(body.error ?? "Unable to load motorcycle list.");
    } else {
      setCatalog(body);
      setMessage(`Loaded ${body.motorcycles?.length ?? 0} motorcycle units.`);
    }
    setLoadingCatalog(false);
  }, [clearPdf]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  function selectModel(model: string) {
    setSelectedModel(model);
    setForm((current) => ({ ...current, unitCode: "" }));
    setMotor(null);
    clearPdf();
  }

  function selectUnitCode(unitCode: string) {
    setForm((current) => ({ ...current, unitCode }));
    setMotor(catalog.motorcycles.find((item) => item.unitCode === unitCode) ?? null);
    clearPdf();
  }

  async function generate() {
    if (!motor) {
      setMessage("Find and confirm the Motorcycle Unit Code first.");
      return;
    }

    setGenerating(true);
    setMessage("");
    clearPdf();
    const response = await fetch("/api/mc-release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!response.ok) {
      const body = await response.json();
      if (body.saved && body.journalRow && body.stockRow && body.unitCode) {
        setLastSaved({
          journalRow: Number(body.journalRow),
          stockRow: Number(body.stockRow),
          unitCode: String(body.unitCode)
        });
      }
      setMessage(body.error ?? "Unable to generate documents.");
      setGenerating(false);
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    setPdfName(match?.[1] ?? "MC_Release_Documents.pdf");
    setPdfUrl(URL.createObjectURL(blob));
    const journalRow = Number(response.headers.get("x-journal-row"));
    const stockRow = Number(response.headers.get("x-stock-row"));
    setLastSaved({ journalRow, stockRow, unitCode: form.unitCode });
    setMessage(`Saved to MC Journal row ${journalRow || ""}. PDF is ready.`);
    setGenerating(false);
  }

  async function revertLastRecord() {
    if (!lastSaved) return;
    setGenerating(true);
    const response = await fetch("/api/mc-release", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastSaved)
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to revert the last record.");
      setGenerating(false);
      return;
    }
    clearPdf();
    setLastSaved(null);
    await loadCatalog();
    setMessage(`MC Journal row ${body.journalRow} was cleared and the stock unit is available again.`);
    setGenerating(false);
  }

  return (
    <>
      <PageHeader title="BRISTOL MC Release">
        <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={reset} type="button">
          <X size={16} />
          Exit / Clear
        </button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">Motorcycle Details</h3>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 disabled:opacity-50" disabled={loadingCatalog} onClick={loadCatalog} title="Refresh motorcycle list" type="button">
              <RefreshCw className={loadingCatalog ? "animate-spin" : ""} size={16} />
            </button>
          </div>

          <div className="grid max-h-[440px] gap-3 overflow-y-auto pr-1">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Unit Model
              <select value={selectedModel} onChange={(event) => selectModel(event.target.value)}>
                <option value="">Select unit model</option>
                {catalog.models.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Motorcycle Unit Code
              <select disabled={!selectedModel} value={form.unitCode} onChange={(event) => selectUnitCode(event.target.value)}>
                <option value="">Select unit code</option>
                {modelMotorcycles.map((item) => <option key={item.unitCode} value={item.unitCode}>{item.unitCode}</option>)}
              </select>
            </label>

            {motor ? (
              <div className="grid gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
                <p><span className="font-semibold">Unit Model:</span> {motor.unitModel || "-"}</p>
                <p><span className="font-semibold">Unit Code:</span> {motor.unitCode || "-"}</p>
                <p><span className="font-semibold">Engine #:</span> {motor.engineNumber || "-"}</p>
                <p><span className="font-semibold">Chassis #:</span> {motor.chassisNumber || "-"}</p>
                <p><span className="font-semibold">Color:</span> {motor.color || "-"}</p>
                <p>
                  <span className="font-semibold">PNP / CSR Status:</span>{" "}
                  <strong className={hasClearance ? "text-emerald-700" : noClearance ? "text-red-600" : "text-slate-700"}>
                    {displayedPnpStatus}
                  </strong>
                </p>
              </div>
            ) : null}
          </div>

          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h3 className="mb-3 font-semibold text-ink">Client and Release Details</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className={field.key === "addressLine" ? "grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2" : "grid gap-1.5 text-sm font-medium text-slate-700"}>
                {field.label}
                <input
                  required={field.required}
                  type={field.type ?? "text"}
                  value={form[field.key]}
                  onChange={(event) => setValue(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!motor || !form.amount.trim() || generating} onClick={generate} type="button">
              <FileCheck2 size={16} />
              {generating ? "Saving and generating..." : "Save and Generate PDF"}
            </button>
            {pdfUrl ? (
              <a className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" download={pdfName} href={pdfUrl}>
                <Download size={16} />
                Download Combined PDF
              </a>
            ) : null}
            {lastSaved ? (
              <button className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50" disabled={generating} onClick={revertLastRecord} type="button">
                <Undo2 size={16} />
                Revert Last Record
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
