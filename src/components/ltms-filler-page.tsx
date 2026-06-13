"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, RotateCcw, Wand2, X } from "lucide-react";
import { emptyLtmsForm, ltmsFields, ltmsTemplates } from "@/lib/ltms-filler-config";
import type { LtmsFieldKey, LtmsTemplateConfig } from "@/lib/ltms-filler-config";
import { PageHeader } from "./page-header";

type GeneratedImage = {
  title: string;
  outputName: string;
  url: string;
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

export function LtmsFillerPage() {
  const [values, setValues] = useState<Record<LtmsFieldKey, string>>(emptyLtmsForm);
  const [generated, setGenerated] = useState<GeneratedImage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const generatedRef = useRef<GeneratedImage[]>([]);

  const canGenerate = useMemo(() => Object.values(values).some((value) => value.trim()), [values]);

  useEffect(() => {
    generatedRef.current = generated;
  }, [generated]);

  useEffect(() => {
    return () => revokeGenerated(generatedRef.current);
  }, []);

  function updateValue(key: LtmsFieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setValues(emptyLtmsForm);
    revokeGenerated(generated);
    setGenerated([]);
    setMessage("");
  }

  function exitGenerated() {
    revokeGenerated(generated);
    setGenerated([]);
    setMessage("Generated LTMS images were cleared.");
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
            generated.map((image) => (
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
                <img alt={`${image.title} preview`} className="max-h-[720px] w-full rounded-md border border-line object-contain" src={image.url} />
              </div>
            ))
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
        </section>
      </div>
    </>
  );
}
