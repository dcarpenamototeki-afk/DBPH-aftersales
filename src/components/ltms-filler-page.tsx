"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Download, FileImage, FileText, RotateCcw, Upload, Wand2, X } from "lucide-react";
import { emptyLtmsForm, ltmsFields, ltmsTemplates } from "@/lib/ltms-filler-config";
import type { LtmsFieldKey, LtmsTemplateConfig } from "@/lib/ltms-filler-config";
import { PageHeader } from "./page-header";

type GeneratedImage = {
  title: string;
  outputName: string;
  url: string;
};

type PdfImageKey = "licenseFront" | "licenseBack" | "ltmsPage1" | "ltmsPage2";

type PdfImageInput = {
  name: string;
  blob: Blob;
};

const pdfImageFields: Array<{ key: PdfImageKey; label: string; generatedTitle?: string }> = [
  { key: "licenseFront", label: "License Front" },
  { key: "licenseBack", label: "License Back" },
  { key: "ltmsPage1", label: "LTMS Page 1", generatedTitle: "LTMS Page 1" },
  { key: "ltmsPage2", label: "LTMS Page 2", generatedTitle: "LTMS Page 2" }
];

const emptyPdfImages: Record<PdfImageKey, PdfImageInput | null> = {
  licenseFront: null,
  licenseBack: null,
  ltmsPage1: null,
  ltmsPage2: null
};

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth?: number) {
  if (!maxWidth || ctx.measureText(text).width <= maxWidth) return text;

  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }

  return `${clipped.trimEnd()}...`;
}

