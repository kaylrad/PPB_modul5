begin;
create table if not exists public.catalog_archives(
 owner_id uuid not null default auth.uid() references auth.users(id),
 item_id text not null check(item_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=524288),
 archived_at timestamptz, primary key(owner_id,item_id)
);
create table if not exists public.catalog_reviews(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id),
 item_id text not null check(item_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 rating integer not null check(rating between 1 and 5),
 comment text not null default '' check(char_length(comment)<=500),
 deleted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists catalog_one_active_review on public.catalog_reviews(user_id,item_id) where deleted_at is null;
create index if not exists catalog_reviews_item on public.catalog_reviews(item_id,created_at desc) where deleted_at is null;
create table if not exists public.catalog_review_votes(
 review_id uuid not null references public.catalog_reviews(id),
 user_id uuid not null default auth.uid() references auth.users(id),
 value integer not null check(value in (-1,0,1)),primary key(review_id,user_id)
);
alter table public.catalog_archives enable row level security;
alter table public.catalog_reviews enable row level security;
alter table public.catalog_review_votes enable row level security;
create policy archive_owner on public.catalog_archives for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy reviews_public on public.catalog_reviews for select using(deleted_at is null or user_id=auth.uid());
create policy reviews_owner_insert on public.catalog_reviews for insert to authenticated with check(user_id=auth.uid() and deleted_at is null);
create policy reviews_owner_update on public.catalog_reviews for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy votes_public on public.catalog_review_votes for select using(exists(select 1 from public.catalog_reviews r where r.id=review_id and r.deleted_at is null));
create policy votes_insert on public.catalog_review_votes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.catalog_reviews r where r.id=review_id and r.user_id<>auth.uid() and r.deleted_at is null));
create policy votes_update on public.catalog_review_votes for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.catalog_reviews r where r.id=review_id and r.user_id<>auth.uid() and r.deleted_at is null));
create function public.catalog_immutable_keys() returns trigger language plpgsql set search_path=public as $$
begin
 if (to_jsonb(new)->>'id') is distinct from (to_jsonb(old)->>'id')
 or (to_jsonb(new)->>'user_id') is distinct from (to_jsonb(old)->>'user_id')
 or (to_jsonb(new)->>'review_id') is distinct from (to_jsonb(old)->>'review_id')
 or (to_jsonb(new)->>'item_id') is distinct from (to_jsonb(old)->>'item_id') then raise exception 'Record identity cannot change'; end if;
 return new;
end $$;
create trigger review_keys before update on public.catalog_reviews for each row execute function public.catalog_immutable_keys();
create trigger vote_keys before update on public.catalog_review_votes for each row execute function public.catalog_immutable_keys();
revoke all on public.catalog_archives,public.catalog_reviews,public.catalog_review_votes from anon,authenticated;
grant select,insert,update on public.catalog_archives,public.catalog_reviews,public.catalog_review_votes to authenticated;
grant select on public.catalog_reviews,public.catalog_review_votes to anon;
notify pgrst,'reload schema';
commit;
