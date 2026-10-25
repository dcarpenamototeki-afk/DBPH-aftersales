"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Gauge, MapPin, MessageCircle, Minus, Phone, Plus, RotateCcw, Search, X } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import { peso } from "@/lib/catalog";
import styles from "./public-catalog.module.css";

const messengerUrl = "https://m.me/302557126279943";
const checkerUrl = "https://dreambike-tracker.onrender.com/";
const mapUrl = "https://maps.app.goo.gl/AMSyAYcyzv1Yod2W8";

function Brand({ intro = false }: { intro?: boolean }) {
  return (
    <span className={`${styles.brandLockup} ${intro ? styles.introLogo : ""}`} aria-label="Dreambike PH">
      <Image className={styles.brandMark} src="/dreambike-mark-source.png" alt="" width={394} height={321} priority />
      <Image className={styles.brandWordmark} src="/dreambike-wordmark-source.png" alt="Dreambike PH" width={556} height={115} priority />
    </span>
  );
}

function IntroLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem("dreambike-intro-seen-v2")) {
      setVisible(false);
      return;
    }

    window.sessionStorage.setItem("dreambike-intro-seen-v2", "true");
    const timer = window.setTimeout(() => setVisible(false), 2350);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.introOverlay} aria-label="Dreambike PH loading">
      <div className={styles.introLine} />
      <div className={styles.introContent}>
        <Brand intro />
        <p>Your next ride awaits</p>
      </div>
    </div>
  );
}

function SiteHeader({ page }: { page: "home" | "catalog" | "contact" }) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/home"><Brand /></Link>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link className={page === "home" ? styles.activeLink : ""} href="/home">Home</Link>
        <Link className={page === "catalog" ? styles.activeLink : ""} href="/catalog">Catalog</Link>
        <Link className={page === "contact" ? styles.activeLink : ""} href="/contact">Contact us</Link>
        <a className={styles.checker} href={checkerUrl} target="_blank" rel="noreferrer">ORCR / Plate checker <ArrowUpRight size={14} /></a>
        <Link className={styles.adminLink} href="/login?next=%2Fadmin">Admin access</Link>
      </nav>
    </header>
  );
}

function ContactInfo() {
  return (
    <div className={styles.contactGrid}>
      <a className={styles.contactCard} href={mapUrl} target="_blank" rel="noreferrer">
        <MapPin size={24} />
        <div><strong>Visit the showroom</strong><span>286 Honorio Lopez Blvd, Tondo, Manila City, 1013 Metro Manila</span><em>Open Waze / Google Maps <ArrowUpRight size={14} /></em></div>
      </a>
      <div className={styles.contactCard}><CalendarDays size={24} /><div><strong>Showroom hours</strong><span>Monday – Sunday<br />9:00am – 6:00pm</span></div></div>
      <div className={styles.contactCard}><Phone size={24} /><div><strong>Call or text us</strong><span>Globe: <a href="tel:+639458713465">0945-871-3465</a><br />Smart: <a href="tel:+639684367252">0968-436-7252</a></span></div></div>
    </div>
  );
}

function Footer() {
  return <footer className={styles.footer}><Brand /><p>Pre-owned motorcycles, direct service, and a ride worth remembering.</p><a href={messengerUrl} target="_blank" rel="noreferrer">Message DreambikePH <ArrowUpRight size={15} /></a></footer>;
}

function emptyImage() {
  return "url('/dreambike-hero-clean.png')";
}

