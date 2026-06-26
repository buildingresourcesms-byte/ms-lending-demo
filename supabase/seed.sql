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
