-- =========================================================
-- Migración: eventos (analítica y embudo)
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Cada cosa que pasa en la app queda acá. Sin esta tabla no hay embudo
-- posible: no se puede saber quién se quedó en el botón de pagar si
-- nunca se anotó que lo tocó.
--
-- Qué NO se guarda a propósito: nada que identifique a una persona más
-- allá de su cuenta. Ni correos, ni nombres, ni fotos, ni lo que buscó.
-- Para cruzar con la usuaria está user_id, y eso vive en users.
create table if not exists public.eventos (
  id bigserial primary key,
  -- Null cuando todavía no hay ni fila de usuaria (primera visita).
  user_id uuid references public.users(id) on delete set null,
  -- El navegador. Permite seguir el recorrido de alguien que aún no
  -- tiene cuenta, que es justo la parte de arriba del embudo.
  device_id text,
  -- Qué pasó. Ver lib/eventos.ts para la lista cerrada.
  nombre text not null,
  -- Detalle del evento: el plan que eligió, el motivo del error, etc.
  props jsonb not null default '{}',
  -- Agrupa una visita: permite medir recorridos, no solo totales.
  sesion_id text,
  created_at timestamptz not null default now()
);

-- Los índices son por cómo se va a consultar: casi todo se filtra por
-- fecha y se agrupa por nombre de evento.
create index if not exists idx_eventos_fecha on public.eventos(created_at desc);
create index if not exists idx_eventos_nombre on public.eventos(nombre, created_at desc);
create index if not exists idx_eventos_user on public.eventos(user_id, created_at desc);
create index if not exists idx_eventos_device on public.eventos(device_id, created_at desc);

alter table public.eventos enable row level security;
-- Sin políticas: solo el servidor escribe, y el tablero lee con
-- credenciales propias de base de datos.

-- =========================================================
-- Vistas para el tablero
-- =========================================================
-- Se dejan como vistas y no como consultas sueltas en Retool para que
-- la definición del embudo viva en un solo lugar. Si mañana cambia un
-- paso, se corrige acá y el tablero no se entera.

-- Cada usuaria con su nivel actual. Es la base del "cuántos hay de cada
-- tipo": anónimas, registradas y con membresía.
create or replace view public.v_usuarios_por_nivel as
select
  u.id,
  u.created_at,
  case
    when u.premium_until is not null and u.premium_until > now() then 'membresia'
    when u.email is not null then 'registrada'
    else 'anonima'
  end as nivel,
  u.email is not null as tiene_correo,
  u.silueta is not null as tiene_perfil,
  (select count(*) from public.searches s where s.user_id = u.id) as busquedas,
  (select count(*) from public.outfits o where o.user_id = u.id) as outfits,
  (select count(*) from public.closet_items c where c.user_id = u.id) as prendas
from public.users u;

-- El embudo de pago, paso por paso. Cada fila es un paso y cuánta
-- gente distinta llegó hasta ahí.
create or replace view public.v_embudo_pago as
with pasos as (
  select 1 as orden, 'Vio la membresía'   as paso, 'membresia_vista'  as evento
  union all select 2, 'Tocó pagar',          'pago_intentado'
  union all select 3, 'Se abrió el checkout','pago_abierto'
  union all select 4, 'Pagó',                'pago_aprobado'
)
select
  p.orden,
  p.paso,
  count(distinct coalesce(e.user_id::text, e.device_id)) as personas,
  count(e.id) as veces
from pasos p
left join public.eventos e on e.nombre = p.evento
group by p.orden, p.paso
order by p.orden;

-- Dónde se está rompiendo la experiencia.
create or replace view public.v_errores as
select
  nombre,
  props->>'motivo' as motivo,
  count(*) as veces,
  count(distinct coalesce(user_id::text, device_id)) as personas,
  max(created_at) as ultima_vez
from public.eventos
where nombre like '%_error' or nombre = 'tope_alcanzado'
group by nombre, props->>'motivo'
order by veces desc;

-- =========================================================
-- Vistas del tablero de administración (/admin)
-- =========================================================
-- Van como vistas y no como consultas dentro del código para que la
-- definición del embudo viva en un solo lugar. Si mañana cambia un
-- paso, se corrige acá y la página no se entera.

-- Embudo completo, de la primera búsqueda al pago.
create or replace view public.v_embudo_general as
with pasos as (
  select 1 as orden, 'Buscó un outfit'    as paso, 'busqueda_ok'     as evento
  union all select 2, 'Creó cuenta',         'ingreso_ok'
  union all select 3, 'Completó su perfil',  'perfil_guardado'
  union all select 4, 'Vio la membresía',    'membresia_vista'
  union all select 5, 'Tocó pagar',          'pago_intentado'
  union all select 6, 'Pagó',                'pago_aprobado'
)
select
  p.orden,
  p.paso,
  count(distinct coalesce(e.user_id::text, e.device_id)) as personas
from pasos p
left join public.eventos e on e.nombre = p.evento
group by p.orden, p.paso
order by p.orden;

-- Quién tocó pagar y no terminó. Separa los dos casos, que son
-- problemas distintos: caerse en NUESTRA página o caerse en Bold.
create or replace view public.v_se_quedaron_pagando as
select
  u.email,
  u.name as nombre,
  max(e.created_at) as ultimo_intento,
  count(*) filter (where e.nombre = 'pago_intentado') as toco_pagar,
  count(*) filter (where e.nombre = 'pago_abierto')   as abrio_checkout,
  count(*) filter (where e.nombre = 'pago_rechazado') as rechazos,
  case
    when count(*) filter (where e.nombre = 'pago_abierto') = 0
      then 'No llegó al checkout'
    when count(*) filter (where e.nombre = 'pago_rechazado') > 0
      then 'Le rechazaron el pago'
    else 'Abandonó en Bold'
  end as donde_se_quedo
from public.eventos e
join public.users u on u.id = e.user_id
where e.nombre in ('pago_intentado','pago_abierto','pago_rechazado','pago_aprobado')
group by u.id, u.email, u.name
having count(*) filter (where e.nombre = 'pago_aprobado') = 0;

-- Actividad por día, últimos 30.
create or replace view public.v_actividad_diaria as
select
  date_trunc('day', created_at)::date as dia,
  count(*) filter (where nombre = 'busqueda_ok')    as busquedas,
  count(*) filter (where nombre = 'ingreso_ok')     as ingresos,
  count(*) filter (where nombre = 'pago_intentado') as intentos_de_pago,
  count(*) filter (where nombre = 'pago_aprobado')  as pagos
from public.eventos
where created_at > now() - interval '30 days'
group by 1
order by 1;

-- Resumen de niveles, ya contado.
create or replace view public.v_resumen_niveles as
select nivel, count(*) as personas
from public.v_usuarios_por_nivel
group by nivel;
