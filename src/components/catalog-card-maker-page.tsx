"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileImage, ImagePlus, RefreshCw, X } from "lucide-react";
import { PageHeader } from "./page-header";

type ImageKey = "main" | "closeup1" | "closeup2" | "closeup3" | "closeup4";

type FormState = {
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  odometer: string;
  srp: string;
  spotCash: string;
  swappingValue: string;
};

const initialForm: FormState = {
  titleLine1: "",
  titleLine2: "",
  titleLine3: "",
  odometer: "",
  srp: "",
  spotCash: "",
  swappingValue: ""
};

const templatePath = "/catalog-card-template.png";
const canvasSize = { width: 943, height: 1676 };

const imageSlots: Record<ImageKey, { label: string; x: number; y: number; width: number; height: number }> = {
  main: { label: "Main", x: 12, y: 382, width: 916, height: 574 },
  closeup1: { label: "Closeup 1", x: 14, y: 1004, width: 216, height: 244 },
  closeup2: { label: "Closeup 2", x: 234, y: 1004, width: 229, height: 244 },
  closeup3: { label: "Closeup 3", x: 471, y: 1004, width: 226, height: 244 },
  closeup4: { label: "Closeup 4", x: 703, y: 1004, width: 225, height: 244 }
};

const closeupKeys: ImageKey[] = ["closeup1", "closeup2", "closeup3", "closeup4"];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  slot: { x: number; y: number; width: number; height: number }
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const slotRatio = slot.width / slot.height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > slotRatio) {
    sourceWidth = image.naturalHeight * slotRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / slotRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.save();
  context.beginPath();
  context.rect(slot.x, slot.y, slot.width, slot.height);
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, slot.x, slot.y, slot.width, slot.height);
  context.restore();
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize = 22
) {
  let size = startSize;
  while (size > minSize) {
    context.font = `900 ${size}px "United Kingdom", Impact, Haettenschweiler, "Arial Black", sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  y: number,
  maxWidth: number,
  startSize: number,
  color: string,
  stroke = false
) {
  const value = text.trim().toUpperCase();
  if (!value) return;
  const size = fitText(context, value, maxWidth, startSize);
  context.font = `900 ${size}px "United Kingdom", Impact, Haettenschweiler, "Arial Black", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  if (stroke) {
    context.strokeStyle = "#000000";
    context.lineWidth = Math.max(4, size * 0.08);
    context.strokeText(value, canvasSize.width / 2, y);
  }
  context.fillStyle = color;
  context.fillText(value, canvasSize.width / 2, y);
}

function formatPeso(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || !cleaned) return value.trim().toUpperCase();
  return `P ${numeric.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function CatalogCardMakerPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [imageUrls, setImageUrls] = useState<Partial<Record<ImageKey, string>>>({});
  const [outputUrl, setOutputUrl] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputRef = useRef("");
  const imageUrlsRef = useRef<Partial<Record<ImageKey, string>>>({});

  useEffect(() => {
    outputRef.current = outputUrl;
  }, [outputUrl]);

  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  useEffect(() => {
    return () => {
      Object.values(imageUrlsRef.current).forEach((url) => url && URL.revokeObjectURL(url));
      if (outputRef.current) URL.revokeObjectURL(outputRef.current);
    };
  }, []);

  function clearOutput() {
    if (outputRef.current) URL.revokeObjectURL(outputRef.current);
    outputRef.current = "";
    setOutputUrl("");
  }

  function reset() {
    clearOutput();
    Object.values(imageUrls).forEach((url) => url && URL.revokeObjectURL(url));
    setImageUrls({});
    setForm(initialForm);
    setMessage("");
    setResetVersion((version) => version + 1);
  }

  function setValue(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    clearOutput();
  }

  function setImage(key: ImageKey, file: File | null) {
    clearOutput();
    setImageUrls((current) => {
      if (current[key]) URL.revokeObjectURL(current[key]!);
      if (!file) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: URL.createObjectURL(file) };
    });
  }

  async function generateCard() {
    setGenerating(true);
    setMessage("");
    clearOutput();

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas is not ready.");
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not supported in this browser.");

      const template = await loadImage(templatePath);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#000000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(template, 0, 0, canvas.width, canvas.height);

      const entries = Object.entries(imageUrls) as Array<[ImageKey, string]>;
      for (const [key, url] of entries) {
        const uploaded = await loadImage(url);
        drawCoverImage(context, uploaded, imageSlots[key]);
      }

      drawCenteredText(context, form.titleLine1, 222, 620, 46, "#ffffff", true);
      drawCenteredText(context, form.titleLine2, 303, 650, 96, "#ffc400", true);
      drawCenteredText(context, form.titleLine3, 382, 620, 42, "#ffffff", true);

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#000000";
      [
        { value: form.odometer.trim().toUpperCase(), y: 1292 },
        { value: formatPeso(form.srp), y: 1350 },
        { value: formatPeso(form.spotCash), y: 1408 },
        { value: formatPeso(form.swappingValue), y: 1466 }
      ].forEach((row) => {
        if (!row.value) return;
        const size = fitText(context, row.value, 390, 47, 24);
        context.font = `900 ${size}px "United Kingdom", Impact, Haettenschweiler, "Arial Black", sans-serif`;
        context.fillText(row.value, 694, row.y);
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          setMessage("Unable to create image.");
          setGenerating(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        outputRef.current = url;
        setOutputUrl(url);
        setMessage("Catalog card is ready for preview and download.");
        setGenerating(false);
      }, "image/png");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate catalog card.");
      setGenerating(false);
    }
  }

  return (
    <>
      <PageHeader title="Catalog Card Maker">
        <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={reset} type="button">
          <X size={16} />
          Exit / Clear
        </button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h3 className="mb-3 font-semibold text-ink">Images</h3>
          <div className="grid gap-3">
            {(["main", ...closeupKeys] as ImageKey[]).map((key) => (
              <label key={key} className="grid gap-1.5 text-sm font-medium text-slate-700">
                {imageSlots[key].label}
                <input key={`${key}-${resetVersion}`} accept="image/*" type="file" onChange={(event) => setImage(key, event.target.files?.[0] ?? null)} />
              </label>
            ))}
          </div>

          <h3 className="mb-3 mt-5 font-semibold text-ink">Title</h3>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Line 1<input value={form.titleLine1} onChange={(event) => setValue("titleLine1", event.target.value)} placeholder="2025 Motomorini" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Line 2<input value={form.titleLine2} onChange={(event) => setValue("titleLine2", event.target.value)} placeholder="STR 650" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Line 3<input value={form.titleLine3} onChange={(event) => setValue("titleLine3", event.target.value)} placeholder="Neo Retrobike" /></label>
          </div>

          <h3 className="mb-3 mt-5 font-semibold text-ink">Pricing</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Odometer<input value={form.odometer} onChange={(event) => setValue("odometer", event.target.value)} placeholder="7076km" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">SRP<input value={form.srp} onChange={(event) => setValue("srp", event.target.value)} placeholder="498800" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Spot Cash<input value={form.spotCash} onChange={(event) => setValue("spotCash", event.target.value)} placeholder="268000" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Swapping Value<input value={form.swappingValue} onChange={(event) => setValue("swappingValue", event.target.value)} placeholder="298800" /></label>
          </div>

          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={generating} onClick={generateCard} type="button">
              {generating ? <RefreshCw className="animate-spin" size={16} /> : <FileImage size={16} />}
              {generating ? "Generating..." : "Generate Image"}
            </button>
            {outputUrl ? (
              <a className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" download="dreambike-catalog-card.png" href={outputUrl}>
                <Download size={16} />
                Download Image
              </a>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          {outputUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Generated catalog card preview" className="mx-auto max-h-[78vh] max-w-full rounded-md border border-line object-contain" src={outputUrl} />
          ) : (
            <div className="grid min-h-[680px] place-items-center text-center text-sm text-slate-500">
              <div className="grid gap-2">
                <ImagePlus className="mx-auto text-slate-400" size={36} />
                Generated catalog card preview will appear here.
              </div>
            </div>
          )}
        </section>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
