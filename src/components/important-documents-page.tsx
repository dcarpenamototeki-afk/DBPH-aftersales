"use client";

import { Download, FileText } from "lucide-react";
import { PageHeader } from "./page-header";

const documents = [
  {
    title: "BLANK DEED OF SALE",
    description: "Blank deed of sale template for standard motorcycle ownership documentation.",
    url: "https://docs.google.com/document/d/1agNowxrtqUrEO-ZoZhl5Tn09cgtqcGyF/edit?usp=drive_link&ouid=104069693340596129970&rtpof=true&sd=true"
  },
  {
    title: "DEED OF SALE (Bonete)",
    description: "Prepared deed of sale document for Bonete-related release and ownership records.",
    url: "https://docs.google.com/document/d/17R3h-IkRKD_eFydPOxsCry2l_lg58mfn/edit?usp=sharing&ouid=104069693340596129970&rtpof=true&sd=true"
  },
  {
    title: "ID with Specimen (Bonete)",
    description: "Reference copy of Bonete ID with specimen signature for document verification.",
    url: "https://docs.google.com/document/d/1USdniloSNl_4y90gVLCAdPXM_22i_edZ/edit?usp=sharing&ouid=104069693340596129970&rtpof=true&sd=true"
  },
  {
    title: "MVIS (STENCIL)",
    description: "MVIS stencil file for inspection and registration processing requirements.",
    url: "https://drive.google.com/file/d/1FfQPNaAGHDay9lSEq5ZDxrUt1A9TctY6/view?usp=drive_link"
  },
  {
    title: "LBC TAG",
    description: "LBC shipping tag template for courier labeling and document dispatch.",
    url: "https://docs.google.com/document/d/1Xrd0yVm_JXJn1ZDuGvQgXLNqAc8-w-Hw/edit?usp=drive_link&ouid=104069693340596129970&rtpof=true&sd=true"
  },
  {
    title: "UNIT CHECKLIST BNEW",
    description: "Brand-new unit checklist for release inspection and handover confirmation.",
    url: "https://docs.google.com/document/d/1Q0xhq9bo9pBwXncgd8w_7gsDZzMfejG4/edit?usp=drive_link&ouid=104069693340596129970&rtpof=true&sd=true"
  },
  {
    title: "UNIT CHECKLIST REPO",
    description: "Repo unit checklist for condition checking, release notes, and compliance review.",
    url: "https://docs.google.com/document/d/1Xz0roGGsVFzuEOjRnn39VHLNulXAQt362NOECxLZHZM/edit?usp=drive_link"
  },
  {
    title: "Request for Payment",
    description: "Payment request document for approvals, payable tracking, and office processing.",
    url: "https://drive.google.com/file/d/124vIXJDrClyO6phNATyeOOV91PvFSiS3/view?usp=drive_link"
  },
  {
    title: "Leave Form",
    description: "Employee leave request form for filing and approval documentation.",
    url: "https://docs.google.com/document/d/1yTpE5yrG_pu5EVUU0azkTZ6-b-kjH6EX/edit?usp=drive_link&ouid=104069693340596129970&rtpof=true&sd=true"
  },
  {
    title: "Change Rest Day",
    description: "Change rest day request sheet for schedule adjustments and tracking.",
    url: "https://docs.google.com/spreadsheets/d/1c1d6EHD6ZMtT4wgLKVe4BifeYhbeBXR5/edit?usp=drive_link&ouid=104069693340596129970&rtpof=true&sd=true"
  }
];

export function ImportantDocumentsPage() {
  return (
    <>
      <PageHeader title="Important Documents" />

      <section className="overflow-hidden border border-line bg-white shadow-soft">
        <div className="border-b border-line bg-slate-100 px-4 py-3">
          <h3 className="font-semibold text-ink">Dreambike PH Document Library</h3>
          <p className="mt-1 text-sm text-slate-500">Quick access links for commonly used office, release, and registration documents.</p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <article key={document.title} className="flex min-h-44 flex-col justify-between rounded-md border border-line bg-white p-4">
              <div>
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700">
                    <FileText size={18} />
                  </span>
                  <div>
                    <h4 className="font-semibold text-ink">{document.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{document.description}</p>
                  </div>
                </div>
              </div>
              <a
                className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                href={document.url}
                rel="noreferrer"
                target="_blank"
              >
                <Download size={16} />
                Download
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
