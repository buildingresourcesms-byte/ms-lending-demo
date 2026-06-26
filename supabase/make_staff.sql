-- ============================================================
-- make_staff.sql — turn your login into a staff member.
-- Run this AFTER you create the auth user (Auth → Users → Add user).
-- Replace the email below with the exact email you used.
-- Links the profile by email lookup, so you don't need to copy the UUID.
-- ============================================================

insert into public.profiles (id, name, role, email, initials, color)
select id, 'Julene Stewart', 'owner', email, 'JS', 'bg-violet-600'
from auth.users
where email = 'you@mslending.net'        -- 👈 change to your email
on conflict (id) do nothing;

-- confirm it worked (should return 1 row):
select id, name, role, email from public.profiles;
