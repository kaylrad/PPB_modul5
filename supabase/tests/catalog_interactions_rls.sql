-- Transaction-only fixtures: no test users or rows remain after ROLLBACK.
begin;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.catalog_archives(item_id,snapshot,archived_at) values ('qa-item','{"name":"QA"}',now());
insert into public.catalog_reviews(id,item_id,rating,comment) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qa-item',5,'QA initial');
do $$ begin
 begin insert into public.catalog_reviews(item_id,rating) values ('qa-item',4);raise exception 'FAIL duplicate review accepted';exception when unique_violation then null;end;
 begin insert into public.catalog_reviews(item_id,rating) values ('qa-rating',6);raise exception 'FAIL invalid rating accepted';exception when check_violation then null;end;
 begin insert into public.catalog_review_votes(review_id,value) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1);raise exception 'FAIL self vote accepted';exception when insufficient_privilege then null;end;
 begin delete from public.catalog_reviews where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';raise exception 'FAIL permanent delete allowed';exception when insufficient_privilege then null;end;
 begin update public.catalog_reviews set item_id='changed' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';raise exception 'FAIL identity changed';exception when raise_exception then if SQLERRM<>'Record identity cannot change' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare changed integer;begin
 if exists(select 1 from public.catalog_archives where item_id='qa-item') then raise exception 'FAIL private archive visible to B';end if;
 update public.catalog_reviews set comment='forged' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL B changed A review';end if;
 update public.catalog_archives set archived_at=null where item_id='qa-item';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL B restored A archive';end if;
 begin insert into public.catalog_archives(owner_id,item_id,snapshot) values ('11111111-1111-4111-8111-111111111111','qa-spoof','{}');raise exception 'FAIL spoofed archive accepted';exception when insufficient_privilege then null;end;
 begin insert into public.catalog_reviews(user_id,item_id,rating) values ('11111111-1111-4111-8111-111111111111','qa-spoof',4);raise exception 'FAIL spoofed review accepted';exception when insufficient_privilege then null;end;
end $$;
insert into public.catalog_review_votes(review_id,value) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1)
on conflict(review_id,user_id) do update set value=excluded.value;
insert into public.catalog_review_votes(review_id,value) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',-1)
on conflict(review_id,user_id) do update set value=excluded.value;
do $$ begin
 if (select count(*) from public.catalog_review_votes where review_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>1 or
 (select value from public.catalog_review_votes where review_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>-1 then raise exception 'FAIL vote switch/unique';end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ declare changed integer;begin
 update public.catalog_review_votes set value=1 where review_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL C changed B vote';end if;
 begin insert into public.catalog_review_votes(review_id,user_id,value) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',1);raise exception 'FAIL spoofed vote accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
update public.catalog_reviews set rating=4,comment='QA edited' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.catalog_reviews set deleted_at=now() where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.catalog_archives set archived_at=null where item_id='qa-item';
do $$ begin
 if not exists(select 1 from public.catalog_reviews where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and deleted_at is not null and comment='QA edited') then raise exception 'FAIL soft delete removed record';end if;
 if not exists(select 1 from public.catalog_archives where item_id='qa-item' and archived_at is null) then raise exception 'FAIL archive restore';end if;
 if has_table_privilege('authenticated','public.catalog_reviews','DELETE') or has_table_privilege('authenticated','public.catalog_reviews','TRUNCATE') then raise exception 'FAIL destructive privileges';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.catalog_reviews where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL deleted review visible to B';end if;
 if exists(select 1 from public.catalog_review_votes where review_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL deleted review vote visible';end if;
 begin insert into public.catalog_review_votes(review_id,value) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1) on conflict(review_id,user_id) do update set value=1;raise exception 'FAIL voting deleted review allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
update public.catalog_reviews set deleted_at=null where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if not exists(select 1 from public.catalog_reviews where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and deleted_at is null) then raise exception 'FAIL review restore';end if;
end $$;
rollback;
select 'PASS: private archives, owner CRUD, soft delete, rating validation, one vote per identity, anti-spoofing, immutable keys, no DELETE/TRUNCATE' as result;
