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
          filters: []
        }}
      />
    </AppShell>
  );
}
