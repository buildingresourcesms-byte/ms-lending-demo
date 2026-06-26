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
