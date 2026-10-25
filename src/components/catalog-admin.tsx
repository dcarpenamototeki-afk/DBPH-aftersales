"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, FilePenLine, LogOut, Plus, Save } from "lucide-react";
import { AuthGate } from "./auth-gate";
import { catalogCategories, emptyCatalogItem, type CatalogItem, type CatalogItemInput, peso } from "@/lib/catalog";
import styles from "./public-catalog.module.css";

function asForm(item: CatalogItem | CatalogItemInput): CatalogItemInput {
  return { ...emptyCatalogItem, ...item };
}

function AdminManager() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<CatalogItemInput>(emptyCatalogItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/catalog?scope=admin");
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Unable to load catalog items."); return; }
    setItems(body.data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setValue<K extends keyof CatalogItemInput>(key: K, value: CatalogItemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNew() { setEditingId(null); setForm(emptyCatalogItem); setMessage(""); }
  function startEdit(item: CatalogItem) { setEditingId(item.id); setForm(asForm(item)); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const response = await fetch(editingId ? `/api/catalog/${editingId}` : "/api/catalog", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(body.error ?? "Unable to save this unit."); return; }
    setMessage(editingId ? "Unit updated." : "New unit added.");
    setEditingId(null); setForm(emptyCatalogItem); await load();
  }

  return <div className={styles.adminSite}><header className={styles.adminHeader}><Link href="/catalog"><Image className={styles.logo} src="/dreambike-catalog-logo.png" alt="Dreambike PH" width={225} height={80} priority /></Link><div><Link href="/catalog">View public catalog</Link><span>Secure admin access</span></div></header><main className={styles.adminMain}><div className={styles.adminIntro}><p className={styles.kicker}>CATALOG MANAGER</p><h1>{editingId ? "EDIT UNIT" : "ADD A UNIT"}</h1><p>Add a bike, update a listed unit, or choose whether it is visible to the public catalog.</p></div><div className={styles.adminLayout}><form className={styles.adminForm} onSubmit={submit}><div className={styles.formHead}><h2>{editingId ? "Unit details" : "New listing"}</h2>{editingId ? <button onClick={startNew} type="button">+ Add another</button> : null}</div><div className={styles.formGrid}><label>Unit title<input required value={form.title} onChange={(event) => setValue("title", event.target.value)} placeholder="e.g. Honda CB650R" /></label><label>Brand<input value={form.brand} onChange={(event) => setValue("brand", event.target.value)} placeholder="e.g. Honda" /></label><label>Category<select value={form.category} onChange={(event) => setValue("category", event.target.value)}>{catalogCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Engine CC<input min="0" type="number" value={form.engine_cc ?? ""} onChange={(event) => setValue("engine_cc", event.target.value ? Number(event.target.value) : null)} /></label><label>Year model<input value={form.year_model} onChange={(event) => setValue("year_model", event.target.value)} placeholder="2024" /></label><label>Odometer (km)<input min="0" type="number" value={form.odometer_km ?? ""} onChange={(event) => setValue("odometer_km", event.target.value ? Number(event.target.value) : null)} /></label><label>Cash price<input min="0" type="number" value={form.cash_price ?? ""} onChange={(event) => setValue("cash_price", event.target.value ? Number(event.target.value) : null)} placeholder="0" /></label><label>Swapping value<input min="0" type="number" value={form.swapping_value ?? ""} onChange={(event) => setValue("swapping_value", event.target.value ? Number(event.target.value) : null)} placeholder="0" /></label></div><label>Photo URL<input type="url" value={form.image_url} onChange={(event) => setValue("image_url", event.target.value)} placeholder="https://..." /></label><label>Condition / unit notes<textarea value={form.condition_notes} onChange={(event) => setValue("condition_notes", event.target.value)} placeholder="Add concise details, accessories, or condition notes." rows={4} /></label><div className={styles.toggles}><label><input checked={form.is_available} onChange={(event) => setValue("is_available", event.target.checked)} type="checkbox" /> Available</label><label><input checked={form.is_published} onChange={(event) => setValue("is_published", event.target.checked)} type="checkbox" /> Show on public catalog</label></div>{message ? <p className={styles.formMessage}><Check size={16} /> {message}</p> : null}<button className={styles.saveButton} disabled={saving} type="submit"><Save size={17} /> {saving ? "Saving..." : editingId ? "Save changes" : "Add item"}</button></form><section className={styles.adminItems}><div className={styles.formHead}><h2>All catalog items</h2><button onClick={startNew} type="button"><Plus size={16} /> New item</button></div>{items.length ? <div className={styles.adminList}>{items.map((item) => <article key={item.id}><div><span className={item.is_published && item.is_available ? styles.live : styles.draft}>{item.is_published && item.is_available ? "LIVE" : item.is_published ? "UNAVAILABLE" : "DRAFT"}</span><h3>{item.title}</h3><p>{item.brand || item.category} · {peso(item.cash_price)}</p></div><button onClick={() => startEdit(item)} type="button" aria-label={`Edit ${item.title}`}><FilePenLine size={17} /></button></article>)}</div> : <p className={styles.noItems}>No catalog items yet. Add your first unit from the form.</p>}</section></div></main></div>;
}

export function CatalogAdmin() { return <AuthGate><AdminManager /></AuthGate>; }
