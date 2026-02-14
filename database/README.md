# Database Tracking

This project tracks Supabase database changes in two ways:

1. Snapshots (full schema + roles)
2. Supabase migrations (when CLI project is linked)

## Prerequisites

- Supabase CLI installed
- `SUPABASE_DB_URL` set in your shell

Example (PowerShell):

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres:<password>@<host>:5432/postgres"
```

## Export snapshots

Run:

```powershell
npm run db:snapshot
```

This generates:

- `database/snapshots/schema-YYYYMMDD-HHMMSS.sql`
- `database/snapshots/roles-YYYYMMDD-HHMMSS.sql`
- `database/schema.latest.sql`
- `database/roles.latest.sql`

## Migration pull (optional but recommended)

If you initialized and linked Supabase CLI (`supabase init` + `supabase link`), the snapshot script also runs:

```bash
supabase db pull
```

This creates timestamped migration files under `supabase/migrations/`.

## Recommended workflow

1. Make DB changes in Supabase.
2. Run `npm run db:snapshot`.
3. Review diffs in `database/` and `supabase/migrations/`.
4. Commit all generated SQL files together with app code changes.
