# Andina Foods · Inventario

**App en vivo:** https://inventarios-fabrica-five.vercel.app

Sistema de inventario para una empresa de alimentos que produce en su fábrica, despacha a su tienda y vende.
Cada producto se sigue en cuatro etapas: **Fábrica → En tránsito → Tienda → Vendido**.

Todos los datos viven en una base de datos Postgres (Neon), así que todas las personas que tengan la app abierta
ven los mismos números: la app consulta la API cada 4 segundos.

## Qué hace

- **Dashboard**: tarjetas por etapa, inventario por producto, movimiento semanal y alertas de reposición.
- **Fábrica**: carga semanal de producción (la diferencia se suma al stock de fábrica).
- **Tienda**, **En tránsito** y **Ventas**: envíos, recepciones y ventas, con historial por producto.
- **Planeación de demanda**: proyección con promedio ponderado de 4 semanas y ajuste por tendencia.
- **Productos**, **Reportes** y **Configuración**.
- Ningún stock puede quedar negativo: se valida en la pantalla, en la API y con restricciones `CHECK` en la base.

## Stack

- React 18 + TypeScript + Vite, Tailwind CSS, Radix UI (estilo shadcn/ui), lucide-react, Recharts y Sonner.
- Backend: una Vercel Function (`api/inventory.ts`) con `pg`.
- Base de datos: Neon Postgres (`DATABASE_URL`). La API crea las tablas y carga los datos iniciales la primera vez.

## Cómo correrlo

```bash
npm install
npm run dev        # solo el front: entra en "Modo local" con datos de ejemplo
```

Con la base de datos (necesita la CLI de Vercel y el proyecto enlazado):

```bash
vercel env pull .env.local
vercel dev         # front + API conectados a Neon ("En vivo")
```

Variables de entorno (ver `.env.example`):

| Variable       | Uso                                                 |
| -------------- | --------------------------------------------------- |
| `DATABASE_URL` | Cadena de conexión de Neon (se crea desde Storage). |
| `RESET_TOKEN`  | Token secreto para reiniciar los datos.             |

## Reiniciar los datos

Desde **Configuración → Reiniciar datos** escribiendo el token, o con:

```bash
curl -X POST https://TU-APP.vercel.app/api/inventory \
  -H "Content-Type: application/json" \
  -H "x-reset-token: $RESET_TOKEN" \
  -d '{"action":"reset"}'
```

## API

- `GET /api/inventory` → estado completo (productos, envíos, ventas, historial y configuración).
- `POST /api/inventory` con `{ "action": ... }` → ejecuta el movimiento en una transacción y devuelve el estado actualizado.
  Acciones: `produce`, `saveWeekProduction`, `createShipment`, `receiveShipment`, `sale`, `createProduct`,
  `updateProduct`, `saveSettings`, `savePlan` y `reset`.
