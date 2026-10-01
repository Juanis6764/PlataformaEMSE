# Despliegue de Plataforma EMSE: Vercel + Render + Supabase

## Arquitectura elegida

| Parte | Servicio | Motivo |
| --- | --- | --- |
| Frontend Next.js | Vercel | Está optimizado para Next.js, HTTPS y despliegues desde Git. |
| API NestJS y Socket.IO | Render Web Service | Mantiene un proceso Node persistente y permite WebSockets. |
| Base de datos PostgreSQL | Supabase | PostgreSQL administrado, con 500 MB de base de datos en Free. |
| Adjuntos documentales | Supabase Storage (pendiente de conectar) | El disco de Render Free es efímero y no puede conservar archivos. |

No desplegar el backend en Vercel: es una API NestJS con Socket.IO y carga de archivos, no una función serverless. Tampoco usar Render Postgres Free para los datos institucionales: expira 30 días después de crearse y no tiene backups.

## Desarrollo local: se conserva sin cambios

El proyecto sigue funcionando localmente, independiente de los servicios desplegados:

```powershell
# Terminal 1
cd backend
npm run start:dev

# Terminal 2
cd frontend
npm run dev
```

Abre `http://localhost:3000`. Si `NEXT_PUBLIC_API_URL` no está definida, el frontend y los dos sockets usan automáticamente `http://localhost:3001`. Con `NODE_ENV=development`, el backend permite los orígenes locales.

Mantén las credenciales de desarrollo en `backend/.env`. Para probar Supabase localmente sin publicar, crea `backend/.env.supabase.local` a partir de `.env.example`, copia temporalmente sus valores a `.env` y nunca subas ninguno de esos archivos al repositorio. Para volver a la base local, restaura tu `DATABASE_URL` local en `backend/.env`.

No definas `NEXT_PUBLIC_API_URL` en tu archivo local salvo que quieras probar específicamente el frontend contra Render. En Vercel esa variable sí debe existir y apuntar a Render.

## 1. Publicar el código en GitHub

1. Crea un repositorio **privado** en GitHub.
2. Sube la raíz completa del proyecto, incluidos `frontend`, `backend`, `render.yaml` y `backend/prisma/migrations`.
3. No subas `backend/.env`, contraseñas, ni copias de la base de datos. Comprueba que están ignorados por Git.

## 2. Crear e importar la base de datos en Supabase

1. Crea un proyecto en Supabase, preferentemente en una región cercana a tus usuarios.
2. En **Connect**, copia la URI de conexión de **Session pooler** (puerto 5432) y añade `?sslmode=require` si no lo trae.
3. Instala PostgreSQL client tools en tu computador si todavía no cuentas con `pg_restore`.
4. En PowerShell, define la URL de Supabase sin escribirla en el repositorio y restaura el respaldo completo más reciente:

```powershell
$emseSupabaseUrl = 'postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require'
pg_restore --dbname=$emseSupabaseUrl --no-owner --no-privileges --verbose '.\backups\EMSE_RECUPERADA_20260927T164126Z.backup'
```

El archivo indicado conserva estructura, campos, relaciones y datos. No uses `prisma db push`: eso no importa los registros existentes y puede alterar el esquema sin historial de migraciones.

5. Revisa en Supabase Studio las tablas y algunos registros críticos. Si la copia incluye la tabla `_prisma_migrations`, Render reconocerá el historial y ejecutará solo las migraciones que falten.
6. Conserva los respaldos locales y programa un backup lógico periódico. La cuenta Free tiene 500 MB de datos y puede pausar el proyecto si permanece inactivo.

> Antes de restaurar un respaldo por segunda vez, hazlo en un proyecto Supabase nuevo o vacía explícitamente el esquema objetivo. Nunca ejecutes una restauración destructiva contra la única base en producción sin un backup reciente.

## 3. Desplegar el backend en Render

1. En Render usa **New > Blueprint** y selecciona el repositorio. Detectará `render.yaml` y creará `emse-api`.
2. Completa las variables que aparecen como `sync: false`:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | URI de Supabase Session Pooler con `sslmode=require` |
| `FRONTEND_URLS` | URL de Vercel, por ejemplo `https://plataforma-emse.vercel.app` |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Datos SMTP de producción; para Gmail usa una contraseña de aplicación |

`JWT_SECRET` y `OTP_HASH_SECRET` los genera Render. No reutilices los secretos de desarrollo.

3. Espera el build. Su comando genera Prisma, ejecuta `prisma migrate deploy` y compila NestJS. Al terminar, abre `https://<tu-api>.onrender.com/`: debe responder `Backend funcionando`.
4. Copia esa URL exacta, sin una barra al final.

Render Free tiene 750 horas compartidas por mes, se suspende cuando está inactivo y bloquea SMTP saliente por el puerto 587. Para correos institucionales reales será necesario un proveedor HTTP de correo o un servicio de pago; no dependas del SMTP de Gmail desde Render Free.

## 4. Desplegar el frontend en Vercel

1. En Vercel, pulsa **Add New > Project**, importa el mismo repositorio y configura **Root Directory** como `frontend`.
2. Añade esta variable de entorno para Production, Preview y Development:

```text
NEXT_PUBLIC_API_URL=https://<tu-api>.onrender.com
```

3. Despliega. Obtendrás una URL `https://<tu-proyecto>.vercel.app`.
4. Vuelve a Render y define esa URL en `FRONTEND_URLS`; después usa **Manual Deploy > Clear build cache & deploy**.
5. Prueba: inicio de sesión, carga de un módulo, presencia en dos navegadores y una actualización documental en tiempo real.

## Archivos documentales: requisito antes de producción

La API guarda actualmente los archivos en el disco local. En Render Free ese disco se borra con reinicios y redeploys, por lo que los adjuntos no se conservarían. La base de datos sí quedaría completa en Supabase, pero no los contenidos de los archivos.

Antes de usar gestión documental en producción, hay que conectar el adaptador ya previsto en el proyecto a un bucket **privado** de Supabase Storage y migrar los archivos existentes. El backend debe seguir siendo quien autoriza y descarga el archivo; no se debe exponer una clave de servicio ni un bucket público al navegador.

## Límites que debes considerar

- Vercel Hobby es gratis para uso personal/no comercial y sirve muy bien para el frontend.
- Supabase Free: 500 MB de base, 1 GB de Storage y 5 GB de salida mensual; la base puede pausarse tras baja actividad.
- Render Free: útil para demostración, pero tiene inicio lento tras inactividad, 512 MB de RAM, sin disco persistente y SMTP bloqueado.

Para una plataforma institucional con datos de cadetes, el camino sano es usar esta arquitectura gratis para piloto/demostración y pasar al menos el backend o Supabase a pago antes de operación continua.
