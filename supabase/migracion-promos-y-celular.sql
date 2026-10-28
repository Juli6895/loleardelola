-- =====================================================================
-- Promociones del día, prueba de promos y celular (octubre de 2026)
-- =====================================================================
-- Correr una vez en el SQL Editor de Supabase. Se puede correr de nuevo
-- sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Las promociones de todas las tiendas
-- ---------------------------------------------------------------------
-- Una revisión diaria (ver app/api/promos/actualizar) lee el catálogo
-- completo de cada tienda y guarda aquí cada prenda rebajada más de 10%,
-- con una talla disponible. El panel de promociones lee de aquí, así no
-- tiene que preguntarle a 42 tiendas cada vez que alguien entra.
create table if not exists public.promos (
  url text primary key,
  dominio text not null,
  tienda text not null,
  titulo text not null,
  imagen text,
  -- El tipo de prenda (vestido, blusa, jean...), para mostrar arriba las
  -- de lo que la usuaria buscó.
  tipo text,
  precio_cop integer not null,
  precio_antes_cop integer not null,
  -- Fracción: 0.35 es 35%.
  descuento numeric not null,
  -- La última revisión que la vio. Las que ya no aparecen se borran.
  vista_at timestamptz not null default now()
);

create index if not exists idx_promos_dominio on public.promos (dominio);
create index if not exists idx_promos_tipo on public.promos (tipo);
create index if not exists idx_promos_descuento on public.promos (descuento desc);

-- Solo el servidor (service role) lee y escribe.
alter table public.promos enable row level security;

-- ---------------------------------------------------------------------
-- 2. La prueba de promociones y el celular
-- ---------------------------------------------------------------------
-- registrado_at: cuándo esa cuenta puso su correo por primera vez (antes
--   solo estaba created_at, que es la primera visita del navegador).
-- promos_prueba_desde: desde cuándo cuentan sus 3 días de promociones.
--   Si crea otra cuenta en el mismo navegador, hereda la fecha de la
--   anterior: la prueba es una por navegador, no una por correo.
-- celular: lo pide la app al crear la cuenta. No se verifica con código.
alter table public.users add column if not exists registrado_at timestamptz;
alter table public.users add column if not exists promos_prueba_desde timestamptz;
alter table public.users add column if not exists celular text;

-- Las cuentas que ya existían: su fecha de registro es la de la fila.
update public.users
set registrado_at = created_at
where email is not null and registrado_at is null;
