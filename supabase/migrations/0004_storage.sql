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
