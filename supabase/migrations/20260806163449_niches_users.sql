-- niches: segmentation only. The funnel (leads/deals status) is shared
-- across every niche; this table is a filter dimension, never a separate
-- pipeline.
create table public.niches (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- users: "profile" table for auth.users — id IS the auth identity (standard
-- Supabase pattern), not a separately generated id. No email column here;
-- read it via a join to auth.users to avoid duplicating the source of truth.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text,
  papel public.user_role not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index users_papel_idx on public.users (papel);
