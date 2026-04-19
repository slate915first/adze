-- Track A10 (Datenschutzerklärung commitment): 24-month-inactivity auto-delete.
--
-- Adze's Datenschutzerklärung promises that account e-mail + encrypted state
-- are retained "until you delete your account, or 24 months of inactivity".
-- This migration makes that promise enforceable.
--
-- Strategy:
--   * SECURITY DEFINER function cleanup_inactive_users(dry_run boolean) —
--     finds users whose latest activity (max of last_sign_in_at /
--     created_at / user_state.updated_at) is older than 24 months. With
--     dry_run=true (the default) it returns the candidate rows WITHOUT
--     deleting anything.
--   * Mirrors the Edge Function's order: beta_allowlist by email, then
--     auth.users by id (cascades to user_state via FK).
--   * Scheduled daily at 03:30 UTC via pg_cron — STARTING IN DRY-RUN.
--     Operator validates the dry-run output, then updates the cron command
--     to pass false (see ALTER snippet at the bottom of the file).
--
-- SOURCE OF TRUTH: this file is the canonical version. To change the
-- live schedule or function, edit here AND re-apply via Supabase MCP.

create extension if not exists pg_cron with schema extensions;

create or replace function public.cleanup_inactive_users(dry_run boolean default true)
returns table(user_id uuid, email text, last_active_at timestamptz, dry boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
begin
  for rec in
    select
      u.id as uid,
      u.email as e,
      greatest(
        coalesce(u.last_sign_in_at, u.created_at),
        coalesce(s.updated_at,      u.created_at)
      ) as last_active
    from auth.users u
    left join public.user_state s on s.user_id = u.id
    where greatest(
      coalesce(u.last_sign_in_at, u.created_at),
      coalesce(s.updated_at,      u.created_at)
    ) < (now() - interval '24 months')
  loop
    user_id        := rec.uid;
    email          := rec.e;
    last_active_at := rec.last_active;
    dry            := dry_run;

    if not dry_run then
      -- Allowlist first (mirrors the delete-account Edge Function order so
      -- the email is gone before the auth identity is destroyed).
      if rec.e is not null then
        delete from public.beta_allowlist where lower(beta_allowlist.email) = lower(rec.e);
      end if;
      -- Auth row second; cascades to user_state via FK.
      delete from auth.users where id = rec.uid;
    end if;

    return next;
  end loop;
  return;
end;
$$;

comment on function public.cleanup_inactive_users(boolean) is
  'DSGVO Track A10: deletes users whose latest activity (max of last_sign_in_at, created_at, user_state.updated_at) is older than 24 months. Default dry_run=true reports candidates without deleting. Scheduled daily by pg_cron — initially in dry-run mode. Mirrors the delete-account Edge Function order: public.beta_allowlist first, auth.users second (cascades to public.user_state via FK).';

-- Lock down callable surface. Only postgres (which runs the cron job) and
-- service_role (for manual operator ops) may execute. No anon, no authenticated.
revoke all on function public.cleanup_inactive_users(boolean) from public;
revoke all on function public.cleanup_inactive_users(boolean) from anon;
revoke all on function public.cleanup_inactive_users(boolean) from authenticated;
grant  execute on function public.cleanup_inactive_users(boolean) to postgres, service_role;

-- Schedule daily at 03:30 UTC, IN DRY-RUN MODE.
-- To switch to live deletion later, run:
--   select cron.unschedule('adze-cleanup-inactive-users');
--   select cron.schedule(
--     'adze-cleanup-inactive-users',
--     '30 3 * * *',
--     $cron$ select * from public.cleanup_inactive_users(false); $cron$
--   );
select cron.schedule(
  'adze-cleanup-inactive-users',
  '30 3 * * *',
  $cron$ select * from public.cleanup_inactive_users(true); $cron$
);
