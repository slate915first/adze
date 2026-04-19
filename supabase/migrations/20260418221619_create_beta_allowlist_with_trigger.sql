-- v15.11 — Beta allowlist + auth gating.
--
-- Only emails listed in public.beta_allowlist can create a Supabase auth
-- account. Gives the operator full control without manual user
-- provisioning. Works for any auth path: magic link, password signup,
-- invite, OAuth.
--
-- The allowlist itself has no RLS policies — only the database trigger
-- (security definer) and dashboard admin access read or write it.
--
-- SOURCE OF TRUTH: this file is committed to the repo for audit trail.
-- The seed inserts at the bottom of the live migration were applied via
-- Supabase MCP, NOT via this file. They are intentionally REDACTED here:
-- committing real beta-tester e-mail addresses to a public repo would be
-- an unlawful transfer of their personal data. The redaction has no
-- functional impact — re-running this file in a fresh database produces
-- a working schema with an empty allowlist; allowlist entries are
-- managed via the Supabase dashboard.

create table if not exists public.beta_allowlist (
  email text primary key,
  added_at timestamptz not null default now(),
  note text
);

alter table public.beta_allowlist enable row level security;

-- No client reads this. Only the database trigger (security definer) and
-- dashboard admin access the table. No policies = no public access.

-- Security-definer function so it can read the allowlist even when the
-- calling context has no policies.
create or replace function public.enforce_beta_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    raise exception 'email required';
  end if;
  if not exists (
    select 1 from public.beta_allowlist
    where lower(email) = lower(new.email)
  ) then
    raise exception 'Adze is in closed beta. Your email is not on the invite list. Email hello@adze.life to request access.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Fires before a Supabase auth user is created. Blocks at DB level —
-- cannot be bypassed from the client.
drop trigger if exists enforce_beta_allowlist_trigger on auth.users;
create trigger enforce_beta_allowlist_trigger
  before insert on auth.users
  for each row
  execute function public.enforce_beta_allowlist();

-- Seed inserts intentionally redacted in the repo snapshot — see file
-- header comment. Add new beta-tester emails via the Supabase dashboard.
