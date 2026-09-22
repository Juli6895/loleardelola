-- =========================================================
-- Migración: manual de estilo + qué quiere proyectar
-- =========================================================
-- Pégalo en el SQL Editor de Supabase (proyecto de LoleardLola,
-- kvvialowkcdiysrphacb) y dale Run. Seguro de correr más de una vez.
-- =========================================================

-- Pilar 4 del manual: lo que la usuaria QUIERE proyectar. Los otros
-- tres describen lo que es (cuerpo, color, gusto); este es el único que
-- describe lo que busca, y por eso manda cuando hay contradicción.
-- Valores: autoridad, cercania, creatividad, elegancia, energia, serenidad
alter table public.users add column if not exists proyeccion text;

-- El manual generado. Se guarda para no volver a pedírselo a la IA en
-- cada visita: cuesta plata y tarda. `manual_hash` es la huella de los
-- datos con que se generó — si el perfil cambia, la huella cambia y ahí
-- sí se regenera.
alter table public.users add column if not exists manual_md text;
alter table public.users add column if not exists manual_hash text;
alter table public.users add column if not exists manual_generado_at timestamptz;
