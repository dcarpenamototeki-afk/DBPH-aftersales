"use client";

import { useState } from "react";
import { X } from "lucide-react";

type ReleaseTarget = "orcr" | "plate";
type ReleaseMethod = "LBC" | "WALK IN";

export type ReleasePayload = {
  targets: ReleaseTarget[];
  date: string;
  method: ReleaseMethod;
  trackingNumber: string;
  receivedBy: string;
  remarks: string;
};

export function ReleaseModal({
  title,
  onClose,
  onSubmit
}: {
  title: string;
  onClose: () => void;
  onSubmit: (payload: ReleasePayload) => void;
}) {
  const [targets, setTargets] = useState<ReleaseTarget[]>(["orcr"]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<ReleaseMethod>("LBC");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  function toggleTarget(target: ReleaseTarget) {
    setTargets((current) =>
      current.includes(target) ? current.filter((item) => item !== target) : [...current, target]
    );
  }

  function save() {
    if (!targets.length) return;
    onSubmit({ targets, date, method, trackingNumber, receivedBy, remarks });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">Release ORCR / Plate</h3>
            <p className="mt-1 text-sm text-slate-500">{title}</p>
          </div>
          <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-2">
            <p className="text-sm font-medium text-slate-700">Release Item</p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                <input checked={targets.includes("orcr")} type="checkbox" onChange={() => toggleTarget("orcr")} />
                ORCR
              </label>
              <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                <input checked={targets.includes("plate")} type="checkbox" onChange={() => toggleTarget("plate")} />
                Plate
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Date Out
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Dropbox
              <select value={method} onChange={(event) => setMethod(event.target.value as ReleaseMethod)}>
                <option value="LBC">LBC</option>
                <option value="WALK IN">WALK IN</option>
              </select>
            </label>
          </div>

          {method === "LBC" ? (
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Tracking Number
              <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
            </label>
          ) : (
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Received By
              <input value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} />
            </label>
          )}

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Remarks
            <textarea rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={save}>
            Save Release
          </button>
        </div>
      </div>
    </div>
  );
}
