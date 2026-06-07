import { RecordModule } from "@/components/record-module";
import { AppShell } from "@/components/shell";
import { moduleConfig } from "@/lib/schema";
import type { OrcrPlateRecord } from "@/lib/types";

export default function OrcrPage() {
  return (
    <AppShell>
      <RecordModule<OrcrPlateRecord>
        config={{
          module: "orcr",
          title: moduleConfig.orcr.title,
          apiPath: moduleConfig.orcr.apiPath,
          columns: [...moduleConfig.orcr.columns],
          filters: [
            { key: "orcr_on_hand", label: "ORCR status", options: ["true", "false"] },
            { key: "plate_on_hand", label: "Plate status", options: ["true", "false"] }
          ]
        }}
      />
    </AppShell>
  );
}
