-- Phase 4: notes, external study materials and a predictable review schedule.
alter table public.topics
  add column if not exists notes text,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists next_review_at date,
  add column if not exists review_interval_days integer,
  add column if not exists review_count integer not null default 0;

do $$ begin
  alter table public.topics add constraint topics_review_count_nonnegative check (review_count >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.topics add constraint topics_review_interval_positive check (review_interval_days is null or review_interval_days > 0);
exception when duplicate_object then null; end $$;

create table if not exists public.topic_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  url text not null check (url ~* '^https?://[^[:space:]]+$'),
  material_type text not null default 'other' check (material_type in
    ('video','article','documentation','external_pdf','lab','exercise','repository','other')),
  description text,
  completed boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_materials_topic_owner_fkey foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade
);

create index if not exists topic_materials_user_topic_position_idx
  on public.topic_materials(user_id, topic_id, position);

alter table public.topic_materials enable row level security;
drop policy if exists "Users manage their own topic materials" on public.topic_materials;
create policy "Users manage their own topic materials" on public.topic_materials
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.topic_materials to authenticated;
revoke all on public.topic_materials from anon;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_topic_materials_updated_at on public.topic_materials;
create trigger update_topic_materials_updated_at before update on public.topic_materials
  for each row execute function public.set_updated_at();
