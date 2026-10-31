-- Temporary fixtures; all changes roll back.
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.catalog_archives(item_id,snapshot,archived_at,trashed_at) values ('qa-trash','{"name":"QA Trash"}',now(),now());
insert into public.catalog_reviews(id,item_id,rating,comment) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qa-trash',5,'QA Trash');
do $$ begin
 begin update public.catalog_reviews set trashed_at=now() where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';raise exception 'FAIL trash review stayed public';exception when check_violation then null;end;
 begin update public.catalog_archives set archived_at=null where item_id='qa-trash';raise exception 'FAIL trash catalog became active';exception when check_violation then null;end;
end $$;
update public.catalog_reviews set deleted_at=now(),trashed_at=now() where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select * from public.save_account_draft('qa-trash','{"formData":{"name":"QA Trash"},"trashedAt":"2026-10-31T05:00:00Z"}',null,now());
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare changed integer;begin
 if exists(select 1 from public.account_drafts where draft_id='qa-trash') then raise exception 'FAIL private trashed draft visible';end if;
 if exists(select 1 from public.catalog_archives where item_id='qa-trash') then raise exception 'FAIL private trashed archive visible';end if;
 if exists(select 1 from public.catalog_reviews where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL trashed review visible';end if;
 update public.catalog_archives set trashed_at=null where item_id='qa-trash';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL B restored A catalog trash';end if;
 update public.catalog_reviews set trashed_at=null where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL B restored A review trash';end if;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if not exists(select 1 from public.account_drafts where draft_id='qa-trash' and payload->>'trashedAt' is not null and payload->'formData'->>'name'='QA Trash') then raise exception 'FAIL draft trash payload lost';end if;
end $$;
update public.catalog_archives set trashed_at=null where item_id='qa-trash';
update public.catalog_reviews set trashed_at=null where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select * from public.save_account_draft('qa-trash','{"formData":{"name":"QA Trash"},"trashedAt":null}',null,now()+interval '1 second');
do $$ begin
 if not exists(select 1 from public.catalog_archives where item_id='qa-trash' and trashed_at is null and archived_at is not null and snapshot->>'name'='QA Trash') then raise exception 'FAIL catalog trash restore';end if;
 if not exists(select 1 from public.catalog_reviews where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and trashed_at is null and deleted_at is not null and comment='QA Trash') then raise exception 'FAIL review trash restore';end if;
 if not exists(select 1 from public.account_drafts where draft_id='qa-trash' and payload->>'trashedAt' is null and payload->'formData'->>'name'='QA Trash') then raise exception 'FAIL draft trash restore';end if;
end $$;
rollback;
select 'PASS: draft and archive trash retention, owner isolation, restore to archive, trashed items cannot become active' as result;
