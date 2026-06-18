-- =====================================================================
--  Prospección — esquema (conteo diario acumulado)
--  Postgres / Supabase · uso personal
-- =====================================================================

-- Carga rápida: cada "sumar contactados" inserta una fila (append-only).
create table if not exists contactados (
  id          bigint generated always as identity primary key,
  fecha       date not null default (now() at time zone 'America/Argentina/Buenos_Aires'),
  rubro       text not null,
  cantidad    int  not null check (cantidad > 0),
  created_at  timestamptz not null default now()
);
create index if not exists idx_contactados_fecha on contactados(fecha);

-- Fin del día: cada cierre inserta una fila (append-only, se suman).
create table if not exists cierres (
  id          bigint generated always as identity primary key,
  fecha       date not null default (now() at time zone 'America/Argentina/Buenos_Aires'),
  r1          int  not null default 0 check (r1 >= 0),  -- respuestas en mensaje 1
  r2          int  not null default 0 check (r2 >= 0),  -- respuestas en mensaje 2
  r3          int  not null default 0 check (r3 >= 0),  -- respuestas en mensaje 3
  ventas      int  not null default 0 check (ventas >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists idx_cierres_fecha on cierres(fecha);

-- Lista: perfiles importados desde CSV para ir hablándoles.
-- Al marcar 'hablado' se inserta además una fila en 'contactados'
-- (rubro = el de la lista), por eso impacta en las estadísticas.
create table if not exists lista (
  id             bigint generated always as identity primary key,
  carpeta        text not null default 'General',
  url            text not null,
  nombre         text,
  rubro          text not null,
  hablado        boolean not null default false,  -- true = contactado
  -- estado derivado: pendiente (hablado=f, fecha=null), contactado
  -- (hablado=t), cancelado/no-contacto (hablado=f, fecha_hablado set)
  fecha_hablado  timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_lista_hablado on lista(hablado);
create index if not exists idx_lista_id on lista(id);
create index if not exists idx_lista_carpeta on lista(carpeta);

-- Speech: mensajes de prospección guardados para copiar y pegar.
create table if not exists speech (
  id          bigint generated always as identity primary key,
  titulo      text,
  texto       text not null,
  created_at  timestamptz not null default now()
);

-- Seguimientos: perfiles puntuales a seguir.
create table if not exists perfiles (
  id               bigint generated always as identity primary key,
  handle           text not null,
  nombre           text,
  rubro            text,
  ultimo_contacto  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  Uso personal con anon key: RLS deshabilitado (acceso abierto).
--  Si querés blindarlo, activá RLS y agregá políticas o auth.
-- ---------------------------------------------------------------------
