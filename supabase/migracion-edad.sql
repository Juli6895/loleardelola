-- =========================================================
-- Migración: rango de edad
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Rango de edad, no fecha de nacimiento: alcanza para que el manual
-- ajuste el consejo sin pedir un dato más sensible del que hace falta.
-- Valores: 18-24, 25-34, 35-44, 45-54, 55-64, 65+
alter table public.users add column if not exists rango_edad text;
