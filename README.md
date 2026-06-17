# Prospección · Panel de control

Herramienta personal para seguir la prospección en frío: cargar contactos,
registrar la secuencia de mensajes (toques), medir respuestas con los
denominadores correctos, ver recordatorios de seguimiento e importar desde CSV.

Stack: **Next.js 16 (App Router) · Supabase · Tailwind v4 · Recharts**.

## Puesta en marcha (3 pasos)

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → **New project**.
2. Elegí nombre, contraseña de DB y región (por cercanía, **South America (São Paulo)**).
3. Esperá a que termine de aprovisionar (~2 min).

### 2. Correr la migración (crea tablas + vistas)

1. En el panel de Supabase → **SQL Editor** → **New query**.
2. Pegá todo el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. **Run**. Crea las tablas (`rubros`, `contactos`, `mensajes`, `ajustes`),
   las vistas de estadística y carga rubros iniciales.

> Las tablas quedan sin RLS porque es una herramienta de uso personal con la
> anon key. Si querés blindarla, activá RLS y agregá políticas.

### 3. Conectar las keys

1. En Supabase → **Project Settings → API**.
2. Copiá **Project URL** y **anon public key**.
3. Pegalas en [`.env.local`](.env.local):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

4. Reiniciá el dev server: `npm run dev`.

## Cómo se calculan las tasas (lo importante)

- **Tasa por número de mensaje**: el denominador es **los contactos que
  recibieron ese mensaje**, no el total. Definido en la vista
  `v_tasa_por_mensaje`. Así "tasa del mensaje 3" responde de verdad cuánto
  rinde insistir hasta el tercer toque.
- **Por rubro**: respuesta y conversión a cliente se calculan **por separado**
  (`v_por_rubro`).
- **Embudo / canal / promedios / volumen**: cada uno en su propia vista.
- **Descartados**: salen de la bandeja de seguimientos pero **siguen contando**
  como intento fallido en las tasas.
- Fechas manejadas en `America/Argentina/Buenos_Aires`.

## Secciones

| Ruta | Para qué |
|------|----------|
| `/` | Contactos: alta rápida, tabla con filtros y orden, gestión de toques. |
| `/estadisticas` | Panel con KPIs, embudo y gráficos. |
| `/seguimientos` | Bandeja "hoy escribile a estos". |
| `/importar` | Importación CSV con mapeo de columnas y dedupe. |
| `/ajustes` | Intervalo de seguimiento y rubros. |
