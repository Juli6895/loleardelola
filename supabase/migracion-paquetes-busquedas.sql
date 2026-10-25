-- =========================================================
-- Migración: paquetes de búsquedas adicionales
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Las búsquedas que compró en paquetes y todavía no ha usado. Se gastan
-- solo cuando ya usó las de su membresía en el mes, y no se vencen.
alter table public.users
  add column if not exists busquedas_extra integer not null default 0;
