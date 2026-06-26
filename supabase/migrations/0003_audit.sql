-- ============================================================
-- 0003_audit.sql — append-only audit trail of changes to NPI
-- Satisfies Safeguards Rule 314.4(c)(8): log authorized-user activity.
-- Writes (insert/update/delete) are captured by trigger here.
-- READ logging (SELECT) needs the pgaudit extension — see supabase/README.md.
-- ============================================================

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,                          -- auth.uid() of who did it
  actor_email text,
  action      text not null,                 -- INSERT | UPDATE | DELETE
  table_name  text not null,
  record_id   text,
  detail      jsonb,                         -- changed keys (no raw NPI values)
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_record_idx on public.audit_log (table_name, record_id);
create index if not exists audit_log_actor_idx  on public.audit_log (actor_id, created_at);

-- Append-only: nobody updates/deletes audit rows. Only staff may read.
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select using (public.is_staff());
-- (no insert/update/delete policy → only the SECURITY DEFINER trigger can write)

create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rid text;
  keys jsonb;
begin
  rid := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, '');
  -- record which columns changed, never the sensitive values themselves
  if tg_op = 'UPDATE' then
    select jsonb_agg(key) into keys
    from jsonb_each(to_jsonb(new))
    where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key
      and key not in ('ssn_enc','dob_enc','updated_at');
  end if;
  insert into public.audit_log (actor_id, actor_email, action, table_name, record_id, detail)
  values (auth.uid(), auth.jwt() ->> 'email', tg_op, tg_table_name, rid,
          case when keys is not null then jsonb_build_object('changed', keys) else null end);
  return null; -- AFTER trigger
end $$;

-- attach to the tables that hold borrower NPI
do $$
declare t text;
begin
  foreach t in array array['borrowers','borrower_docs','notes','messages','vault_items','portal_shares'] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I
         for each row execute function public.write_audit()', t, t);
  end loop;
end $$;
