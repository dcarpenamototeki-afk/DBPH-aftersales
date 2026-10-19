"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Camera, Crop, Download, FileImage, FileText, RotateCcw, Upload, X } from "lucide-react";
import { PageHeader } from "./page-header";

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
  source: "camera" | "upload";
  originalName: string;
  croppedName: string;
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

const minimumCropSize = 80;

const pdfImageFields: Array<{ key: PdfImageKey; label: string }> = [
  { key: "licenseFront", label: "License Front" },
  { key: "licenseBack", label: "License Back" },
  { key: "ltmsPage1", label: "LTMS Page 1" },
  { key: "ltmsPage2", label: "LTMS Page 2" }
];

const emptyPdfImages: Record<PdfImageKey, PdfImageInput | null> = {
  licenseFront: null,
  licenseBack: null,
  ltmsPage1: null,
  ltmsPage2: null
};

function revokeUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
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
  const cropWidth = width * 0.82;
  const cropHeight = height * 0.82;

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
  const [pdfImages, setPdfImages] = useState<Record<PdfImageKey, PdfImageInput | null>>(emptyPdfImages);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfInputKey, setPdfInputKey] = useState(0);
  const [pdfMessage, setPdfMessage] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeCamera, setActiveCamera] = useState<PdfImageKey | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraMessage, setCameraMessage] = useState("");
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropMessage, setCropMessage] = useState("");
  const pdfUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropInteractionRef = useRef<CropInteraction | null>(null);
  const capturedImageRef = useRef<CapturedImage | null>(null);

  const canGeneratePdf = useMemo(
    () => Object.values(pdfImages).some(Boolean),
    [pdfImages]
  );

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
      revokeUrl(pdfUrlRef.current);
      revokeUrl(capturedImageRef.current?.url ?? null);
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  function resetForm() {
    revokeUrl(pdfUrl);
    setPdfImages(emptyPdfImages);
    setPdfUrl(null);
    setPdfInputKey((current) => current + 1);
    setPdfMessage("");
    closeCropper();
  }

  function exitGenerated() {
    revokeUrl(pdfUrl);
    stopCamera();
    setPdfImages(emptyPdfImages);
    setPdfUrl(null);
    setPdfInputKey((current) => current + 1);
    setPdfMessage("License and LTMS files were cleared.");
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

  function updatePdfImage(key: PdfImageKey, file: File | null) {
    revokeUrl(pdfUrl);
    setPdfUrl(null);
    setPdfMessage("");
    setPdfImages((current) => ({
      ...current,
      [key]: file ? { name: file.name, blob: file } : null
    }));
  }

  function openImageCropper(
    key: PdfImageKey,
    blob: Blob,
    originalName: string,
    source: CapturedImage["source"]
  ) {
    if (capturedImage) URL.revokeObjectURL(capturedImage.url);
    const baseName = originalName.replace(/\.[^.]+$/, "") || key;
    setCropRect(null);
    setCropMessage("");
    setCapturedImage({
      key,
      source,
      originalName,
      croppedName: `${baseName}_cropped.jpg`,
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
      openImageCropper(key, file, file.name, "upload");
      return;
    }

    updatePdfImage(key, file);
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
    openImageCropper(key, blob, `${key}_camera.jpg`, "camera");
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
    const maxWidth = west ? anchorX : capturedImage.width - anchorX;
    const maxHeight = north ? anchorY : capturedImage.height - anchorY;
    const width = Math.min(Math.max(rawWidth, minimumCropSize), maxWidth);
    const height = Math.min(Math.max(rawHeight, minimumCropSize), maxHeight);

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
    const outputHeight = Math.max(1, Math.round(cropRect.height));
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
      new File([blob], capturedImage.croppedName, { type: "image/jpeg" })
    );
    closeCropper();
  }

  async function acceptOriginalId() {
    if (!capturedImage || !cropImageRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = capturedImage.width;
    canvas.height = capturedImage.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCropMessage("Unable to accept the image.");
      return;
    }
    ctx.drawImage(cropImageRef.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCropMessage("Unable to save the accepted image.");
      return;
    }
    const baseName = capturedImage.originalName.replace(/\.[^.]+$/, "") || capturedImage.key;
    updatePdfImage(
      capturedImage.key,
      new File([blob], `${baseName}_accepted.jpg`, { type: "image/jpeg" })
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
        await drawImage(pdfImages.licenseFront, { x: 40, top: 105, width: 252, height: 144 });
      }
      if (pdfImages.licenseBack) {
        await drawImage(pdfImages.licenseBack, { x: 303, top: 105, width: 252, height: 144 });
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
      setPdfMessage("License / LTMS PDF is ready for preview and download.");
    } catch (error) {
      setPdfMessage(error instanceof Error ? error.message : "Unable to generate License / LTMS PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="LICENSE / LTMS FORM">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
          onClick={resetForm}
          type="button"
        >
          <RotateCcw size={16} />
          Clear
        </button>
      </PageHeader>

      <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink">License / LTMS PDF Maker</h3>
                <p className="mt-1 text-sm text-slate-500">Upload or capture the license and LTMS pages, then combine them into one A4 PDF.</p>
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
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
                        onClick={() => openCamera(field.key)}
                        type="button"
                      >
                        <Camera size={15} />
                        Use Camera
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {pdfImages[field.key] ? <span className="font-medium text-emerald-700">{pdfImages[field.key]?.name}</span> : <span>No image selected</span>}
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
                    download="license_ltms_form.pdf"
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
      </section>
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
                  <h3 className="font-semibold text-ink">
                    Crop {pdfImageFields.find((field) => field.key === capturedImage.key)?.label ?? "Image"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                  Drag the crop area or resize any corner freely to select the part of the image you want to use.
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
                  alt="Captured license or LTMS document"
                  className="block max-h-[60vh] max-w-full"
                  draggable={false}
                  onLoad={initializeCrop}
                  src={capturedImage.url}
                />
                {cropRect ? (
                  <div
                    aria-label="Draggable image crop area"
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
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
                onClick={acceptOriginalId}
                type="button"
              >
                <FileImage size={16} />
                {capturedImage.source === "upload" ? "Accept Uploaded Image" : "Accept Captured Image"}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!cropRect}
                onClick={useCroppedId}
                type="button"
              >
                <Crop size={16} />
                Use Cropped Image
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