export function HomePage() {
  return (
    <div className={styles.site}>
      <IntroLoader />
      <SiteHeader page="home" />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroBackdrop} />
          <div className={styles.heroCopy}>
            <p className={`${styles.kicker} ${styles.statusKicker}`}><span aria-hidden="true" />Catalog preview</p>
            <h1>YOUR NEXT RIDE<br /><span>STARTS HERE.</span></h1>
            <p>Browse available motorcycles, review the details, then message DreambikePH to verify your preferred unit.</p>
            <Link className={styles.primaryButton} href="/catalog">View available units <span>↓</span></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [detailZoom, setDetailZoom] = useState(1);

  const openDetails = (item: CatalogItem) => {
    setDetailZoom(1);
    setSelected(item);
  };

  const closeDetails = () => setSelected(null);

  useEffect(() => {
    fetch("/api/catalog").then((response) => response.json()).then((body) => setItems(body.data ?? [])).catch(() => setItems([]));
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category))).filter(Boolean)], [items]);
  const visibleItems = useMemo(() => items.filter((item) => {
    const term = search.trim().toLowerCase();
    return (category === "All" || item.category === category) && (!term || `${item.brand} ${item.title} ${item.category}`.toLowerCase().includes(term));
  }), [category, items, search]);

  return (
    <div className={styles.site}>
      <IntroLoader />
      <SiteHeader page="catalog" />
      <main className={styles.catalogPage}>
        <section className={styles.catalog} id="units">
          <div className={styles.sectionIntro}><div><p className={styles.kicker}>AVAILABLE MOTORCYCLES</p><h1>EXPLORE THE<br />CATALOG.</h1></div><p>Availability changes quickly. Send us a message before visiting so our team can confirm the unit for you.</p></div>
          <div className={styles.tools}>
            <label className={styles.search}><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a brand, model, or type" /></label>
            <div className={styles.filters}>{categories.map((item) => <button className={item === category ? styles.filterActive : ""} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div>
          </div>
          {visibleItems.length ? <div className={styles.grid}>{visibleItems.map((item) => <article className={styles.card} key={item.id}>
            <div className={styles.cardImage} style={{ backgroundImage: item.image_url ? `url("${item.image_url}")` : emptyImage() }}><span>AVAILABLE</span></div>
            <div className={styles.cardBody}><p>{item.brand || item.category}</p><h2>{item.title}</h2><div className={styles.specs}><span><CalendarDays size={13} /> {item.year_model || "Ask us"}</span><span><Gauge size={13} /> {item.odometer_km == null ? "Ask us" : `${item.odometer_km.toLocaleString("en-PH")} km`}</span></div><strong>{peso(item.cash_price)}</strong><button onClick={() => openDetails(item)} type="button">View details <ArrowUpRight size={15} /></button></div>
          </article>)}</div> : <div className={styles.empty}><p>No matching unit is shown right now.</p><a href={messengerUrl} target="_blank" rel="noreferrer">Message us for live inventory <ArrowUpRight size={15} /></a></div>}
        </section>
      </main>
      <Footer />
      {selected ? <div className={styles.modalBack} role="presentation" onMouseDown={closeDetails}><section className={styles.modal} aria-modal="true" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
        <button className={styles.close} onClick={closeDetails} aria-label="Close details" type="button"><X /></button>
        <div className={styles.modalImageFrame}>
          <img
            className={styles.modalImage}
            src={selected.image_url || "/dreambike-hero-clean.png"}
            alt={selected.title}
            onError={(event) => { event.currentTarget.src = "/dreambike-hero-clean.png"; }}
            style={{ transform: `scale(${detailZoom})` }}
          />
          <div className={styles.zoomControls} aria-label="Photo zoom controls">
            <button aria-label="Zoom out" disabled={detailZoom <= 0.75} onClick={() => setDetailZoom((zoom) => Math.max(0.75, +(zoom - 0.05).toFixed(2)))} type="button"><Minus size={16} /></button>
            <input aria-label="Photo zoom" max="3" min="0.75" onChange={(event) => setDetailZoom(Number(event.target.value))} step="0.05" type="range" value={detailZoom} />
            <button aria-label="Zoom in" disabled={detailZoom >= 3} onClick={() => setDetailZoom((zoom) => Math.min(3, +(zoom + 0.05).toFixed(2)))} type="button"><Plus size={16} /></button>
            <button aria-label="Reset zoom" onClick={() => setDetailZoom(1)} type="button"><RotateCcw size={15} /></button>
          </div>
        </div>
        <div className={styles.modalContent}><p className={styles.kicker}>{selected.brand || selected.category}</p><h2>{selected.title}</h2><div className={styles.modalSpecs}><div><span>YEAR MODEL</span><b>{selected.year_model || "Ask us"}</b></div><div><span>ODOMETER</span><b>{selected.odometer_km == null ? "Ask us" : `${selected.odometer_km.toLocaleString("en-PH")} km`}</b></div></div><div className={styles.priceRow}><span>CASH PRICE</span><strong>{peso(selected.cash_price)}</strong></div><div className={styles.swapRow}><span>SWAPPING VALUE</span><strong>{peso(selected.swapping_value)}</strong><p>Final swapping value is subject to unit assessment.</p></div><div className={styles.notes}><h3>UNIT OVERVIEW</h3><p>{selected.condition_notes || "Message us for the complete condition notes and current photos."}</p></div><a className={styles.primaryButton} href={messengerUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Send us a message</a></div>
      </section></div> : null}
    </div>
  );
}

export function ContactPage() {
  return <div className={styles.site}><IntroLoader /><SiteHeader page="contact" /><main className={styles.contactPage}><p className={styles.kicker}>GET IN TOUCH</p><h1>COME SEE<br /><span>YOUR NEXT RIDE.</span></h1><p className={styles.contactLead}>Questions about a unit or a swap? Reach out directly and our team will help you confirm what is available.</p><ContactInfo /><div className={styles.messageBlock}><MessageCircle size={32} /><div><p className={styles.kicker}>FASTEST WAY TO REACH US</p><h2>MESSAGE US ON MESSENGER.</h2></div><a className={styles.primaryButton} href={messengerUrl} target="_blank" rel="noreferrer">Open Messenger <ArrowUpRight size={16} /></a></div></main><Footer /></div>;
}
