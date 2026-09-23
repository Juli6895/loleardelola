-- =========================================================
-- Consultas para el tablero de Retool
-- =========================================================
-- Cada bloque va en una consulta aparte dentro de Retool. El nombre
-- sugerido es el que conviene ponerle allá, porque es como se va a
-- referenciar desde los componentes ({{ usuariosPorNivel.data }}).
--
-- Requiere las migraciones migracion-eventos.sql y las anteriores.
-- =========================================================


-- ---------------------------------------------------------
-- 1. usuariosPorNivel  →  gráfico de barras o tarjetas
-- ---------------------------------------------------------
-- Cuánta gente hay de cada tipo. Responde "usuarios sin registro,
-- con registro, con membresía".
select
  nivel,
  count(*) as personas
from v_usuarios_por_nivel
group by nivel
order by case nivel
  when 'anonima' then 1
  when 'registrada' then 2
  when 'membresia' then 3
end;


-- ---------------------------------------------------------
-- 2. embudoPago  →  gráfico de embudo
-- ---------------------------------------------------------
-- El recorrido hasta pagar, con cuánta gente sobrevive cada paso.
-- La caída más grande es dónde hay que trabajar.
select
  paso,
  personas,
  -- Qué porcentaje del paso anterior sobrevivió. Es el número que de
  -- verdad importa: 200 personas en un paso no dicen nada si no se
  -- sabe de cuántas venían.
  round(
    100.0 * personas / nullif(lag(personas) over (order by orden), 0),
    1
  ) as pct_del_paso_anterior
from v_embudo_pago
order by orden;


-- ---------------------------------------------------------
-- 3. embudoGeneral  →  gráfico de embudo
-- ---------------------------------------------------------
-- El recorrido completo, desde que alguien llega hasta que paga.
with pasos as (
  select 1 as orden, 'Buscó un outfit'     as paso, array['busqueda_ok'] as eventos
  union all select 2, 'Creó cuenta',          array['ingreso_ok']
  union all select 3, 'Completó su perfil',   array['perfil_guardado']
  union all select 4, 'Vio la membresía',     array['membresia_vista']
  union all select 5, 'Tocó pagar',           array['pago_intentado']
  union all select 6, 'Pagó',                 array['pago_aprobado']
)
select
  p.orden,
  p.paso,
  count(distinct coalesce(e.user_id::text, e.device_id)) as personas
from pasos p
left join eventos e on e.nombre = any(p.eventos)
group by p.orden, p.paso
order by p.orden;


-- ---------------------------------------------------------
-- 4. dondeSeRompe  →  tabla
-- ---------------------------------------------------------
-- Errores y topes, de más frecuente a menos. Es la lista de lo que
-- hay que arreglar, en orden.
select
  case
    when nombre = 'tope_alcanzado' then 'Se topó con un límite'
    when nombre = 'busqueda_error' then 'Falló la búsqueda'
    when nombre = 'pago_error'     then 'Falló al abrir el pago'
    when nombre = 'ingreso_error'  then 'Falló al entrar'
    when nombre = 'manual_error'   then 'Falló el manual'
    else nombre
  end as que_paso,
  motivo,
  veces,
  personas,
  ultima_vez
from v_errores
order by veces desc
limit 50;


-- ---------------------------------------------------------
-- 5. topesPorRecurso  →  gráfico de barras
-- ---------------------------------------------------------
-- Contra qué tope choca la gente. Si casi nadie llega al de
-- búsquedas, está muy alto; si todos chocan el primer día, muy bajo.
select
  props->>'recurso' as recurso,
  props->>'destrabaCon' as se_destraba_con,
  count(*) as veces,
  count(distinct coalesce(user_id::text, device_id)) as personas
from eventos
where nombre = 'tope_alcanzado'
group by 1, 2
order by personas desc;


-- ---------------------------------------------------------
-- 6. actividadDiaria  →  gráfico de líneas
-- ---------------------------------------------------------
select
  date_trunc('day', created_at)::date as dia,
  count(*) filter (where nombre = 'busqueda_ok')    as busquedas,
  count(*) filter (where nombre = 'ingreso_ok')     as ingresos,
  count(*) filter (where nombre = 'pago_intentado') as intentos_de_pago,
  count(*) filter (where nombre = 'pago_aprobado')  as pagos
from eventos
where created_at > now() - interval '30 days'
group by 1
order by 1;


-- ---------------------------------------------------------
-- 7. seQuedaronEnPagar  →  tabla
-- ---------------------------------------------------------
-- La pregunta concreta: quién tocó pagar y no pagó. Cada fila es una
-- persona a la que se le puede escribir.
select
  u.email,
  u.name as nombre,
  max(e.created_at) as ultimo_intento,
  count(*) filter (where e.nombre = 'pago_intentado') as veces_que_toco_pagar,
  count(*) filter (where e.nombre = 'pago_abierto')   as veces_que_abrio_el_pago,
  count(*) filter (where e.nombre = 'pago_rechazado') as rechazos,
  -- Sin checkout = se cayó en nuestra página. Con checkout y sin pago
  -- = se cayó en Bold. Son dos problemas distintos.
  case
    when count(*) filter (where e.nombre = 'pago_abierto') = 0
      then 'No llegó al checkout'
    when count(*) filter (where e.nombre = 'pago_rechazado') > 0
      then 'Le rechazaron el pago'
    else 'Abandonó en Bold'
  end as donde_se_quedo
from eventos e
join users u on u.id = e.user_id
where e.nombre in ('pago_intentado','pago_abierto','pago_rechazado','pago_aprobado')
group by u.id, u.email, u.name
having count(*) filter (where e.nombre = 'pago_aprobado') = 0
order by ultimo_intento desc;


-- ---------------------------------------------------------
-- 8. recorridoDeUna  →  tabla (con filtro por correo)
-- ---------------------------------------------------------
-- Para mirar el caso puntual de alguien que escribió a quejarse.
-- En Retool, el parámetro va como {{ inputCorreo.value }}.
select
  e.created_at,
  e.nombre as evento,
  e.props
from eventos e
left join users u on u.id = e.user_id
where u.email = {{ inputCorreo.value }}
order by e.created_at desc
limit 200;


-- ---------------------------------------------------------
-- 9. ingresosDelMes  →  tarjeta
-- ---------------------------------------------------------
select
  count(*) as pagos,
  sum(monto_cop) as bruto_cop,
  -- Bold cobra 3,29% + $900 por transacción. Es una estimación: la
  -- tarifa exacta depende del medio de pago y del volumen del mes.
  round(sum(monto_cop) - sum(monto_cop * 0.0329 + 900)) as neto_estimado_cop
from pagos
where estado = 'acreditado'
  and acreditado_at > date_trunc('month', now());


-- ---------------------------------------------------------
-- 10. membresiasPorVencer  →  tabla
-- ---------------------------------------------------------
-- Bold no renueva solo, así que esta lista es la que hay que contactar
-- antes de que se venza. Sin esto, la gente se cae por olvido.
select
  email,
  name as nombre,
  premium_until::date as vence,
  (premium_until::date - current_date) as dias_restantes
from users
where premium_until is not null
  and premium_until between now() and now() + interval '15 days'
order by premium_until;
