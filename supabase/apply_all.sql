-- ============================================================
-- 0001_schema.sql — MS Lending core schema
-- Apply: `supabase db push` (CLI) or paste into the SQL editor.
-- Mirrors the client model in src/data.js / src/store.jsx so the
-- localStorage layer can be swapped for real, access-controlled storage.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- staff (loan officers / team) ----------
-- One row per real login. id == auth.users.id.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role        text not null default 'officer'
              check (role in ('owner', 'admin', 'officer', 'processor', 'assistant')),
  nmls        text,
  phone       text,
  email       text,
  initials    text,
  color       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- borrowers (the loan files) ----------
do $$ begin
  create type public.loan_status as enum (
    'New Lead','Contacted','Application Started','Documents Needed','In Review',
    'Pre-Approved','Underwriting','Clear to Close','Closed','Lost'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.borrowers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  co_borrower       text,
  phone             text,
  email             text,
  -- High-sensitivity NPI. Store ONLY app-level envelope-encrypted bytes here.
  -- Never write plaintext SSN/DOB to the database. See src/db/crypto note.
  ssn_enc           bytea,
  dob_enc           bytea,
  loan_type         text,
  purpose           text,
  amount            numeric(14,2),
  property_value    numeric(14,2),
  rate              numeric(6,3),
  credit_score      int,
  city              text,
  property_address  text,
  employer          text,
  source            text,
  status            public.loan_status not null default 'New Lead',
  board_lane        text,                    -- job-board lane override
  officer_id        uuid references public.profiles (id),
  agent_id          text,
  pre_approval_max  numeric(14,2),
  created_at        timestamptz not null default now(),
  stage_entered_at  timestamptz not null default now(),
  last_contact      timestamptz,
  next_follow_up    date,
  est_closing       date,
  rate_lock_expires date,
  updated_at        timestamptz not null default now()
);
create index if not exists borrowers_officer_idx on public.borrowers (officer_id);
create index if not exists borrowers_status_idx  on public.borrowers (status);

-- ---------- document checklist (file metadata; bytes live in Storage) ----------
create table if not exists public.borrower_docs (
  id            uuid primary key default gen_random_uuid(),
  borrower_id   uuid not null references public.borrowers (id) on delete cascade,
  name          text not null,
  status        text not null default 'Needed',
  storage_path  text,                        -- object key in the private 'documents' bucket
  created_at    timestamptz not null default now()
);
create index if not exists borrower_docs_b_idx on public.borrower_docs (borrower_id);

-- ---------- notes & timeline ----------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers (id) on delete cascade,
  author      text,
  body        text not null,
  created_at  timestamptz not null default now()
);
create table if not exists public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers (id) on delete cascade,
  type        text not null,
  text        text not null,
  created_at  timestamptz not null default now()
);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  borrower_id uuid references public.borrowers (id) on delete set null,
  officer_id  uuid references public.profiles (id),
  due         date,
  priority    text not null default 'Medium' check (priority in ('High','Medium','Low')),
  status      text not null default 'To Do' check (status in ('To Do','In Progress','Waiting','Complete')),
  created_at  timestamptz not null default now()
);

-- ---------- two-way messages (SMS / email threads) ----------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers (id) on delete cascade,
  dir         text not null check (dir in ('in','out')),
  channel     text not null check (channel in ('sms','email','call')),
  body        text not null,
  read        boolean not null default false,
  status      text,
  created_at  timestamptz not null default now()
);
create index if not exists messages_b_idx on public.messages (borrower_id, created_at);

-- ---------- email templates (team-shared library) ----------
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject     text,
  body        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- portal sharing: invite anyone, per-item permissions ----------
create table if not exists public.portal_shares (
  id          uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers (id) on delete cascade,
  email       text not null,                 -- the invitee's login email
  name        text,
  relation    text,
  -- which sections this person may see; mirrors SHARE_ITEMS in src/data.js
  perms       jsonb not null default
              '{"progress":true,"documents":false,"vault":false,"facts":false,"chat":true,"officer":true}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (borrower_id, email)
);
create index if not exists portal_shares_email_idx on public.portal_shares (lower(email));

