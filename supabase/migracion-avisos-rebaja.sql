-- =========================================================
-- Migración: avisos de rebaja (membresía)
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Las prendas de tienda que una usuaria marcó con "Avísame si baja".
-- Una vez al día /api/revisar-precios mira el precio de hoy de cada una
-- y, si bajó, le manda una notificación al celular.
create table if not exists public.seguimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  url text not null,
  titulo text not null,
  tienda text not null,
  dominio text not null,
  imagen text,
  -- El precio cuando lo marcó: contra este se mide si bajó.
  precio_inicial integer not null,
  -- El último que se vio, y el último del que se avisó (para no avisar
  -- dos veces la misma rebaja).
  precio_ultimo integer not null,
  precio_avisado integer,
  activo boolean not null default true,
  revisado_at timestamptz,
  avisado_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create index if not exists idx_seguimientos_activos on public.seguimientos(activo, revisado_at);
create index if not exists idx_seguimientos_user on public.seguimientos(user_id, created_at desc);

-- Dónde mandarle la notificación: cada celular o navegador donde aceptó
-- recibir avisos tiene su propia "suscripción".
create table if not exists public.suscripciones_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_suscripciones_user on public.suscripciones_push(user_id);

-- Sin políticas: solo el servidor lee y escribe.
alter table public.seguimientos enable row level security;
alter table public.suscripciones_push enable row level security;
