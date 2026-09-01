"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Download, FileText, Pencil, Plus, X } from "lucide-react";
import type { ImportantDocumentRecord } from "@/lib/types";
import { PageHeader } from "./page-header";

type DocumentForm = {
  id?: string;
  document: string;
  description: string;
  google_drive_link: string;
};

const emptyForm: DocumentForm = { document: "", description: "", google_drive_link: "" };

export function ImportantDocumentsPage() {
  const [documents, setDocuments] = useState<ImportantDocumentRecord[]>([]);
  const [form, setForm] = useState<DocumentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/important-documents");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load documents.");
      setDocuments(body.data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  function openAddForm() {
    setMessage("");
    setForm({ ...emptyForm });
  }

  function openEditForm(item: ImportantDocumentRecord) {
    setMessage("");
    setForm({
      id: item.id,
      document: item.document,
      description: item.description,
      google_drive_link: item.google_drive_link
    });
  }

  function updateForm(field: keyof Omit<DocumentForm, "id">, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setMessage("");
    try {
      const isEditing = Boolean(form.id);
      const response = await fetch(isEditing ? `/api/important-documents/${form.id}` : "/api/important-documents", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: form.document,
          description: form.description,
          google_drive_link: form.google_drive_link
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save document.");

      setForm(null);
      await loadDocuments();
      setMessage(isEditing ? "Document updated successfully." : "Document added successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save document.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Important Documents">
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={openAddForm} type="button">
          <Plus size={17} /> Add Document
        </button>
      </PageHeader>

      {message ? <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div> : null}

      <section className="overflow-hidden border border-line bg-white shadow-soft">
        <div className="border-b border-line bg-slate-100 px-4 py-3">
          <h3 className="font-semibold text-ink">Dreambike PH Document Library</h3>
          <p className="mt-1 text-sm text-slate-500">Quick access links for commonly used office, release, and registration documents.</p>
        </div>

        {loading ? <p className="p-6 text-sm text-slate-500">Loading documents...</p> : null}
        {!loading && documents.length === 0 ? <p className="p-6 text-sm text-slate-500">No documents added yet.</p> : null}
        {!loading && documents.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((item) => (
              <article key={item.id} className="flex min-h-44 flex-col justify-between rounded-md border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700"><FileText size={18} /></span>
                  <div>
                    <h4 className="font-semibold text-ink">{item.document}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700" href={item.google_drive_link} rel="noreferrer" target="_blank">
                    <Download size={16} /> Download
                  </a>
                  <button className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50" onClick={() => openEditForm(item)} type="button">
                    <Pencil size={15} /> Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {form ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="document-form-title">
          <form className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl" onSubmit={saveDocument}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-lg font-bold text-ink" id="document-form-title">{form.id ? "Edit Document" : "Add Document"}</h3>
              <button aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" disabled={saving} onClick={() => setForm(null)} type="button"><X size={20} /></button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block text-sm font-semibold text-slate-700">
                Document
                <input autoFocus className="mt-1 w-full rounded-md border border-line px-3 py-2 font-normal text-ink outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" onChange={(event) => updateForm("document", event.target.value)} required value={form.document} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Description
                <textarea className="mt-1 min-h-28 w-full resize-y rounded-md border border-line px-3 py-2 font-normal text-ink outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" onChange={(event) => updateForm("description", event.target.value)} required value={form.description} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Google Drive Link
                <input className="mt-1 w-full rounded-md border border-line px-3 py-2 font-normal text-ink outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" onChange={(event) => updateForm("google_drive_link", event.target.value)} placeholder="https://drive.google.com/..." required type="url" value={form.google_drive_link} />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-line bg-slate-50 px-5 py-4">
              <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={saving} onClick={() => setForm(null)} type="button">Cancel</button>
              <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Document"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

