-- =========================================================
-- Migración: qué comercios se llevan más clics
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Cada clic hacia UN comercio puntual (no la búsqueda genérica de
-- Google Shopping, que no dice a cuál tienda entró la usuaria) queda
-- anotado como "comercio_clic" con el nombre y dominio en las props —
-- ver anotarClicComercio en lib/use-evento.ts. Esta vista los agrupa.
create or replace view public.v_comercios_mas_clic as
select
  props->>'tienda'  as tienda,
  props->>'dominio' as dominio,
  count(*) as clics,
  count(distinct coalesce(user_id::text, device_id)) as personas,
  max(created_at) as ultimo_clic
from public.eventos
where nombre = 'comercio_clic'
group by props->>'tienda', props->>'dominio'
order by clics desc;
