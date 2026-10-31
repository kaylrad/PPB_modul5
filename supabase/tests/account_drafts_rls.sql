-- Run as postgres in SQL Editor. All test changes are rolled back.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','draft-test-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','draft-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select * from public.save_account_draft('create','{"formData":{"name":"Version 1"}}',null,'2026-10-31T10:00:00Z');
select * from public.save_account_draft('create','{"formData":{"name":"Version 2"}}',null,'2026-10-31T10:02:00Z');
select * from public.save_account_draft('create','{"formData":{"name":"STALE"}}',null,'2026-10-31T10:01:00Z');
do $$ begin
 if (select payload->'formData'->>'name' from public.account_drafts where draft_id='create')<>'Version 2' then
  raise exception 'FAIL: older device overwrote newer draft';
 end if;
end $$;
select * from public.save_account_draft('create','{"formData":{"name":"Version 2"}}','2026-10-31T10:03:00Z','2026-10-31T10:03:00Z');
do $$ begin
 if exists(select 1 from public.account_drafts where archived_at is null) then raise exception 'FAIL: archive still active'; end if;
 if not exists(select 1 from public.account_drafts where archived_at is not null) then raise exception 'FAIL: archive lost data'; end if;
 begin
  delete from public.account_drafts where draft_id='create';
  raise exception 'FAIL: permanent DELETE allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.account_drafts) then raise exception 'FAIL: other account draft visible'; end if;
 begin
  insert into public.account_drafts(owner_id,draft_id,payload) values('11111111-1111-4111-8111-111111111111','forged','{}');
  raise exception 'FAIL: forged owner accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
select * from public.save_account_draft('create','{"formData":{"name":"User B"}}',null,'2026-10-31T10:04:00Z');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select * from public.save_account_draft('create','{"formData":{"name":"Restored A"}}',null,'2026-10-31T10:05:00Z');
do $$ begin
 if (select count(*) from public.account_drafts)<>1 then raise exception 'FAIL: account scope mismatch'; end if;
 if (select payload->'formData'->>'name' from public.account_drafts)<>'Restored A' then raise exception 'FAIL: restore failed'; end if;
end $$;
rollback;
select 'PASS: private drafts, forged-owner rejection, stale-write protection, archive/restore, permanent-delete denial; test data rolled back' as result;
