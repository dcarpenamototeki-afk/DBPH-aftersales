"use client";

import { useState } from "react";
import { X } from "lucide-react";

type ClaimedStatus = "CLAIMED" | "TO FOLLOW";

export type SoldPayload = {
  sold_date: string;
  new_owner: string;
  sold_orcr_released: ClaimedStatus;
  sold_plate_released: ClaimedStatus;
  sold_sb_finance_documents: ClaimedStatus;
  sold_for_too: boolean;
};

export function SoldModal({
  title,
  onClose,
  onSubmit
}: {
  title: string;
  onClose: () => void;
  onSubmit: (payload: SoldPayload) => void;
}) {
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10));
  const [newOwner, setNewOwner] = useState("");
  const [orcr, setOrcr] = useState<ClaimedStatus>("TO FOLLOW");
  const [plate, setPlate] = useState<ClaimedStatus>("TO FOLLOW");
  const [documents, setDocuments] = useState<ClaimedStatus>("TO FOLLOW");
  const [forToo, setForToo] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">Sold Unit Details</h3>
            <p className="mt-1 text-sm text-slate-500">{title}</p>
          </div>
          <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Date
            <input type="date" value={soldDate} onChange={(event) => setSoldDate(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            New Owner
            <input value={newOwner} onChange={(event) => setNewOwner(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            ORCR Released
            <select value={orcr} onChange={(event) => setOrcr(event.target.value as ClaimedStatus)}>
              <option value="CLAIMED">Claimed</option>
              <option value="TO FOLLOW">To Follow</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Plate Released
            <select value={plate} onChange={(event) => setPlate(event.target.value as ClaimedStatus)}>
              <option value="CLAIMED">Claimed</option>
              <option value="TO FOLLOW">To Follow</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            SB Finance Documents
            <select value={documents} onChange={(event) => setDocuments(event.target.value as ClaimedStatus)}>
              <option value="CLAIMED">Claimed</option>
              <option value="TO FOLLOW">To Follow</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            For TOO
            <select value={forToo ? "YES" : "NO"} onChange={(event) => setForToo(event.target.value === "YES")}>
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() =>
              onSubmit({
                sold_date: soldDate,
                new_owner: newOwner,
                sold_orcr_released: orcr,
                sold_plate_released: plate,
                sold_sb_finance_documents: documents,
                sold_for_too: forToo
              })
            }
          >
            Save Sold Unit
          </button>
        </div>
      </div>
    </div>
  );
}
