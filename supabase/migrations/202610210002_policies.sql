-- Install AFTER 202610210001_schema.sql
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.student_profiles enable row level security;
alter table public.scientific_records enable row level security;
alter table public.record_versions enable row level security;
alter table public.comments enable row level security;
alter table public.invites enable row level security;
alter table public.file_assets enable row level security;
alter table public.audit_events enable row level security;

create policy workspaces_read on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy workspaces_edit on public.workspaces for update to authenticated using(public.is_workspace_owner(id)) with check(public.is_workspace_owner(id));
create policy memberships_read on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
-- memberships are created by trigger or accept_invite only. No client-side insert/update/delete grants.
create policy profiles_read on public.student_profiles for select to authenticated using(public.is_workspace_member(workspace_id));
create policy profiles_insert on public.student_profiles for insert to authenticated with check(public.is_workspace_owner(workspace_id));
create policy profiles_update on public.student_profiles for update to authenticated using(public.is_workspace_owner(workspace_id)) with check(public.is_workspace_owner(workspace_id));
create policy profiles_delete on public.student_profiles for delete to authenticated using(public.is_workspace_owner(workspace_id));
create policy records_read on public.scientific_records for select to authenticated using(public.is_workspace_member(workspace_id));
create policy records_insert on public.scientific_records for insert to authenticated with check(public.is_workspace_member(workspace_id,true) and created_by=(select auth.uid()));
create policy records_update on public.scientific_records for update to authenticated using(public.is_workspace_member(workspace_id,true)) with check(public.is_workspace_member(workspace_id,true));
create policy records_delete on public.scientific_records for delete to authenticated using(public.is_workspace_member(workspace_id,true));
create policy versions_read on public.record_versions for select to authenticated using(public.is_workspace_member(workspace_id));
create policy comments_read on public.comments for select to authenticated using(public.is_workspace_member(workspace_id));
create policy comments_insert on public.comments for insert to authenticated with check(public.is_workspace_member(workspace_id,true) and author_id=(select auth.uid()) and exists(select 1 from public.scientific_records r where r.id=record_id and r.workspace_id=workspace_id));
create policy comments_delete on public.comments for delete to authenticated using(author_id=(select auth.uid()) and public.is_workspace_member(workspace_id));
create policy invites_read on public.invites for select to authenticated using(public.is_workspace_owner(workspace_id) or (lower(email)=lower(auth.jwt()->>'email')));
create policy invites_insert on public.invites for insert to authenticated with check(public.is_workspace_owner(workspace_id) and invited_by=(select auth.uid()) and accepted_at is null and expires_at>now() and expires_at<=now()+interval '7 days');
create policy invites_delete on public.invites for delete to authenticated using(public.is_workspace_owner(workspace_id));
create policy file_assets_read on public.file_assets for select to authenticated using(public.is_workspace_member(workspace_id));
create policy file_assets_insert on public.file_assets for insert to authenticated with check(public.is_workspace_member(workspace_id,true) and uploader_id=(select auth.uid()) and split_part(object_path,'/',1)=(select auth.uid())::text and (record_id is null or exists(select 1 from public.scientific_records r where r.id=record_id and r.workspace_id=workspace_id)));
create policy audit_read on public.audit_events for select to authenticated using(public.is_workspace_member(workspace_id));

-- Keep private metadata and versions tamper-resistant. Only database functions/triggers write these.
revoke insert,update,delete on public.record_versions from authenticated;
revoke insert,update,delete on public.audit_events from authenticated;
revoke insert,update,delete on public.workspace_members from authenticated;
revoke insert,update,delete on public.workspaces from authenticated;
grant update(name) on public.workspaces to authenticated;
revoke update(accepted_at) on public.invites from authenticated;

-- Private storage: upload under own UUID; read cross-member only if linked in file_assets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('research-private','research-private',false,8000000,ARRAY['application/octet-stream'])
on conflict(id) do update set public=false,file_size_limit=8000000,allowed_mime_types=excluded.allowed_mime_types;
create policy helix_storage_insert on storage.objects for insert to authenticated with check(
 bucket_id='research-private' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy helix_storage_read on storage.objects for select to authenticated using(
 bucket_id='research-private' and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists(select 1 from public.file_assets f where f.object_path=name and public.is_workspace_member(f.workspace_id))
 )
);
-- No public read, overwrite, or delete policies. Use signed URLs, not public buckets.
