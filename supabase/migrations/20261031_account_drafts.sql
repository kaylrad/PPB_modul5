-- Private account drafts. Never deletes existing catalog or draft data.
begin;
create table if not exists public.account_drafts(
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 draft_id text not null check(draft_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=1048576),
 archived_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(owner_id,draft_id)
);
alter table public.account_drafts enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='account_drafts' and policyname='draft_owner') then
  execute 'create policy draft_owner on public.account_drafts for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid())';
 end if;
end $$;
revoke all on public.account_drafts from anon;
revoke delete on public.account_drafts from authenticated;
grant select,insert,update on public.account_drafts to authenticated;
-- Only the authenticated owner can save. Older device copies cannot overwrite newer rows.
create or replace function public.save_account_draft(
 p_draft_id text,p_payload jsonb,p_archived_at timestamptz,p_updated_at timestamptz
) returns setof public.account_drafts language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return query
 insert into public.account_drafts as drafts(owner_id,draft_id,payload,archived_at,updated_at)
 values(auth.uid(),p_draft_id,p_payload,p_archived_at,p_updated_at)
 on conflict(owner_id,draft_id) do update set payload=excluded.payload,archived_at=excluded.archived_at,updated_at=excluded.updated_at
 where drafts.updated_at<=excluded.updated_at returning drafts.*;
 if not found then
  return query select * from public.account_drafts where owner_id=auth.uid() and draft_id=p_draft_id;
 end if;
end $$;
revoke execute on function public.save_account_draft(text,jsonb,timestamptz,timestamptz) from public;
grant execute on function public.save_account_draft(text,jsonb,timestamptz,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
