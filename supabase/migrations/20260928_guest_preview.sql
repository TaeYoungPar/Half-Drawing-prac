-- Run in the Supabase SQL editor on the existing project before deploying the
-- companion app change. The guest may see only a 24 px strip of the host's
-- 800 px canvas until both artists finish. Existing room/drawing rows remain.
begin;

drop policy if exists "participants can read permitted drawings" on public.drawings;
create policy "participants can read permitted drawings"
on public.drawings for select to authenticated
using (
  exists (
    select 1 from public.rooms r
    where r.id = drawings.room_id
      and (
        (drawings.role = 'left' and r.host_id = (select auth.uid()))
        or (drawings.role = 'right' and r.guest_id = (select auth.uid()))
        or (r.status = 'completed' and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid())))
      )
  )
);

create or replace function public.get_left_preview(requested_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.rooms r
    where r.id = requested_room_id
      and r.guest_id = (select auth.uid())
      and r.status = 'guest_joined'
      and r.expires_at > now()
  ) then
    raise exception 'ROOM_NOT_AVAILABLE';
  end if;

  -- This returns only recorded points in x=376..400, not the full left
  -- strokes. Connecting lines are shortened near the seam; no hidden points
  -- are included in the JSON response.
  select coalesce(jsonb_agg(jsonb_build_object(
    'points', clipped.points,
    'color', s.stroke->'color',
    'lineWidth', s.stroke->'lineWidth',
    'tool', s.stroke->'tool'
  ) order by s.ordinal), '[]'::jsonb)
  into result
  from public.drawings d
  cross join lateral jsonb_array_elements(d.strokes) with ordinality as s(stroke, ordinal)
  cross join lateral (
    select coalesce(jsonb_agg(p.point order by p.ordinal), '[]'::jsonb) as points
    from jsonb_array_elements(s.stroke->'points') with ordinality as p(point, ordinal)
    where (p.point->>'x')::numeric between 376 and 400
  ) clipped
  where d.room_id = requested_room_id and d.role = 'left'
    and jsonb_array_length(clipped.points) > 0;

  return result;
end;
$$;

revoke all on function public.get_left_preview(uuid) from public;
grant execute on function public.get_left_preview(uuid) to authenticated;
commit;
