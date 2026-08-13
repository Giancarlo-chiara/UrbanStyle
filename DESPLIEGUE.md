# Despliegue en Vercel

Sí: **subir a GitHub, conectar y desplegar.** Con un matiz — Vercel no aloja
bases de datos, así que hay que darle una. Todo lo demás está automatizado.

```
tu-proyecto.vercel.app/          →  React estático
tu-proyecto.vercel.app/api/...   →  Express como función serverless
                                      ↓
                                  PostgreSQL en Neon
```

Frontend y API comparten dominio, así que **no hace falta CORS**.

---

## Los 4 pasos

### 1. Subir a GitHub

```bash
cd C:\Users\gianc\UrbanStyle
git add -A
git commit -m "UrbanStyle: tienda completa con API Node/Express/Prisma"
```

Crea el repositorio en GitHub y sube la rama.

> Comprueba antes que no se cuela ningún secreto. No debe devolver nada:
> ```bash
> git status --porcelain | Select-String "\.env$"
> ```

### 2. Importar en Vercel

<https://vercel.com> → **Add New → Project** → tu repositorio.

**No cambies nada** de la configuración: el `vercel.json` de la raíz ya define el
comando de build, la carpeta de salida y las reescrituras.

### 3. Añadir la base de datos

En el proyecto de Vercel, pestaña **Storage → Create Database → Neon**.

Vercel crea la base y **te inyecta `DATABASE_URL` automáticamente**. Si prefieres
crearla tú en <https://neon.com>, copia la cadena de conexión que lleva `-pooler`
en el host y añádela a mano.

> El `-pooler` importa: cada invocación serverless puede abrir su propia conexión
> y PostgreSQL tiene un tope. El *pooler* existe justo para eso.

### 4. Añadir el secreto de sesión y desplegar

En **Settings → Environment Variables**, añade una sola variable más:

| Nombre | Valor |
|---|---|
| `JWT_SECRET` | Una cadena larga y aleatoria |

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

> Usa uno **distinto** al de tu `.env` local, y no lo pegues en ningún chat ni lo
> subas al repositorio: con él cualquiera puede firmarse un token de administrador.

**Deploy.**

---

## Lo que pasa solo en el despliegue

El comando de build encadena todo esto sin que tengas que hacer nada:

```
prisma generate          genera el cliente para el runtime de Vercel
prisma migrate deploy    crea las 17 tablas en la base vacía
cargar-seed --si-vacia   carga el catálogo la PRIMERA vez; después no toca nada
npm run build            compila el frontend
```

Ese `--si-vacia` es la clave de que puedas redesplegar tranquilo: si la base ya
tiene productos, el script lo dice y se aparta sin romper el build.

**Verificado en tu equipo:** el pipeline completo corre de principio a fin.

---

## Comprobar que quedó bien

```
https://tu-proyecto.vercel.app/api/health   → {"success":true,...,"status":"up"}
https://tu-proyecto.vercel.app/             → la tienda con los 36 productos
https://tu-proyecto.vercel.app/pedidos      → NO debe dar 404
```

Entra al panel con `admin@urbanstyle.pe` / `Admin123!` y **cambia esa contraseña
enseguida**: está escrita en el repositorio.

---

## Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| `Can't reach database server` | Cadena de conexión **directa** en vez de la agrupada | Usa la que lleva `-pooler` |
| `P3005: schema is not empty` | La base ya tenía tablas de antes | `npx prisma migrate resolve --applied 20260812000000_esquema_inicial` (y lo mismo con la segunda) |
| `@prisma/client did not initialize` | `prisma generate` no corrió | Comprueba que Vercel use el `buildCommand` del `vercel.json` |
| `/pedidos` da 404 al recargar | La reescritura no se aplicó | `vercel.json` tiene que estar en la **raíz** del repositorio |
| La primera petición tarda 1-2 s | Arranque en frío | Es normal en serverless; solo ocurre tras minutos de inactividad |

---

## Lo que no está probado

El despliegue en sí. Requiere tu cuenta de Neon y tu cuenta de Vercel, y no voy a
crear cuentas a tu nombre.

Sí está verificado en tu equipo: que el comando de build corre completo (Prisma,
migraciones, seed y frontend), que el bundle de producción lleva `baseURL:"/api"`
compilado, que las migraciones contienen el SQL que ya creó tu base actual, y que
los `.env` con credenciales quedan fuera del repositorio.

Lo que solo se ve al desplegar es que Prisma arranque en el runtime de Vercel. Si
falla, pásame el registro de la función desde el panel.

---

## Nota técnica: por qué las migraciones no las generó Prisma

El cuerpo de la primera migración es el SQL original del proyecto, no un volcado
del esquema de Prisma. Es deliberado: Prisma **no modela** 1 columna generada
(`final_price`), 7 restricciones `CHECK`, 3 triggers y 1 función. Si la base se
creara desde el esquema de Prisma, Neon se quedaría sin el cálculo automático del
precio con descuento y sin la barrera `stock >= 0`.