function loadTemplate(path: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${path}. Add it to the public folder before deploying.`));
    image.src = path;
  });
}

async function renderTemplate(template: LtmsTemplateConfig, values: Record<LtmsFieldKey, string>) {
  const image = await loadTemplate(template.imagePath);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.drawImage(image, 0, 0);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = template.fillStyle;

  template.coordinates.forEach((coordinate) => {
    const value = values[coordinate.field].trim();
    if (!value) return;

    ctx.font = coordinate.fontSize ? `${coordinate.fontSize}px Arial` : template.font;
    ctx.fillText(fitText(ctx, value.toUpperCase(), coordinate.maxWidth), coordinate.x, coordinate.y);
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to generate the LTMS image."));
    }, "image/png");
  });
}

function revokeGenerated(images: GeneratedImage[]) {
  images.forEach((image) => URL.revokeObjectURL(image.url));
}

function revokeUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

async function blobFromUrl(url: string) {
  const response = await fetch(url);
  return response.blob();
}

async function embedImage(pdf: PDFDocument, blob: Blob) {
  const bytes = await blob.arrayBuffer();
  if (blob.type === "image/jpeg" || blob.type === "image/jpg") {
    return pdf.embedJpg(bytes);
  }
  return pdf.embedPng(bytes);
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}

export function LtmsFillerPage() {
  const [values, setValues] = useState<Record<LtmsFieldKey, string>>(emptyLtmsForm);
  const [generated, setGenerated] = useState<GeneratedImage[]>([]);
  const [pdfImages, setPdfImages] = useState<Record<PdfImageKey, PdfImageInput | null>>(emptyPdfImages);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfInputKey, setPdfInputKey] = useState(0);
  const [message, setMessage] = useState("");
  const [pdfMessage, setPdfMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const generatedRef = useRef<GeneratedImage[]>([]);
  const pdfUrlRef = useRef<string | null>(null);

  const canGenerate = useMemo(() => Object.values(values).some((value) => value.trim()), [values]);
  const canGeneratePdf = useMemo(
    () => pdfImageFields.every((field) => pdfImages[field.key]),
    [pdfImages]
  );

  useEffect(() => {
    generatedRef.current = generated;
  }, [generated]);

  useEffect(() => {
    pdfUrlRef.current = pdfUrl;
  }, [pdfUrl]);

  useEffect(() => {
    return () => {
      revokeGenerated(generatedRef.current);
      revokeUrl(pdfUrlRef.current);
    };
  }, []);

  function updateValue(key: LtmsFieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setValues(emptyLtmsForm);
    revokeGenerated(generated);
    revokeUrl(pdfUrl);
    setGenerated([]);
    setPdfImages(emptyPdfImages);
    setPdfUrl(null);
    setPdfInputKey((current) => current + 1);
    setMessage("");
    setPdfMessage("");
  }

  function exitGenerated() {
    revokeGenerated(generated);
    revokeUrl(pdfUrl);
    setGenerated([]);
    setPdfImages(emptyPdfImages);
    setPdfUrl(null);
    setPdfInputKey((current) => current + 1);
    setMessage("Generated LTMS images were cleared.");
    setPdfMessage("PDF maker files were cleared.");
  }

  async function generateImages() {
    setLoading(true);
    setMessage("");

    try {
      const images = await Promise.all(
        ltmsTemplates.map(async (template) => {
          const blob = await renderTemplate(template, values);
          return {
            title: template.title,
            outputName: template.outputName,
            url: URL.createObjectURL(blob)
          };
        })
      );

      revokeGenerated(generated);
      setGenerated(images);
      setMessage("Generated filled LTMS images.");
    } catch (error) {
      setGenerated([]);
      setMessage(error instanceof Error ? error.message : "Unable to generate LTMS images.");
    } finally {
      setLoading(false);
    }
  }

  function updatePdfImage(key: PdfImageKey, file: File | null) {
    revokeUrl(pdfUrl);
    setPdfUrl(null);
    setPdfMessage("");
    setPdfImages((current) => ({
      ...current,
      [key]: file ? { name: file.name, blob: file } : null
    }));
  }

  async function useGeneratedImage(key: PdfImageKey, title: string) {
    const image = generated.find((item) => item.title === title);
    if (!image) {
      setPdfMessage(`${title} has not been generated yet.`);
      return;
    }

    const blob = await blobFromUrl(image.url);
    updatePdfImage(key, new File([blob], image.outputName, { type: blob.type || "image/png" }));
  }

  async function generatePdf() {
    if (!canGeneratePdf) {
      setPdfMessage("Upload all 4 images first: license front, license back, LTMS page 1, and LTMS page 2.");
      return;
    }

    setPdfLoading(true);
    setPdfMessage("");
    revokeUrl(pdfUrl);
    setPdfUrl(null);

    try {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595.3, 841.9]);
      const pageHeight = page.getHeight();
      const drawImage = async (input: PdfImageInput, slot: { x: number; top: number; width: number; height: number }) => {
        const image = await embedImage(pdf, input.blob);
        const fitted = fitWithin(image.width, image.height, slot.width, slot.height);
        page.drawImage(image, {
          x: slot.x + (slot.width - fitted.width) / 2,
          y: pageHeight - slot.top - slot.height + (slot.height - fitted.height) / 2,
          width: fitted.width,
          height: fitted.height
        });
      };

      page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: rgb(1, 1, 1) });
      await drawImage(pdfImages.licenseFront!, { x: 45, top: 105, width: 245, height: 150 });
      await drawImage(pdfImages.licenseBack!, { x: 305, top: 105, width: 245, height: 150 });
      await drawImage(pdfImages.ltmsPage1!, { x: 98, top: 310, width: 190, height: 410 });
      await drawImage(pdfImages.ltmsPage2!, { x: 325, top: 310, width: 190, height: 410 });

      const bytes = await pdf.save();
      const pdfBytes = bytes.slice().buffer;
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
      setPdfMessage("LTMS PDF is ready for preview and download.");
    } catch (error) {
      setPdfMessage(error instanceof Error ? error.message : "Unable to generate LTMS PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="LTMS Form Filler">
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
            onClick={resetForm}
            type="button"
          >
            <RotateCcw size={16} />
            Clear
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!canGenerate || loading}
            onClick={generateImages}
            type="button"
          >
            <Wand2 size={16} />
            {loading ? "Generating..." : "Generate Images"}
          </button>
        </div>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h3 className="mb-3 text-base font-semibold text-ink">Applicant Details</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {ltmsFields.map((field) => (
              <label key={field.key} className="grid gap-1.5 text-sm font-medium text-slate-700">
                {field.label}
                <input
                  autoComplete="off"
                  type={field.inputType ?? "text"}
                  value={values[field.key]}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        </section>

        <section className="grid gap-4">
          {generated.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {generated.map((image) => (
              <div key={image.outputName} className="rounded-lg border border-line bg-white p-4 shadow-soft">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{image.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                      download={image.outputName}
                      href={image.url}
                    >
                      <Download size={16} />
                      Download
                    </a>
                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                      onClick={exitGenerated}
                      type="button"
                    >
                      <X size={16} />
                      Exit
                    </button>
                  </div>
                </div>
                <img alt={`${image.title} preview`} className="h-[620px] w-full rounded-md border border-line object-contain" src={image.url} />
              </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-line bg-white p-6 text-center shadow-soft">
              <div>
                <FileImage className="mx-auto mb-3 text-slate-400" size={40} />
                <h3 className="font-semibold text-ink">No LTMS images generated yet</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Fill out the applicant details and generate the two LTMS image previews. Templates are loaded from public/ltms_p1.png and public/ltms_p2.png.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink">LTMS PDF Maker</h3>
                <p className="mt-1 text-sm text-slate-500">Upload license front/back and insert the generated LTMS pages into one A4 PDF.</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!canGeneratePdf || pdfLoading}
                onClick={generatePdf}
                type="button"
              >
                <FileText size={16} />
                {pdfLoading ? "Generating PDF..." : "Generate PDF"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {pdfImageFields.map((field) => (
                <div key={field.key} className="rounded-md border border-line p-3">
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    {field.label}
                    <input
                      key={`${field.key}-${pdfInputKey}`}
                      accept="image/png,image/jpeg"
                      type="file"
                      onChange={(event) => updatePdfImage(field.key, event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {pdfImages[field.key] ? <span className="font-medium text-emerald-700">{pdfImages[field.key]?.name}</span> : <span>No image selected</span>}
                    {field.generatedTitle ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 font-semibold text-ink disabled:opacity-50"
                        disabled={!generated.some((image) => image.title === field.generatedTitle)}
                        onClick={() => useGeneratedImage(field.key, field.generatedTitle!)}
                        type="button"
                      >
                        <Upload size={13} />
                        Use Generated
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {pdfMessage ? <p className="mt-3 text-sm text-slate-600">{pdfMessage}</p> : null}

            {pdfUrl ? (
              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap justify-end gap-2">
                  <a
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    download="ltms_drivers_license_package.pdf"
                    href={pdfUrl}
                  >
                    <Download size={16} />
                    Download PDF
                  </a>
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                    onClick={exitGenerated}
                    type="button"
                  >
                    <X size={16} />
                    Exit / Clear
                  </button>
                </div>
                <iframe className="h-[720px] w-full rounded-md border border-line" src={pdfUrl} title="LTMS PDF preview" />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
