-- Initial migration: per-user encrypted state blob.
--
-- Each row holds one user's full Adze state, encrypted in their browser
-- with a passphrase-derived AES-GCM-256 key. Server stores ciphertext +
-- per-user salt only; key never leaves the user's device.
--
-- RLS: self-only. The user's auth.uid() must match user_id for any
-- read/insert/update.
--
-- SOURCE OF TRUTH: this file is committed to the repo for audit trail
-- and disaster recovery (snapshot of the live migration). To change the
-- live schema, edit here AND apply via Supabase MCP `apply_migration` or
-- the supabase CLI.

create table if not exists user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  salt text not null,
  updated_at timestamptz not null default now()
);

alter table user_state enable row level security;

create policy "users can read own state"
  on user_state for select
  using (auth.uid() = user_id);

create policy "users can insert own state"
  on user_state for insert
  with check (auth.uid() = user_id);

create policy "users can update own state"
  on user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
