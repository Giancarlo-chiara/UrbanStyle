# UrbanStyle — E-commerce completo

Proyecto de e-commerce de moda urbana con:

- **Frontend**: React + Tailwind CSS (`ecommerce/`)
- **Backend**: API REST en PHP puro, sin frameworks (`backend/`)
- **Base de datos**: PostgreSQL, normalizada (`database/`)

```
UrbanStyle/
├── ecommerce/    Frontend React + Tailwind (Vite)
├── backend/      API PHP (Router → Controller → Service → Repository → PDO)
└── database/     Migraciones y seed de PostgreSQL
```

## Orden de instalación recomendado

1. **Base de datos** — crea `urbanstyle` en PostgreSQL y corre las migraciones
   y el seed. Ver `backend/README.md` sección 2.1.
2. **Backend** — copia `backend/.env.example` a `backend/.env`, ajusta
   credenciales y levanta el servidor PHP (`php -S localhost:8000` desde
   `backend/public`). Ver `backend/README.md`.
3. **Frontend** — copia `ecommerce/.env.example` a `ecommerce/.env` apuntando
   a la API (`http://localhost:8000/api` por defecto), luego `npm install &&
   npm run dev` desde `ecommerce/`. Ver `ecommerce/README.md`.

## Usuario administrador de prueba

El seed crea `admin@urbanstyle.pe`, pero **debes regenerar su contraseña**
antes de usarlo (instrucciones en `backend/README.md`, sección 2.1) — el hash
incluido en el seed es solo un placeholder y no corresponde a ninguna
contraseña real.

## Arquitectura

- El frontend **no contiene productos hardcodeados**: todo el catálogo,
  categorías, marcas, pedidos, usuarios e inventario se sirven dinámicamente
  desde PostgreSQL vía la API PHP.
- Autenticación JWT propia (sin librerías externas), con roles `cliente` y
  `admin`. El panel `/admin` en el frontend está protegido por rol.
- El precio final de cada producto (`final_price`) es una columna **generada
  automáticamente por PostgreSQL** a partir de `price` y `discount_percent`,
  por lo que nunca puede desincronizarse.
- Cada compra descuenta stock de la variante (talla/color) correspondiente
  dentro de una transacción SQL (`OrderRepository::create`).
