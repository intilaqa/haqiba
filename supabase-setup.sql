-- حقيبة الجودة: إعداد Supabase (يُشغَّل مرة واحدة في SQL Editor)
create table if not exists haqiba_rows (k text primary key, v jsonb, updated_at timestamptz not null default now(), updated_by text);
create index if not exists haqiba_rows_upd on haqiba_rows(updated_at);
create or replace function haqiba_touch() returns trigger language plpgsql as $$ begin new.updated_at = clock_timestamp(); return new; end $$;
drop trigger if exists haqiba_touch on haqiba_rows;
create trigger haqiba_touch before insert or update on haqiba_rows for each row execute function haqiba_touch();
create or replace function haqiba_staff() returns boolean language sql stable as $$ select coalesce(auth.jwt()->>'email','') ilike '%@bu.edu.sa' $$;
alter table haqiba_rows enable row level security;
drop policy if exists staff_all on haqiba_rows;
create policy staff_all on haqiba_rows for all to authenticated using (haqiba_staff()) with check (haqiba_staff());

create table if not exists haqiba_public (id text primary key, v jsonb, updated_at timestamptz default now());
alter table haqiba_public enable row level security;
drop policy if exists pub_read on haqiba_public; drop policy if exists pub_write on haqiba_public;
create policy pub_read on haqiba_public for select to anon, authenticated using (true);
create policy pub_write on haqiba_public for all to authenticated using (haqiba_staff()) with check (haqiba_staff());

create table if not exists haqiba_responses (id uuid primary key default gen_random_uuid(), sid text not null, a jsonb not null, at date default current_date, created_at timestamptz default now());
alter table haqiba_responses enable row level security;
drop policy if exists resp_insert on haqiba_responses; drop policy if exists resp_read on haqiba_responses;
create policy resp_insert on haqiba_responses for insert to anon, authenticated with check (exists (select 1 from haqiba_public p where p.id = sid and coalesce((p.v->>'open')::boolean,false)));
create policy resp_read on haqiba_responses for select to authenticated using (haqiba_staff());

insert into storage.buckets (id, name, public) values ('haqiba-files','haqiba-files', false) on conflict (id) do nothing;
drop policy if exists haqiba_files on storage.objects;
create policy haqiba_files on storage.objects for all to authenticated using (bucket_id = 'haqiba-files' and haqiba_staff()) with check (bucket_id = 'haqiba-files' and haqiba_staff());