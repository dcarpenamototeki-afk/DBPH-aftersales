"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Camera, Crop, Download, FileImage, FileText, RotateCcw, Upload, Wand2, X } from "lucide-react";
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

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CapturedImage = {
  key: PdfImageKey;
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

type CropInteraction = {
  mode: "move" | "nw" | "ne" | "sw" | "se";
  pointerX: number;
  pointerY: number;
  crop: CropRect;
};

// A 2 x 3.5-inch ID is displayed in its usual landscape orientation.
const licenseCropRatio = 3.5 / 2;
const minimumCropSize = 80;

const pdfImageFields: Array<{ key: PdfImageKey; label: string; generatedTitle?: string; camera?: boolean }> = [
  { key: "licenseFront", label: "License Front", camera: true },
  { key: "licenseBack", label: "License Back", camera: true },
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

function initialLicenseCrop(width: number, height: number): CropRect {
  let cropWidth = width * 0.82;
  let cropHeight = cropWidth / licenseCropRatio;

  if (cropHeight > height * 0.82) {
    cropHeight = height * 0.82;
    cropWidth = cropHeight * licenseCropRatio;
  }

  return {
    x: (width - cropWidth) / 2,
    y: (height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
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
  const [activeCamera, setActiveCamera] = useState<PdfImageKey | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraMessage, setCameraMessage] = useState("");
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropMessage, setCropMessage] = useState("");
  const generatedRef = useRef<GeneratedImage[]>([]);
  const pdfUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropInteractionRef = useRef<CropInteraction | null>(null);
  const capturedImageRef = useRef<CapturedImage | null>(null);

  const canGenerate = useMemo(() => Object.values(values).some((value) => value.trim()), [values]);
  const canGeneratePdf = useMemo(
    () => Object.values(pdfImages).some(Boolean),
    [pdfImages]
  );

  useEffect(() => {
    generatedRef.current = generated;
  }, [generated]);

  useEffect(() => {
    pdfUrlRef.current = pdfUrl;
  }, [pdfUrl]);

  useEffect(() => {
    capturedImageRef.current = capturedImage;
  }, [capturedImage]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      revokeGenerated(generatedRef.current);
      revokeUrl(pdfUrlRef.current);
      revokeUrl(capturedImageRef.current?.url ?? null);
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

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
    closeCropper();
  }

  function exitGenerated() {
    revokeGenerated(generated);
    revokeUrl(pdfUrl);
    stopCamera();
    setGenerated([]);
    setPdfImages(emptyPdfImages);
    setPdfUrl(null);
    setPdfInputKey((current) => current + 1);
    setMessage("Generated LTMS images were cleared.");
    setPdfMessage("PDF maker files were cleared.");
    closeCropper();
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setActiveCamera(null);
    setCameraMessage("");
  }

  function closeCropper() {
    if (capturedImage) URL.revokeObjectURL(capturedImage.url);
    setCapturedImage(null);
    setCropRect(null);
    setCropMessage("");
    cropInteractionRef.current = null;
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

  function openImageCropper(key: PdfImageKey, blob: Blob, name: string) {
    if (capturedImage) URL.revokeObjectURL(capturedImage.url);
    setCropRect(null);
    setCropMessage("");
    setCapturedImage({
      key,
      name,
      blob,
      url: URL.createObjectURL(blob),
      width: 1,
      height: 1
    });
  }

  function handlePdfImageUpload(key: PdfImageKey, file: File | null) {
    if (!file) {
      updatePdfImage(key, null);
      return;
    }

    if (key === "licenseFront" || key === "licenseBack") {
      const baseName = file.name.replace(/\.[^.]+$/, "") || key;
      openImageCropper(key, file, `${baseName}_cropped.jpg`);
      return;
    }

    updatePdfImage(key, file);
  }

  async function insertGeneratedImage(key: PdfImageKey, title: string) {
    const image = generated.find((item) => item.title === title);
    if (!image) {
      setPdfMessage(`${title} has not been generated yet.`);
      return;
    }

    const blob = await blobFromUrl(image.url);
    updatePdfImage(key, new File([blob], image.outputName, { type: blob.type || "image/png" }));
  }

  async function openCamera(key: PdfImageKey) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPdfMessage("Camera is not available in this browser. Use Upload instead.");
      return;
    }

    stopCamera();
    setActiveCamera(key);
    setCameraMessage("Opening camera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      setCameraStream(stream);
      setCameraMessage("");
    } catch (error) {
      setActiveCamera(null);
      setCameraMessage("");
      setPdfMessage(error instanceof Error ? error.message : "Unable to open camera. Please allow camera permission or use Upload.");
    }
  }

  async function captureCameraImage() {
    if (!activeCamera || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraMessage("Unable to capture image from camera.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCameraMessage("Unable to save camera image.");
      return;
    }

    const key = activeCamera;
    stopCamera();
    openImageCropper(key, blob, `${key}_cropped.jpg`);
  }

  function initializeCrop(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const width = image.naturalWidth || capturedImage?.width || 1;
    const height = image.naturalHeight || capturedImage?.height || 1;
    setCapturedImage((current) => (current ? { ...current, width, height } : current));
    setCropRect(initialLicenseCrop(width, height));
  }

  function imagePointerPosition(event: ReactPointerEvent<HTMLElement>) {
    const image = cropImageRef.current;
    if (!image || !capturedImage) return null;
    const bounds = image.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (capturedImage.width / bounds.width),
      y: (event.clientY - bounds.top) * (capturedImage.height / bounds.height)
    };
  }

  function startCropInteraction(
    event: ReactPointerEvent<HTMLElement>,
    mode: CropInteraction["mode"]
  ) {
    if (!cropRect) return;
    const point = imagePointerPosition(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropInteractionRef.current = {
      mode,
      pointerX: point.x,
      pointerY: point.y,
      crop: { ...cropRect }
    };
  }

  function moveCropInteraction(event: ReactPointerEvent<HTMLElement>) {
    const interaction = cropInteractionRef.current;
    if (!interaction || !capturedImage) return;
    const point = imagePointerPosition(event);
    if (!point) return;
    event.preventDefault();

    if (interaction.mode === "move") {
      const x = clamp(
        interaction.crop.x + point.x - interaction.pointerX,
        0,
        capturedImage.width - interaction.crop.width
      );
      const y = clamp(
        interaction.crop.y + point.y - interaction.pointerY,
        0,
        capturedImage.height - interaction.crop.height
      );
      setCropRect({ ...interaction.crop, x, y });
      return;
    }

    const west = interaction.mode === "nw" || interaction.mode === "sw";
    const north = interaction.mode === "nw" || interaction.mode === "ne";
    const anchorX = west
      ? interaction.crop.x + interaction.crop.width
      : interaction.crop.x;
    const anchorY = north
      ? interaction.crop.y + interaction.crop.height
      : interaction.crop.y;
    const rawWidth = Math.abs(point.x - anchorX);
    const rawHeight = Math.abs(point.y - anchorY);
    let width = Math.max(rawWidth, rawHeight * licenseCropRatio, minimumCropSize);
    const maxWidth = west ? anchorX : capturedImage.width - anchorX;
    const maxHeight = north ? anchorY : capturedImage.height - anchorY;
    width = Math.min(width, maxWidth, maxHeight * licenseCropRatio);
    const height = width / licenseCropRatio;

    setCropRect({
      x: west ? anchorX - width : anchorX,
      y: north ? anchorY - height : anchorY,
      width,
      height
    });
  }

  function endCropInteraction(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropInteractionRef.current = null;
  }

  async function useCroppedId() {
    if (!capturedImage || !cropRect || !cropImageRef.current) return;
    setCropMessage("");

    const outputWidth = Math.max(1, Math.round(cropRect.width));
    const outputHeight = Math.max(1, Math.round(outputWidth / licenseCropRatio));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCropMessage("Unable to crop the captured image.");
      return;
    }

    ctx.drawImage(
      cropImageRef.current,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      outputWidth,
      outputHeight
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCropMessage("Unable to save the cropped image.");
      return;
    }

    updatePdfImage(
      capturedImage.key,
      new File([blob], capturedImage.name, { type: "image/jpeg" })
    );
    closeCropper();
  }

  async function generatePdf() {
    if (!canGeneratePdf) {
      setPdfMessage("Add at least one ID or LTMS image before generating the PDF.");
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
      if (pdfImages.licenseFront) {
        await drawImage(pdfImages.licenseFront, { x: 45, top: 105, width: 245, height: 150 });
      }
      if (pdfImages.licenseBack) {
        await drawImage(pdfImages.licenseBack, { x: 305, top: 105, width: 245, height: 150 });
      }
      if (pdfImages.ltmsPage1) {
        await drawImage(pdfImages.ltmsPage1, { x: 98, top: 285, width: 190, height: 370 });
      }
      if (pdfImages.ltmsPage2) {
        await drawImage(pdfImages.ltmsPage2, { x: 325, top: 285, width: 190, height: 370 });
      }

      const signatureTop = pageHeight - 735;
      [82, 232, 382].forEach((x) => {
        page.drawLine({
          start: { x, y: signatureTop },
          end: { x: x + 130, y: signatureTop },
          thickness: 0.8,
          color: rgb(0, 0, 0)
        });
      });

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
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-slate-700">{field.label}</p>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
                        <Upload size={15} />
                        Upload
                        <input
                          key={`${field.key}-file-${pdfInputKey}`}
                          accept="image/png,image/jpeg,image/*"
                          className="sr-only"
                          type="file"
                          onChange={(event) => {
                            handlePdfImageUpload(field.key, event.target.files?.[0] ?? null);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {field.camera ? (
                        <button
                          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                          onClick={() => openCamera(field.key)}
                          type="button"
                        >
                          <Camera size={15} />
                          Use Camera
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {pdfImages[field.key] ? <span className="font-medium text-emerald-700">{pdfImages[field.key]?.name}</span> : <span>No image selected</span>}
                    {field.generatedTitle ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 font-semibold text-ink disabled:opacity-50"
                        disabled={!generated.some((image) => image.title === field.generatedTitle)}
                        onClick={() => insertGeneratedImage(field.key, field.generatedTitle!)}
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
      {activeCamera ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-ink">Use Camera</h3>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                onClick={stopCamera}
                type="button"
              >
                <X size={16} />
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-md bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="max-h-[70vh] w-full object-contain" />
            </div>
            {cameraMessage ? <p className="mt-3 text-sm text-slate-600">{cameraMessage}</p> : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!cameraStream}
                onClick={captureCameraImage}
                type="button"
              >
                <Camera size={16} />
                Capture
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {capturedImage ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                  <h3 className="font-semibold text-ink">Crop Driver&apos;s License ID</h3>
                  <p className="mt-1 text-sm text-slate-500">
                  Drag the crop area or resize it from a corner. The ratio is fixed at the landscape 2 × 3.5 ID size.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                onClick={closeCropper}
                type="button"
              >
                <X size={16} />
                Close
              </button>
            </div>

            <div className="grid max-h-[65vh] place-items-center overflow-auto rounded-md bg-slate-950 p-2">
              <div className="relative inline-block max-w-full touch-none select-none">
                <img
                  ref={cropImageRef}
                  alt="Captured driver's license"
                  className="block max-h-[60vh] max-w-full"
                  draggable={false}
                  onLoad={initializeCrop}
                  src={capturedImage.url}
                />
                {cropRect ? (
                  <div
                    aria-label="Draggable license crop area"
                    className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                    onPointerDown={(event) => startCropInteraction(event, "move")}
                    onPointerMove={moveCropInteraction}
                    onPointerUp={endCropInteraction}
                    onPointerCancel={endCropInteraction}
                    style={{
                      left: `${(cropRect.x / capturedImage.width) * 100}%`,
                      top: `${(cropRect.y / capturedImage.height) * 100}%`,
                      width: `${(cropRect.width / capturedImage.width) * 100}%`,
                      height: `${(cropRect.height / capturedImage.height) * 100}%`
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <span key={index} className="border border-white/35" />
                      ))}
                    </div>
                    {(["nw", "ne", "sw", "se"] as const).map((handle) => (
                      <button
                        key={handle}
                        aria-label={`Resize crop ${handle}`}
                        className={`absolute h-5 w-5 rounded-full border-2 border-white bg-blue-600 shadow ${
                          handle.includes("n") ? "-top-2.5" : "-bottom-2.5"
                        } ${handle.includes("w") ? "-left-2.5" : "-right-2.5"}`}
                        onPointerDown={(event) => startCropInteraction(event, handle)}
                        onPointerMove={moveCropInteraction}
                        onPointerUp={endCropInteraction}
                        onPointerCancel={endCropInteraction}
                        style={{ cursor: `${handle}-resize` }}
                        type="button"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {cropMessage ? <p className="mt-3 text-sm text-red-600">{cropMessage}</p> : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!cropRect}
                onClick={useCroppedId}
                type="button"
              >
                <Crop size={16} />
                Use Cropped ID
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
