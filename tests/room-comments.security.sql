-- Run only in the isolated test database bootstrapped by room-comments.db.mjs.
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION: %', message; end if; end $$;
create function pg_temp.expect_denied(command text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when insufficient_privilege or check_violation then return;
  end;
  raise exception 'Expected denial: %', command;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select pg_temp.assert_true((select body='before migration rerun' from public.room_comments), 'migration rerun preserves data');
insert into public.room_comments(room_id,author_id,body) values ('33333333-3333-4333-8333-333333333333',auth.uid(),'나는 고양이인 줄 알았어 😆')
  on conflict (room_id,author_id) do update set body=excluded.body;
insert into public.room_comments(room_id,author_id,body) values ('33333333-3333-4333-8333-333333333333',auth.uid(),'다시 보내도 한 개')
  on conflict (room_id,author_id) do update set body=excluded.body;
select pg_temp.assert_true((select count(*)=1 from public.room_comments), 'retry upsert is one entry');
update public.room_comments set body=repeat('🎨',80),created_at='2000-01-01' where author_id=auth.uid();
select pg_temp.assert_true((select char_length(body)=80 and created_at>'2020-01-01' and updated_at>=created_at from public.room_comments), 'emoji count and server timestamps');
select pg_temp.expect_denied($q$update public.room_comments set body=repeat('가',81)$q$);
select pg_temp.expect_denied($q$update public.room_comments set body=repeat('🎨',81)$q$);
select pg_temp.expect_denied($q$update public.room_comments set body='   '$q$);
select pg_temp.expect_denied($q$update public.room_comments set body=' leading'$q$);
select pg_temp.expect_denied($q$update public.room_comments set body=U&'\00A0'$q$);
select pg_temp.expect_denied($q$update public.room_comments set body=U&'\3000full width space'$q$);
select pg_temp.expect_denied($q$update public.room_comments set body=E'line\nbreak'$q$);
select pg_temp.expect_denied($q$update public.room_comments set author_id='22222222-2222-4222-8222-222222222222'$q$);
select pg_temp.expect_denied($q$update public.room_comments set room_id='44444444-4444-4444-8444-444444444444'$q$);
select pg_temp.expect_denied($q$insert into public.room_comments(room_id,author_id,body) values ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','spoofed friend')$q$);
select pg_temp.expect_denied($q$insert into public.room_comments(room_id,body) values ('55555555-5555-4555-8555-555555555555','before completion')$q$);

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
insert into public.room_comments(room_id,body) values ('33333333-3333-4333-8333-333333333333','나는 토끼를 그렸는데!');
select pg_temp.assert_true((select count(*)=2 from public.room_comments), 'both participants read both entries after invite expiry');
with changed as (update public.room_comments set body='tampered' where author_id='11111111-1111-4111-8111-111111111111' returning *) select pg_temp.assert_true((select count(*)=0 from changed), 'friend cannot update my entry');
with removed as (delete from public.room_comments where author_id='11111111-1111-4111-8111-111111111111' returning *) select pg_temp.assert_true((select count(*)=0 from removed), 'friend cannot delete my entry');
select pg_temp.expect_denied($q$insert into public.room_comments(room_id,author_id,body) values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','upsert attack') on conflict (room_id,author_id) do update set body=excluded.body$q$);

select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',false);
select pg_temp.assert_true((select count(*)=0 from public.room_comments), 'outsider reads no entries');
select pg_temp.expect_denied($q$insert into public.room_comments(room_id,body) values ('33333333-3333-4333-8333-333333333333','outsider')$q$);
with changed as (update public.room_comments set body='outsider' returning *) select pg_temp.assert_true((select count(*)=0 from changed), 'outsider cannot update');
with removed as (delete from public.room_comments returning *) select pg_temp.assert_true((select count(*)=0 from removed), 'outsider cannot delete');
reset role;
set role anon;
select pg_temp.expect_denied($q$select * from public.room_comments$q$);
select pg_temp.expect_denied($q$insert into public.room_comments(room_id,body) values ('33333333-3333-4333-8333-333333333333','anonymous')$q$);
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
delete from public.room_comments where room_id='33333333-3333-4333-8333-333333333333' and author_id=auth.uid();
select pg_temp.assert_true((select count(*)=1 and min(author_id::text)='22222222-2222-4222-8222-222222222222' from public.room_comments), 'delete removes only own entry');
reset role;
delete from public.rooms where id='33333333-3333-4333-8333-333333333333';
select pg_temp.assert_true((select count(*)=0 from public.room_comments), 'room deletion removes related entries');
