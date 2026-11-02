-- =====================================================================
-- Migración: gastos ingresados a mano en Administración
-- =====================================================================
-- Lo que la app no puede medir sola: marketing, pauta, servicios que se
-- pagan por fuera, compras puntuales. Se ingresan en /admin (sección
-- "Gastos ingresados a mano") y el tablero los suma a los costos.
--
-- - tipo 'fijo': se paga cada mes. Cuenta mientras esté activo, desde
--   el mes de `fecha`.
-- - tipo 'variable': un gasto puntual. Cuenta en el mes de `fecha`.
--
-- Solo la llave de servicio (el servidor) lee y escribe esta tabla.
-- =====================================================================

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('fijo', 'variable')),
  rubro text not null,
  detalle text,
  valor_cop integer not null check (valor_cop >= 0),
  fecha date not null default current_date,
  activo boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists gastos_fecha_idx on public.gastos (fecha);

alter table public.gastos enable row level security;

-- Los gastos fijos de marketing que ya se pagan (noviembre de 2026).
insert into public.gastos (tipo, rubro, detalle, valor_cop, fecha)
select 'fijo', 'Marketing', 'Pago mensual de marketing', 600000, date '2026-11-01'
where not exists (select 1 from public.gastos where rubro = 'Marketing');

insert into public.gastos (tipo, rubro, detalle, valor_cop, fecha)
select 'fijo', 'Publicidad en Meta', 'Pauta mensual en Meta (Instagram y Facebook)', 150000, date '2026-11-01'
where not exists (select 1 from public.gastos where rubro = 'Publicidad en Meta');

-- El dominio (comprado en Vercel el 30 de octubre de 2026): US$11,25 por
-- un año = $45.000. Es un gasto de una vez (se vuelve a ingresar cuando
-- se renueve, el 30 de octubre de 2027). Si lo cambias aquí o en /admin,
-- deja de contarse el que viene fijo en lib/costos.ts.
insert into public.gastos (tipo, rubro, detalle, valor_cop, fecha)
select 'variable', 'Dominio loleardlola.com', 'US$11,25 por 1 año (renueva el 30 oct 2027)', 45000, date '2026-10-30'
where not exists (select 1 from public.gastos where rubro like 'Dominio%');
