-- =========================================================
-- Migración: ilustración de la usuaria (Mi perfil), hecha con Gemini
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- La ilustración se guarda en Cloudinary; acá queda el enlace. La
-- huella es la de los datos con que se dibujó: si la usuaria cambia su
-- silueta, su piel o su pelo, la huella cambia y se ofrece dibujarla de
-- nuevo. Así no se paga dos veces la misma imagen.
alter table public.users add column if not exists figura_url text;
alter table public.users add column if not exists figura_hash text;
alter table public.users add column if not exists figura_generada_at timestamptz;
