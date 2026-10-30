-- =====================================================================
-- Tallas en las promociones (octubre de 2026)
-- =====================================================================
-- Correr una vez en el SQL Editor de Supabase. Se puede correr de nuevo
-- sin romper nada.
-- =====================================================================

-- Las tallas DISPONIBLES de cada promoción, con el precio de cada una:
-- [{"t": "M", "p": 89900, "a": 179900, "q": "?variant=123"}, ...]
--   t: la talla (unificada: "06" → "6", "MD" → "M", "U" → "Única")
--   p: precio de esa talla; a: su precio "antes" (null si no está rebajada)
--   q: lo que se le pega al enlace para que la tienda abra esa talla
-- La llena la revisión diaria (lib/promos-diarias.ts).
alter table public.promos add column if not exists tallas jsonb;

-- "Mi talla" de las promociones: se guarda para la próxima vez y se
-- puede cambiar cuando quiera (como Mis marcas favoritas).
alter table public.users add column if not exists tallas_favoritas text[];
alter table public.users add column if not exists tallas_favoritas_at timestamptz;
