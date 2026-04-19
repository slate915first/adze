-- v15.16.2 — harden user_state.updated_at against client clock skew + fix
-- enforce_beta_allowlist search_path to the project's security convention.
--
-- Two unrelated but small schema fixes bundled as they both land in the same
-- release cycle. Either can be rolled back independently.
--
-- (1) user_state.updated_at was client-supplied on every push. Mobile clocks
--     can skew tens of seconds to minutes after sleep/wake. When the cross-
--     device optimistic-concurrency guard lands (Fleet Review Important,
--     tracked separately), it will rely on updated_at being monotonically
--     authoritative. A BEFORE UPDATE trigger forces updated_at = now() on
--     every update regardless of what the client sends. Insert-time default
--     (`default now()`) is already in place from the initial migration.
--
-- (2) enforce_beta_allowlist SECURITY DEFINER was `set search_path = public`
--     and relied on unqualified `beta_allowlist` resolving against public.
--     The project convention (per cleanup_inactive_users) is
--     `set search_path = ''` with fully-qualified identifiers, so a
--     malicious object injected into public cannot run with definer
--     privileges. Low-risk today (no public-schema write access outside
--     the operator), but eliminates the class of bug.

-- (1) --------------------------------------------------------------------

create or replace function public.set_user_state_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
  before update on public.user_state
  for each row
  execute function public.set_user_state_updated_at();

-- (2) --------------------------------------------------------------------

create or replace function public.enforce_beta_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
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
