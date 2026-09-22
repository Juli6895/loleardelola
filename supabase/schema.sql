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

-- Peso: NO entra en el cálculo de la silueta (esa sale de las
-- proporciones). Se guarda para talla y para el Avatar más adelante.
alter table public.users add column if not exists peso_kg numeric;

-- Colorimetría (Pilar 1 del manual). `estacion` se calcula a partir de
-- subtono + contraste (ver lib/image-consulting/colorimetria.ts); se
-- guardan también las respuestas crudas para poder recalcular.
alter table public.users add column if not exists tono_piel text;
alter table public.users add column if not exists color_cabello text;
alter table public.users add column if not exists largo_cabello text;
alter table public.users add column if not exists subtono text;
alter table public.users add column if not exists contraste text;
alter table public.users add column if not exists estacion text;

-- Personalidad de estilo (Pilar 5 del manual). Se guarda también la
-- fuente (nombre de referencia, o 'foto') para poder mostrarle a la
-- usuaria de dónde salió la sugerencia, o volver a calcularla.
alter table public.users add column if not exists personalidad text;
alter table public.users add column if not exists personalidad_secundaria text;
alter table public.users add column if not exists personalidad_fuente text;

-- =========================================================
-- Identidad anónima por dispositivo (mientras no hay login)
-- =========================================================
-- El login con Pinterest quedó para una fase siguiente. Mientras tanto
-- cada navegador genera un UUID que se guarda acá, para que el clóset,
-- el perfil y los outfits tengan dueño sin pedir registro.
-- Ver lib/device-id.ts (cliente) y lib/device-user.ts (servidor).
alter table public.users add column if not exists device_id text;

-- =========================================================
-- Cuentas: ingreso por código al correo
-- =========================================================
-- No hay contraseña. La usuaria escribe su correo, le llega un código
-- de 6 dígitos y con eso entra. Menos pasos para ella y nada que
-- olvidar — por eso tampoco existe un flujo de "recuperar clave".
--
-- El código se guarda HASHEADO, igual que una contraseña: si alguien
-- llegara a leer la tabla, no puede usar los códigos vigentes.
create table if not exists public.login_codes (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  -- Intentos fallidos de este código. Al llegar al tope se invalida,
  -- para que nadie pueda probar los 10.000 códigos posibles.
  attempts int not null default 0,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_login_codes_email
  on public.login_codes(email, created_at desc);

-- Sesiones abiertas. Se guarda el hash del token, no el token: la
-- cookie del navegador es el único lugar donde existe en claro.
create table if not exists public.sessions (
  token_hash text primary key,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);
create index if not exists idx_sessions_user on public.sessions(user_id);

alter table public.login_codes enable row level security;
alter table public.sessions enable row level security;
-- Sin políticas a propósito: estas dos tablas solo se tocan desde el
-- servidor con la llave de servicio. Nadie más debe poder leerlas.

-- =========================================================
-- Membresía
-- =========================================================
-- Bold no hace cobros recurrentes automáticos: cada pago es único. Por
-- eso la membresía no es un booleano sino una FECHA DE VENCIMIENTO —
-- se paga, se suma un mes o un año, y cuando llega la fecha se vuelve
-- a cobrar. `is_premium` queda para no romper nada viejo, pero la
-- verdad la tiene premium_until.
alter table public.users add column if not exists premium_until timestamptz;

-- Pagos recibidos. Se guarda la referencia con la que se le pidió el
-- pago a Bold, para poder verificarla contra su API y para no acreditar
-- dos veces el mismo pago si Bold notifica más de una vez.
create table if not exists public.pagos (
  order_id text primary key,
  user_id uuid references public.users(id) on delete set null,
  plan text not null,
  monto_cop integer not null,
  estado text not null default 'pendiente',
  acreditado_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_pagos_user on public.pagos(user_id);
alter table public.pagos enable row level security;

-- Índice único recomendado (no obligatorio): evita filas duplicadas si
-- dos requests simultáneos del mismo dispositivo nuevo llegan a la vez.
-- El código (lib/device-user.ts) igual funciona sin él — hace select →
-- insert → select, y siempre se queda con la fila más antigua.
--
-- OJO: tiene que ser un índice ÚNICO NORMAL, no parcial. Un índice
-- parcial (`where device_id is not null`) no lo puede aprovechar
-- ON CONFLICT salvo que la query repita el mismo predicado. Las filas
-- con device_id null no estorban: en Postgres los NULL no se consideran
-- iguales entre sí.
create unique index if not exists idx_users_device_id
  on public.users(device_id);


-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Pilar 4 del manual: lo que la usuaria QUIERE proyectar. Los otros
-- tres describen lo que es (cuerpo, color, gusto); este es el único que
-- describe lo que busca, y por eso manda cuando hay contradicción.
-- Valores: autoridad, cercania, creatividad, elegancia, energia, serenidad
alter table public.users add column if not exists proyeccion text;

-- El manual generado. Se guarda para no volver a pedírselo a la IA en
-- cada visita: cuesta plata y tarda. `manual_hash` es la huella de los
-- datos con que se generó — si el perfil cambia, la huella cambia y ahí
-- sí se regenera.
alter table public.users add column if not exists manual_md text;
alter table public.users add column if not exists manual_hash text;
alter table public.users add column if not exists manual_generado_at timestamptz;
