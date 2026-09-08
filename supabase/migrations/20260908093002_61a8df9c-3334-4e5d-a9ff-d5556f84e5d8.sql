drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_read_authenticated" on storage.objects for select to authenticated using (bucket_id = 'avatars');