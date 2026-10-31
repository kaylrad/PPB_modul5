-- Authenticated personal profiles only. Do not run on the shared lab backend.
-- This table already exists on the owned project from the earlier setup.
begin;
create table if not exists public.merch_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null check (char_length(username) between 2 and 60),
 bio text not null default '' check (char_length(bio)<=500)
);
alter table public.merch_profiles enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='merch_profiles' and policyname='profile_owner') then
  execute 'create policy profile_owner on public.merch_profiles for all to authenticated using (id=auth.uid()) with check (id=auth.uid())';
 end if;
end $$;
grant select,insert,update on public.merch_profiles to authenticated;
commit;
