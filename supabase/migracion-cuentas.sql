-- =========================================================
-- Migración: cuentas, membresía y pagos
-- =========================================================
-- Copia TODO esto y pégalo en el SQL Editor de Supabase, en el
-- proyecto de LoleardLola (kvvialowkcdiysrphacb) — NO en lakaja-prod.
-- Luego dale "Run". Debe decir "Success. No rows returned".
--
-- Es seguro correrlo más de una vez: todo lleva "if not exists".
-- =========================================================

-- Ingreso por código al correo -----------------------------------
create table if not exists public.login_codes (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_login_codes_email
  on public.login_codes(email, created_at desc);

create table if not exists public.sessions (
  token_hash text primary key,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);
create index if not exists idx_sessions_user on public.sessions(user_id);

alter table public.login_codes enable row level security;
alter table public.sessions enable row level security;
-- Sin políticas a propósito: solo el servidor las toca.

-- Membresía ------------------------------------------------------
alter table public.users add column if not exists premium_until timestamptz;

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
