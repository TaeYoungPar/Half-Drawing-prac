create role anon nologin; create role authenticated nologin;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('99999999-9999-4999-8999-999999999999');
create table public.rooms(id uuid primary key default gen_random_uuid(),code text unique not null,prompt text not null,host_id uuid not null,guest_id uuid,status text not null,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days');
create table public.drawings(room_id uuid references public.rooms(id) on delete cascade,role text,strokes jsonb,completed boolean,primary key(room_id,role));
alter table public.rooms enable row level security;
grant select on public.rooms to authenticated;
create policy participants on public.rooms for select to authenticated using(auth.uid()=host_id or auth.uid()=guest_id);
insert into public.rooms(id,code,prompt,host_id,guest_id,status,expires_at) values
('33333333-3333-4333-8333-333333333333','ABC123DEF4','울보 양파','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','completed',now()-interval '1 day'),
('44444444-4444-4444-8444-444444444444','EXP123DEF4','만료 후 다시','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','completed',now()+interval '7 days'),
('55555555-5555-4555-8555-555555555555','WAIT23DEF4','아직 그리는 중','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','guest_joined',now()+interval '7 days'),
('66666666-6666-4666-8666-666666666666','RACE23DEF4','동시 신청','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','completed',now()+interval '7 days'),
('99999999-9999-4999-8999-999999999990','OTHER3DEF4','남의 그림','99999999-9999-4999-8999-999999999999',null,'waiting',now()+interval '7 days');
insert into public.drawings select '33333333-3333-4333-8333-333333333333',side,'[{"tool":"pen","color":"#000000","lineWidth":4,"points":[{"x":300,"y":200}]}]'::jsonb,true from unnest(array['left','right']) side;
insert into public.rooms(code,prompt,host_id,guest_id,status,created_at)
select 'B'||lpad(i::text,9,'0'),'bulk-'||i,
case when i%2=0 then '11111111-1111-4111-8111-111111111111'::uuid else '22222222-2222-4222-8222-222222222222'::uuid end,
case when i%2=0 then '22222222-2222-4222-8222-222222222222'::uuid else '11111111-1111-4111-8111-111111111111'::uuid end,
'completed',now()-interval '1 hour'-i*interval '1 second' from generate_series(1,1000) i;

-- Minimal contract-compatible stand-ins for the existing production RPCs.
-- New migrations must reuse these; their production bodies are not in this repository.
create function public.create_room(room_prompt text,initial_strokes jsonb)
returns table(room_id uuid,room_code text,prompt text,room_status text,expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_room public.rooms%rowtype;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 insert into public.rooms(code,prompt,host_id,status) values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),room_prompt,auth.uid(),'waiting') returning * into v_room;
 insert into public.drawings values(v_room.id,'left',initial_strokes,true);
 return query select v_room.id,v_room.code,v_room.prompt,v_room.status,v_room.expires_at;
end $$;
create function public.join_room(room_code text)
returns table(room_id uuid,prompt text,room_status text,expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_room public.rooms%rowtype;
begin
 select * into v_room from public.rooms r where r.code=room_code for update;
 if auth.uid() is null or v_room.id is null or v_room.host_id=auth.uid() or (v_room.guest_id is not null and v_room.guest_id<>auth.uid()) or (v_room.status<>'completed' and v_room.expires_at<=now()) then raise insufficient_privilege; end if;
 if v_room.guest_id is null then update public.rooms r set guest_id=auth.uid(),status='guest_joined' where r.id=v_room.id returning * into v_room; end if;
 return query select v_room.id,v_room.prompt,v_room.status,v_room.expires_at;
end $$;
revoke all on function public.create_room(text,jsonb),public.join_room(text) from public,anon;
grant execute on function public.create_room(text,jsonb),public.join_room(text) to authenticated;
