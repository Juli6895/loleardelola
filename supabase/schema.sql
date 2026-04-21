-- =========================================================
-- LolearDeLola - Esquema de base de datos
-- Ejecuta este script en el SQL Editor de Supabase.
-- =========================================================

-- Extensión para generar UUIDs
create extension if not exists "uuid-ossp";

-- Tabla de usuarios
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  name text,
  avatar_url text,
  pinterest_id text unique,
  created_at timestamptz default now()
);

-- Tabla de outfits guardados
create table if not exists public.outfits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  image_url text not null,
  tags text[] not null default '{}',
  pinterest_url text,
  created_at timestamptz default now()
);

-- Tabla de búsquedas realizadas
create table if not exists public.searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  outfit_id uuid references public.outfits(id) on delete set null,
  search_terms text[] not null default '{}',
  created_at timestamptz default now()
);

-- Índices útiles
create index if not exists idx_outfits_user on public.outfits(user_id);
create index if not exists idx_searches_user on public.searches(user_id);

-- Habilitar Row Level Security
alter table public.users enable row level security;
alter table public.outfits enable row level security;
alter table public.searches enable row level security;

-- Políticas: con el service role se pasan por encima de RLS, pero las mantenemos
-- por si en el futuro se usan tokens JWT directos desde el cliente.
drop policy if exists "users_self_read" on public.users;
create policy "users_self_read" on public.users for select using (true);

drop policy if exists "outfits_self_read" on public.outfits;
create policy "outfits_self_read" on public.outfits for select using (true);

drop policy if exists "outfits_self_write" on public.outfits;
create policy "outfits_self_write" on public.outfits for all using (true) with check (true);

drop policy if exists "searches_self_read" on public.searches;
create policy "searches_self_read" on public.searches for all using (true) with check (true);