-- ---------- portal group chat (everyone invited can read/post) ----------
create table if not exists public.portal_chat (
  id          uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers (id) on delete cascade,
  author      text not null,
  role        text,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists portal_chat_b_idx on public.portal_chat (borrower_id, created_at);

-- ---------- post-close vault (will, insurance, deed…) ----------
create table if not exists public.vault_items (
  id           uuid primary key default gen_random_uuid(),
  borrower_id  uuid not null references public.borrowers (id) on delete cascade,
  name         text not null,
  status       text not null default 'Stored',
  added_by     text,
  storage_path text,                          -- object key in the private 'vault' bucket
  created_at   timestamptz not null default now()
);
create index if not exists vault_items_b_idx on public.vault_items (borrower_id);

-- ---------- keep updated_at fresh ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists borrowers_touch on public.borrowers;
create trigger borrowers_touch before update on public.borrowers
  for each row execute function public.touch_updated_at();

drop trigger if exists templates_touch on public.templates;
create trigger templates_touch before update on public.templates
  for each row execute function public.touch_updated_at();
-- ============================================================
-- 0002_security.sql — Row-Level Security
-- This is the compliance control, not just app logic: access is
-- enforced at the database. Three identities:
--   staff    = a row in public.profiles (loan officers)
--   owner    = the borrower whose login email matches borrowers.email
--   invitee  = a login email listed in portal_shares, scoped by perms
-- ============================================================

-- ---------- identity helpers ----------
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active);
$$;

create or replace function public.portal_is_owner(b_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.borrowers b
    where b.id = b_id
      and b.email is not null
      and lower(b.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.portal_can(b_id uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.portal_shares s
    where s.borrower_id = b_id
      and lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce((s.perms ->> perm)::boolean, false)
  );
$$;

-- ---------- enable RLS everywhere (deny by default) ----------
alter table public.profiles        enable row level security;
alter table public.borrowers       enable row level security;
alter table public.borrower_docs   enable row level security;
alter table public.notes           enable row level security;
alter table public.timeline_events enable row level security;
alter table public.tasks           enable row level security;
alter table public.messages        enable row level security;
alter table public.templates       enable row level security;
alter table public.portal_shares   enable row level security;
alter table public.portal_chat     enable row level security;
alter table public.vault_items     enable row level security;

-- ---------- staff directory ----------
create policy profiles_staff_read on public.profiles for select using (public.is_staff());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- borrowers: STAFF ONLY on the base table (it holds ssn_enc/dob_enc) ----------
-- Owners/invitees never touch this table; they read safe columns via the
-- portal_borrower view below.
create policy borrowers_staff_all on public.borrowers for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------- internal-only tables: staff only ----------
create policy notes_staff   on public.notes           for all using (public.is_staff()) with check (public.is_staff());
create policy tl_staff      on public.timeline_events  for all using (public.is_staff()) with check (public.is_staff());
create policy tasks_staff   on public.tasks            for all using (public.is_staff()) with check (public.is_staff());
create policy msgs_staff    on public.messages         for all using (public.is_staff()) with check (public.is_staff());
create policy tmpl_staff    on public.templates        for all using (public.is_staff()) with check (public.is_staff());

-- ---------- document checklist: staff + owner + invitee(with 'documents') ----------
create policy docs_read on public.borrower_docs for select
  using (public.is_staff() or public.portal_is_owner(borrower_id) or public.portal_can(borrower_id,'documents'));
create policy docs_write on public.borrower_docs for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------- vault: staff + owner + invitee(with 'vault'); owner can edit ----------
create policy vault_read on public.vault_items for select
  using (public.is_staff() or public.portal_is_owner(borrower_id) or public.portal_can(borrower_id,'vault'));
create policy vault_write on public.vault_items for all
  using (public.is_staff() or public.portal_is_owner(borrower_id))
  with check (public.is_staff() or public.portal_is_owner(borrower_id));

-- ---------- group chat: staff + owner + invitee(with 'chat') can read AND post ----------
create policy chat_read on public.portal_chat for select
  using (public.is_staff() or public.portal_is_owner(borrower_id) or public.portal_can(borrower_id,'chat'));
create policy chat_post on public.portal_chat for insert
  with check (public.is_staff() or public.portal_is_owner(borrower_id) or public.portal_can(borrower_id,'chat'));

-- ---------- shares: the BORROWER (owner) controls who sees what; staff can assist ----------
create policy shares_read on public.portal_shares for select
  using (public.is_staff() or public.portal_is_owner(borrower_id));
create policy shares_manage on public.portal_shares for all
  using (public.is_staff() or public.portal_is_owner(borrower_id))
  with check (public.is_staff() or public.portal_is_owner(borrower_id));

-- ============================================================
-- Portal-facing views: column protection. Security-definer views own
-- the row filtering and expose ONLY safe columns — invitees can never
-- select ssn_enc/dob_enc/credit_score, even with a crafted query.
-- ============================================================
create or replace view public.portal_borrower as
  select b.id,
         b.name,
         split_part(b.name, ' ', 1) as first_name,
         b.status,
         b.loan_type,
         b.amount,
         b.est_closing,
         b.officer_id
  from public.borrowers b
  where public.is_staff()
     or public.portal_is_owner(b.id)
     or public.portal_can(b.id, 'facts')
     or public.portal_can(b.id, 'progress');

create or replace view public.portal_officer as
  select p.id, p.name, p.role, p.phone, p.email, p.initials, p.color
  from public.profiles p
  where p.is_active;

revoke all on public.portal_borrower from anon;
revoke all on public.portal_officer  from anon;
grant select on public.portal_borrower to authenticated;
grant select on public.portal_officer  to authenticated;
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
-- ============================================================
-- 0004_storage.sql — private file storage for documents & the vault
-- Bytes never live in the database or as public URLs. Objects are keyed
-- "<borrower_id>/<filename>"; access is gated by the same staff/owner/
-- invitee rules as the tables. Downloads use short-lived signed URLs
-- (created in app code via createSignedUrl), never public links.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false), ('vault', 'vault', false)
on conflict (id) do nothing;

-- first path segment = borrower_id
-- (storage.foldername(name))[1]::uuid

-- ---------- documents bucket: loan paperwork (highest sensitivity) ----------
create policy documents_read on storage.objects for select using (
  bucket_id = 'documents' and (
    public.is_staff()
    or public.portal_is_owner(((storage.foldername(name))[1])::uuid)
    or public.portal_can(((storage.foldername(name))[1])::uuid, 'documents')
  )
);
create policy documents_write on storage.objects for insert with check (
  bucket_id = 'documents' and (
    public.is_staff()
    or public.portal_is_owner(((storage.foldername(name))[1])::uuid)   -- borrower uploads their own
  )
);
create policy documents_modify on storage.objects for update using (
  bucket_id = 'documents' and public.is_staff()
);
create policy documents_delete on storage.objects for delete using (
  bucket_id = 'documents' and public.is_staff()
);

-- ---------- vault bucket: post-close personal docs (owner-managed) ----------
create policy vault_read on storage.objects for select using (
  bucket_id = 'vault' and (
    public.is_staff()
    or public.portal_is_owner(((storage.foldername(name))[1])::uuid)
    or public.portal_can(((storage.foldername(name))[1])::uuid, 'vault')
  )
);
create policy vault_write on storage.objects for insert with check (
  bucket_id = 'vault' and (
    public.is_staff()
    or public.portal_is_owner(((storage.foldername(name))[1])::uuid)
  )
);
create policy vault_delete on storage.objects for delete using (
  bucket_id = 'vault' and (
    public.is_staff()
    or public.portal_is_owner(((storage.foldername(name))[1])::uuid)
  )
);
-- ============================================================
-- seed.sql — sample data to test the backend on a FREE project.
-- Run in the Supabase SQL editor (executes as the service role, so it
-- bypasses RLS for seeding).
--
-- ⚠️  FAKE DATA ONLY. Never seed or store real borrower information on a
--     free project — there is no DPA. See ../COMPLIANCE.md.
-- ============================================================

-- 1) Make yourself "staff" so RLS recognizes you.
--    First: Auth → Users → Add user (your email). Copy its UUID, then:
-- insert into public.profiles (id, name, role, email, initials, color)
-- values ('<your-auth-user-uuid>', 'Julene Stewart', 'owner',
--         'you@mslending.net', 'JS', 'bg-violet-600');

