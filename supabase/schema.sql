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

-- =========================================================
-- Clóset digital (Fase 1 del roadmap premium)
-- =========================================================

-- Placeholder para el futuro muro de pago. Por ahora siempre false — la
-- lógica de premium se activa cuando exista el cobro (ver roadmap).
alter table public.users add column if not exists is_premium boolean not null default false;

-- Prendas que cada usuaria sube a su clóset. category es uno de:
-- 'top' | 'bottom' | 'vestido' | 'abrigo' | 'calzado' | 'accesorio'
create table if not exists public.closet_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  image_url text not null,
  category text not null,
  color text,
  tags text[] not null default '{}',
  label text,
  created_at timestamptz default now()
);

create index if not exists idx_closet_items_user on public.closet_items(user_id);

alter table public.closet_items enable row level security;

drop policy if exists "closet_items_all" on public.closet_items;
create policy "closet_items_all" on public.closet_items for all using (true) with check (true);

-- =========================================================
-- Perfil de silueta (medidas → asesoría, base del futuro Avatar)
-- =========================================================
-- Medidas en cm + la silueta que se calculó a partir de ellas (ver
-- lib/image-consulting/morfologia.ts inferirSiluetaPorMedidas). Se
-- guardan las medidas crudas, no solo la silueta, para poder recalcular
-- si el criterio cambia más adelante.
alter table public.users add column if not exists bust_cm numeric;
alter table public.users add column if not exists waist_cm numeric;
alter table public.users add column if not exists hip_cm numeric;
alter table public.users add column if not exists height_cm numeric;
alter table public.users add column if not exists silueta text;

-- Personalidad de estilo (Pilar 5 del manual). Se guarda también la
-- fuente (nombre de referencia, o 'foto') para poder mostrarle a la
-- usuaria de dónde salió la sugerencia, o volver a calcularla.
alter table public.users add column if not exists personalidad text;
alter table public.users add column if not exists personalidad_secundaria text;
alter table public.users add column if not exists personalidad_fuente text;
