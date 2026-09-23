-- =========================================================
-- Migración: consentimiento de la política de privacidad
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Cuándo aceptó y QUÉ VERSIÓN del documento — no solo "sí aceptó" en
-- algún momento. Si el texto cambia más adelante, se sube la versión
-- (ver VERSION_POLITICA en lib/sesion.ts) y a partir de ahí el sistema
-- sabe que hay que volver a pedir el consentimiento.
alter table public.users add column if not exists politica_aceptada_at timestamptz;
alter table public.users add column if not exists politica_version text;
