import { clsx } from "clsx";

const green = ["YES", "COMPLETE", "AVAILABLE", "RECEIVED", "TRUE", "ORCR + PLATE", "CLAIMED", "MATCHED", "MATCHED & MOVED", "RELEASED", "CREATE"];
const red = ["NO", "SOLD", "INCOMPLETE", "FALSE", "UNTRACED", "NO MATCH", "DELETE"];
const yellow = ["PENDING", "TEMPORARY", "WALK IN", "LBC", "ORCR ONLY", "PLATE ONLY", "TO FOLLOW", "NOT CHECKED", "IN PROCESS", "UPDATE"];

export function StatusBadge({ value }: { value: unknown }) {
  const text =
    typeof value === "boolean" ? (value ? "YES" : "NO") : String(value ?? "").trim() || "PENDING";
  const upper = text.toUpperCase();

  return (
    <span
      className={clsx(
        "inline-flex min-w-16 justify-center rounded-full px-2.5 py-1 text-xs font-semibold",
        green.includes(upper) && "bg-emerald-100 text-emerald-700",
        red.includes(upper) && "bg-rose-100 text-rose-700",
        yellow.includes(upper) && "bg-amber-100 text-amber-700",
        !green.includes(upper) && !red.includes(upper) && !yellow.includes(upper) && "bg-slate-100 text-slate-700"
      )}
    >
      {text}
    </span>
  );
}
