export type ImportantDocumentInput = {
  document: string;
  description: string;
  google_drive_link: string;
};

export function parseImportantDocumentInput(value: unknown): ImportantDocumentInput {
  const input = (value ?? {}) as Record<string, unknown>;
  const document = String(input.document ?? "").trim();
  const description = String(input.description ?? "").trim();
  const googleDriveLink = String(input.google_drive_link ?? "").trim();

  if (!document) throw new Error("Document name is required.");
  if (!description) throw new Error("Description is required.");
  if (!googleDriveLink) throw new Error("Google Drive link is required.");

  let url: URL;
  try {
    url = new URL(googleDriveLink);
  } catch {
    throw new Error("Enter a valid Google Drive link.");
  }
  const allowedHosts = new Set(["drive.google.com", "docs.google.com"]);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error("Only HTTPS Google Drive or Google Docs links are allowed.");
  }

  return { document, description, google_drive_link: url.toString() };
}

