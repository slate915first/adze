# Supabase migrations — repo snapshot

Source-of-truth copies of the migrations applied to the Adze Supabase project (`zpawwkvdgocsrwwalhxu`). Filenames mirror the Supabase migration version numbers (`<version>_<name>.sql`). Companion to `supabase/functions/` which holds Edge Function snapshots.

## Why these are committed

1. **Audit trail** — git history shows when each schema change happened and why.
2. **Disaster recovery** — if the Supabase project is lost or needs reconstruction, these files plus the Edge Function snapshots are enough to rebuild.
3. **Code review** — schema changes can be discussed in PRs alongside the client code that depends on them.

## What's NOT in this folder

- **Live data** — only DDL + intentionally-public DML (e.g. seed inserts of constants). User content lives only in the live database.
- **Personal data in seeds** — the `create_beta_allowlist_with_trigger` migration originally seeded two beta-tester e-mail addresses; those are intentionally redacted here. Real allowlist entries are managed via the Supabase dashboard.
- **Secrets** — service-role keys, JWT secrets, etc. live in Supabase env vars only.

## Workflow when changing the schema

1. Edit the migration file here (or create a new one with `<UTC-version>_<name>.sql`).
2. Apply via Supabase MCP (`apply_migration`) or the `supabase` CLI.
3. Verify with `mcp__supabase__list_migrations` that the version landed.
4. Commit the SQL file alongside any client-side changes that depend on it.

## Current migrations

| Version | Name | Purpose |
|---|---|---|
| 20260417212332 | create_user_state | Initial: per-user encrypted state blob with self-only RLS |
| 20260418221619 | create_beta_allowlist_with_trigger | Closed-beta gating via auth.users insert trigger |
| 20260419102900 | enable_pg_cron_and_inactive_user_cleanup | DSGVO Track A10 — 24-month-inactivity auto-delete (dry-run) |
