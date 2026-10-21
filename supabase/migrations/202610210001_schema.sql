-- HelixLab student beta - install once in Supabase SQL Editor.
-- Auth boundary: Supabase user identities. Student personas are NOT separate auth identities.
create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Research Lab' check(char_length(name) between 1 and 160),
  created_at timestamptz not null default now()
);
create unique index workspaces_one_per_owner on public.workspaces(owner_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key(workspace_id,user_id)
);
create index workspace_members_user on public.workspace_members(user_id);
-- Enforce at most five authenticated members as well as five visual student profiles.
create or replace function public.member_capacity_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.workspaces where id=new.workspace_id for update;
 if (select count(*) from public.workspace_members where workspace_id=new.workspace_id)>=5 then
  raise exception 'Maximum 5 authenticated group members';
 end if;
 return new;
end $$;
create trigger member_capacity before insert on public.workspace_members for each row execute function public.member_capacity_guard();

-- Profile slots enforced by database. A single login can choose up to 5 personas.
-- Shared credentials mean shared access: NOT separate security principals.
create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slot smallint not null check(slot between 1 and 5),
  display_name text not null check(char_length(display_name) between 1 and 60),
  color text not null default '#6374c6' check(color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique(workspace_id,slot), unique(id,workspace_id)
);

create table public.scientific_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid,
  type text not null check(type in ('sequence','notebook','protein','chemical','structure','pharmacophore')),
  name text not null check(char_length(name) between 1 and 160),
  content jsonb not null default '{}'::jsonb check(octet_length(content::text)<4000000),
  constraint validate_sequence_content check(
    type<>'sequence' or (coalesce(jsonb_typeof(content->'sequence')='string',false)
      and char_length(content->>'sequence') between 1 and 1000000
      and (content->>'sequence') ~ '^[ACGTRYSWKMBDHVN]+$')
  ),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  revision integer not null default 1 check(revision>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(profile_id,workspace_id) references public.student_profiles(id,workspace_id)
);
create index records_workspace_updated on public.scientific_records(workspace_id,updated_at desc);

create table public.record_versions (
  id bigint generated always as identity primary key,
  record_id uuid not null references public.scientific_records(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  revision integer not null,
  previous_name text not null,
  previous_content jsonb not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  unique(record_id,revision)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  record_id uuid not null references public.scientific_records(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check(char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index comments_record on public.comments(record_id,created_at);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check(char_length(email) between 3 and 320),
  role text not null check(role in ('editor','viewer')),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default now()+interval '7 days',
  created_at timestamptz not null default now()
);
create index invites_email on public.invites(lower(email));

create table public.file_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  record_id uuid references public.scientific_records(id) on delete set null,
  uploader_id uuid not null references auth.users(id),
  object_path text not null unique,
  filename text not null check(char_length(filename) between 1 and 255),
  mime_type text not null,
  bytes integer not null check(bytes between 1 and 8000000),
  sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- Security-definer helper avoids policy recursion. Never accept caller-claimed uid.
create or replace function public.is_workspace_member(ws uuid, needs_write boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=ws and m.user_id=(select auth.uid()) and (not needs_write or m.role in ('owner','editor')))
$$;
create or replace function public.is_workspace_owner(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspaces w where w.id=ws and w.owner_id=(select auth.uid()))
$$;
revoke all on function public.is_workspace_member(uuid,boolean) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
grant execute on function public.is_workspace_member(uuid,boolean) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;

create or replace function public.on_signup_create_workspace()
returns trigger language plpgsql security definer set search_path='' as $$
declare ws uuid;
begin
 insert into public.workspaces(owner_id,name) values(new.id,'My Research Lab') returning id into ws;
 insert into public.workspace_members(workspace_id,user_id,role) values(ws,new.id,'owner');
 insert into public.student_profiles(workspace_id,slot,display_name,color) values(ws,1,'Researcher 1','#6374c6');
 return new;
end $$;
create trigger helix_create_workspace after insert on auth.users for each row execute function public.on_signup_create_workspace();

-- Prevent changing privileged record fields and ensure revision/history are server authored.
create or replace function public.record_before_update()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.workspace_id<>old.workspace_id or new.created_by<>old.created_by or new.created_at<>old.created_at then
  raise exception 'Immutable record identity fields';
 end if;
 if not public.is_workspace_member(old.workspace_id,true) then raise exception 'Unauthorized edit'; end if;
 new.revision=old.revision+1;
 new.updated_at=now();
 new.updated_by=auth.uid();
 insert into public.record_versions(record_id,workspace_id,revision,previous_name,previous_content,changed_by)
 values(old.id,old.workspace_id,old.revision,old.name,old.content,auth.uid());
 return new;
end $$;
create trigger record_before_update_trigger before update on public.scientific_records for each row execute function public.record_before_update();

create or replace function public.record_before_insert()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.is_workspace_member(new.workspace_id,true) then raise exception 'Unauthorized insert'; end if;
 new.created_by=auth.uid(); new.updated_by=auth.uid(); new.revision=1;
 return new;
end $$;
create trigger record_before_insert_trigger before insert on public.scientific_records for each row execute function public.record_before_insert();

create or replace function public.record_audit_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return coalesce(new,old); end if;
 insert into public.audit_events(workspace_id,actor_id,action,entity_id)
 values(case when tg_op='DELETE' then old.workspace_id else new.workspace_id end,
        auth.uid(),lower(tg_op)||'_record',case when tg_op='DELETE' then old.id else new.id end);
 return coalesce(new,old);
end $$;
create trigger record_audit after insert or update or delete on public.scientific_records for each row execute function public.record_audit_trigger();

create or replace function public.profile_capacity_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_workspace_owner(new.workspace_id) then raise exception 'Only account owner may create profiles'; end if;
 -- A workspace row lock serializes parallel creations across slots.
 perform 1 from public.workspaces where id=new.workspace_id for update;
 if (select count(*) from public.student_profiles where workspace_id=new.workspace_id)>=5 then raise exception 'Maximum 5 student profiles'; end if;
 return new;
end $$;
create trigger profile_capacity before insert on public.student_profiles for each row execute function public.profile_capacity_guard();

create or replace function public.accept_invite(invite_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare i record; who text;
begin
 who=(select email from auth.users where id=auth.uid() and email_confirmed_at is not null);
 if who is null then raise exception 'Login required'; end if;
 select * into i from public.invites where id=invite_id for update;
 if not found or i.accepted_at is not null or i.expires_at<=now() or lower(i.email)<>lower(who) then raise exception 'Invite invalid, expired, or intended for another email'; end if;
 insert into public.workspace_members(workspace_id,user_id,role) values(i.workspace_id,auth.uid(),i.role)
 on conflict(workspace_id,user_id) do nothing;
 update public.invites set accepted_at=now() where id=invite_id;
 return true;
end $$;
revoke all on function public.accept_invite(uuid) from public;
grant execute on function public.accept_invite(uuid) to authenticated;

create or replace function public.restore_record_version(target_record uuid, target_revision integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare r record; v record;
begin
 select * into r from public.scientific_records where id=target_record for update;
 if not found or not public.is_workspace_member(r.workspace_id,true) then raise exception 'Not permitted'; end if;
 select * into v from public.record_versions where record_id=target_record and revision=target_revision;
 if not found then raise exception 'Revision unavailable'; end if;
 update public.scientific_records set name=v.previous_name,content=v.previous_content where id=target_record;
 return true;
end $$;
revoke all on function public.restore_record_version(uuid,integer) from public;
grant execute on function public.restore_record_version(uuid,integer) to authenticated;

