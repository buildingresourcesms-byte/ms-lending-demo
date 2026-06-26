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
