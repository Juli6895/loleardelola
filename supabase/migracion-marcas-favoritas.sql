-- =====================================================================
-- Mis marcas favoritas, guardadas en la cuenta (octubre de 2026)
-- =====================================================================
-- Correr una vez en el SQL Editor de Supabase. Se puede correr de nuevo
-- sin romper nada.
--
-- Antes vivían solo en el navegador. Guardadas aquí, el tablero puede
-- contar qué marcas eligen (y por edad), y la usuaria las encuentra en
-- cualquier aparato donde entre con su correo.
-- =====================================================================

alter table public.users add column if not exists marcas_favoritas text[];
alter table public.users add column if not exists marcas_favoritas_at timestamptz;
