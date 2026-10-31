-- Recoverable trash markers; retains all data and existing RLS/privileges.
begin;
alter table public.catalog_archives add column if not exists trashed_at timestamptz;
alter table public.catalog_reviews add column if not exists trashed_at timestamptz;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.catalog_archives'::regclass and conname='catalog_trash_stays_archived') then
  alter table public.catalog_archives add constraint catalog_trash_stays_archived check(trashed_at is null or archived_at is not null);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.catalog_reviews'::regclass and conname='review_trash_stays_archived') then
  alter table public.catalog_reviews add constraint review_trash_stays_archived check(trashed_at is null or deleted_at is not null);
 end if;
end $$;
notify pgrst,'reload schema';
commit;