-- 2) Sample borrowers (fictional)
insert into public.borrowers (name, email, phone, loan_type, purpose, amount, city, status) values
  ('Sample Buyer One', 'buyer1@example.com', '(601) 555-0101', 'Conventional', 'Purchase', 275000, 'Madison', 'New Lead'),
  ('Sample Buyer Two', 'buyer2@example.com', '(601) 555-0102', 'FHA',          'Purchase', 198000, 'Brandon', 'Documents Needed');

-- 3) A couple of templates
insert into public.templates (name, subject, body) values
  ('Welcome',     'Welcome to MS Lending, {first}', 'Hi {first}, thanks for reaching out — I''m glad you did.'),
  ('Doc request', 'A few documents',                'Hi {first}, we just need a few items to keep things moving.');

-- 4) Share Buyer One's portal with a test invitee (progress + chat only) —
--    proves the RLS permission model end to end.
-- insert into public.portal_shares (borrower_id, email, name, relation, perms)
-- select id, 'invitee@example.com', 'Test Invitee', 'Spouse / Partner',
--        '{"progress":true,"documents":false,"vault":false,"facts":false,"chat":true,"officer":true}'::jsonb
-- from public.borrowers where name = 'Sample Buyer One';

-- Verify RLS quickly: sign into the app as your staff user → you see both
-- borrowers. Sign in as invitee@example.com → portal_borrower shows Buyer One
-- with progress + chat only, and ssn_enc is never selectable.
