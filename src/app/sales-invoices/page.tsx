import { RecordModule } from "@/components/record-module";
import { AppShell } from "@/components/shell";
import { moduleConfig } from "@/lib/schema";
import type { SalesInvoiceRecord } from "@/lib/types";

export default function SalesInvoicesPage() {
  return (
    <AppShell>
      <RecordModule<SalesInvoiceRecord>
        config={{
          module: "sales",
          title: moduleConfig.sales.title,
          apiPath: moduleConfig.sales.apiPath,
          columns: [...moduleConfig.sales.columns],
          filters: [{ key: "date_received", label: "Date received", options: [] }]
        }}
      />
    </AppShell>
  );
}
