-- Execute once in the Supabase SQL editor. No anonymous/client access.
create table if not exists public.checks (
 id text primary key,
 completed boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.photos (
 id uuid primary key,
 event_id text not null,
 drive_file_id text not null unique,
 filename text not null,
 mime_type text not null check (mime_type = 'image/jpeg'),
 uploaded_at timestamptz not null default now()
);
create index if not exists photos_event_idx on public.photos(event_id);
alter table public.checks enable row level security;
alter table public.photos enable row level security;
revoke all on public.checks, public.photos from anon, authenticated;
-- Backend service_role bypasses RLS. Never use it in the browser.

-- Serialize retries with the same photo ID across serverless instances.
create table if not exists public.photo_uploads (
 id uuid primary key,
 event_id text not null,
 expires_at timestamptz not null
);
alter table public.photo_uploads enable row level security;
revoke all on public.photo_uploads from anon, authenticated;
create or replace function public.claim_photo_upload(photo_id uuid,target_event_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare claimed uuid;
begin
 insert into public.photo_uploads(id,event_id,expires_at)
 values(photo_id,target_event_id,now()+interval '2 minutes')
 on conflict(id) do update set expires_at=excluded.expires_at
 where photo_uploads.expires_at < now() and photo_uploads.event_id=target_event_id
 returning id into claimed;
 return claimed is not null;
end;
$$;
revoke all on function public.claim_photo_upload(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_photo_upload(uuid,text) to service_role;
grant all on public.checks, public.photos, public.photo_uploads to service_role;
