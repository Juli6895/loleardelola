-- =========================================================
-- Migración: registros aparte de ingresos, y qué servicios usa la gente
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Antes "ingreso_ok" mezclaba a quien entra por primera vez (registro)
-- con quien vuelve — no se podían contar aparte. Ahora cada vez que un
-- correo entra POR PRIMERA VEZ también se anota "registro_ok" (ver
-- unirIdentidades en lib/sesion.ts), así que la actividad diaria puede
-- mostrar las dos columnas.
create or replace view public.v_actividad_diaria as
select
  date_trunc('day', created_at)::date as dia,
  count(*) filter (where nombre = 'busqueda_ok')    as busquedas,
  count(*) filter (where nombre = 'registro_ok')    as registros,
  count(*) filter (where nombre = 'ingreso_ok')     as ingresos,
  count(*) filter (where nombre = 'pago_intentado') as intentos_de_pago,
  count(*) filter (where nombre = 'pago_aprobado')  as pagos
from public.eventos
where created_at > now() - interval '30 days'
group by 1
order by 1;

-- Qué servicios usa la gente, y cuánta gente distinta usa cada uno.
-- Cada página clave anota su propia "_visto" al abrirse (ver
-- lib/use-evento.ts) — sin esto no había forma de saber si alguien
-- entra a Mi Clóset y nunca a Mi Manual, por ejemplo.
create or replace view public.v_servicios_usados as
with pasos as (
  select 1 as orden, 'Buscar un outfit' as servicio, 'buscar_visto'  as evento
  union all select 2, 'Mi clóset',       'closet_visto'
  union all select 3, 'Mi perfil',       'perfil_visto'
  union all select 4, 'Mis outfits',     'outfits_visto'
  union all select 5, 'Mi manual',       'manual_visto'
)
select
  p.orden,
  p.servicio,
  count(distinct coalesce(e.user_id::text, e.device_id)) as personas,
  count(e.id) as veces
from pasos p
left join public.eventos e on e.nombre = p.evento
group by p.orden, p.servicio
order by p.orden;
