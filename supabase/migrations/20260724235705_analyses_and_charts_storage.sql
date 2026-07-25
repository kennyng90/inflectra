-- History: one row per successful Analysis. Rejections are never inserted.
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  asset_guess text not null,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

-- History is listed newest-first, always scoped to one user.
create index analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

-- No update policy: an Analysis is immutable once written.
create policy "Users can read own analyses"
  on public.analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own analyses"
  on public.analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own analyses"
  on public.analyses for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on table public.analyses to authenticated;

-- Private bucket for Chart images, one folder per user: charts/{user_id}/{file}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'charts',
  'charts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- No update policy: Charts are written once, so uploads must not upsert.
create policy "Users can read own charts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'charts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload own charts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'charts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete own charts"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'charts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
