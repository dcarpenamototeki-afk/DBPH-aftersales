import { RecordModule } from "@/components/record-module";
import { AppShell } from "@/components/shell";
import { moduleConfig } from "@/lib/schema";
import type { InventoryRecord } from "@/lib/types";

export default function InventoryPage() {
  return (
    <AppShell>
      <RecordModule<InventoryRecord>
        config={{
          module: "inventory",
          title: moduleConfig.inventory.title,
          apiPath: moduleConfig.inventory.apiPath,
          columns: [...moduleConfig.inventory.columns],
          filters: [
            { key: "main_status", label: "Main status", options: ["AVAILABLE", "SOLD"] },
            { key: "orcr_status", label: "ORCR status", options: ["COMPLETE", "INCOMPLETE", "PENDING"] },
            { key: "claiming_orcr_status", label: "Claiming status", options: ["RECEIVED", "INCOMPLETE", "TEMPORARY", "WALK IN", "LBC"] }
          ]
        }}
      />
    </AppShell>
  );
}
