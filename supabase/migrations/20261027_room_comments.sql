-- Run once in this project's Supabase SQL Editor. Safe to run again.
-- Only the two participants of a completed room can read its two comments.
-- Existing rooms, drawings and their policies are not changed.
begin;

create table if not exists public.room_comments (
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (
    char_length(body) between 1 and 80
    -- Match JavaScript trim(), including non-breaking and full-width spaces.
    and body = btrim(body, E' \t\r\n' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
    and body !~ '[[:cntrl:]]'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, author_id)
);

alter table public.room_comments enable row level security;
alter table public.room_comments force row level security;
revoke all on public.room_comments from public, anon, authenticated;
grant select, insert, update, delete on public.room_comments to authenticated;

-- Identity and timestamps cannot be reassigned through an UPDATE or upsert.
create or replace function public.guard_room_comment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.room_id is distinct from OLD.room_id or NEW.author_id is distinct from OLD.author_id then
      raise exception 'COMMENT_IDENTITY_IMMUTABLE' using errcode = '42501';
    end if;
    NEW.created_at := OLD.created_at;
  else
    NEW.created_at := now();
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;
revoke all on function public.guard_room_comment() from public, anon, authenticated;
drop trigger if exists guard_room_comment on public.room_comments;
create trigger guard_room_comment before insert or update on public.room_comments
for each row execute function public.guard_room_comment();

drop policy if exists "participants read completed room comments" on public.room_comments;
create policy "participants read completed room comments" on public.room_comments
for select to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_comments.room_id
    and r.status = 'completed'
    and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid())))
);

drop policy if exists "participants add own completed room comment" on public.room_comments;
create policy "participants add own completed room comment" on public.room_comments
for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.rooms r where r.id = room_comments.room_id
    and r.status = 'completed'
    and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid())))
);

drop policy if exists "participants edit own completed room comment" on public.room_comments;
create policy "participants edit own completed room comment" on public.room_comments
for update to authenticated using (
  author_id = (select auth.uid())
  and exists (select 1 from public.rooms r where r.id = room_comments.room_id
    and r.status = 'completed'
    and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid())))
) with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.rooms r where r.id = room_comments.room_id
    and r.status = 'completed'
    and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid())))
);

drop policy if exists "participants remove own completed room comment" on public.room_comments;
create policy "participants remove own completed room comment" on public.room_comments
for delete to authenticated using (
  author_id = (select auth.uid())
  and exists (select 1 from public.rooms r where r.id = room_comments.room_id
    and r.status = 'completed'
    and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid())))
);

notify pgrst, 'reload schema';
commit;
