# Motorcycle ORCR, Plate, Sales Invoice, and Inventory Tracker

Internal Next.js app for encoding, searching, updating, importing, and exporting motorcycle ORCR/plate records, sales invoices, and SB Finance inventory.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Google Sheets import with CSV fallback

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql` in the SQL editor.

3. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. Start the app:

```bash
npm run dev
```

## Google Sheets Import

The app is preconfigured for this spreadsheet ID:

`1ocEClBF-und_Vubzy0h-xqdYQOi6GPzfXJ0lqjq2Grs`

If the sheet is public or published, the import page can read it through the Google Sheets CSV export.

For private sheets, create a Google Cloud service account:

1. Enable the Google Sheets API in Google Cloud.
2. Create a service account and generate a JSON key.
3. Share the Google Sheet with the service account email.
4. Add these values to `.env.local`:

```bash
GOOGLE_SHEETS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The import page previews rows before saving and prevents duplicates using available engine/chassis, invoice, plate, or motor numbers.

## CSV Import

Open `/import`, choose a module, upload a CSV, preview the mapped columns, then save. Headers are normalized automatically, so columns like `Engine No`, `Engine Number`, and `engine_number` map to the same field.

## Modules

- Dashboard: summary cards for ORCR, plates, invoices, and inventory.
- ORCR / Plate Monitoring: add, edit, delete, release ORCR/plate, search, filter, export.
- Sales Invoice: add, edit, delete, search, date tracking, export.
- SB Finance Inventory: add, edit, delete, mark sold, status filters, export.

## Nice-to-Have Extensions

The database includes an `activity_log` table and authenticated RLS policies. To finish role-based access:

1. Enable Supabase Auth providers.
2. Add a `profiles` table with `role` values of `admin` or `staff`.
3. Replace broad authenticated write policies with role-aware policies.
4. Write API route log entries after create/update/delete.

For print-friendly reports, use the browser print command from any filtered table page or create dedicated report pages that reuse the same API filters.
