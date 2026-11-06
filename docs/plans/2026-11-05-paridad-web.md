# La app nativa al día con el estudio web — plan (2026-11-05)

El dueño pidió «actualizar nuestra app nativa» y saltarse las preguntas: todo lo marcado **(decisión mía)** es
una elección del implementador, no algo que el dueño acordó. Se revisa al ver la primera fase.

## Dónde estamos

- La app (`auto-toon-app`, Expo 55, v1.0.4) se quedó en agosto: Crear con el «director» (`/api/create/agent`,
  `/api/enhance-product`), Fitting Room, Model Factory, créditos con IAP. Sus 50 endpoints siguen vivos en la web.
- La web se reescribió (sept–nov): mesas por producto en Crear, propuestas con precio, todo es un trabajo en
  cola (`/api/jobs`), saldo en pesos (D15), Biblioteca, Trabajos, Campañas (guiada, Colección), lenguaje visual
  monocromo.
- Lo nuevo de la web corre casi todo por server actions y server components: la app sólo puede llamar REST.
  La cola (`/api/jobs*`) y las ayudas de Crear (`/api/crear/*`) ya son REST; mesas, Biblioteca, Trabajos y
  saldo no.
- El dinero: la cola cobra del **saldo** (`SaldoMovimiento`); la IAP de la app alimenta el **ledger viejo de
  créditos**. Hoy una compra en el iPhone no paga trabajos.

## Decisiones

1. **Base (decisión mía):** rama `feat/paridad-web` sobre `feat/create-hub-parity` (los 18 commits de agosto
   nunca se subieron; se conservan). El servidor va en `feat/api-nativa` (toon-converter, desde `develop`).
2. **Servidor (decisión mía):** rutas REST delgadas que envuelven la lógica que ya usan las server actions
   (`crear/mesas.ts`, `mesas-actions.ts`, `lib/saldo.ts`, `trabajos/actions.ts`), con el mismo `resolveUser`
   (Clerk acepta el Bearer que la app ya manda). Nada de lógica duplicada.
3. **Dinero:** en iOS el saldo se compra con IAP (guía 3.1.1 de Apple): paquetes consumibles nuevos que
   acreditan `SaldoMovimiento` una sola vez por transacción. Los productos se dan de alta en App Store Connect
   (acción del dueño). Android recarga con Stripe PaymentSheet. Las pantallas de créditos viejas se quedan
   hasta el cambio.
4. **Aspecto (decisión mía):** el de la web — fondo `#0A0A0A`, acento `#D4FF3D` (acciones que se quedan en la
   pantalla), rosa `#FF3D8A` (lo cobrado y lo que sigue en otra pantalla), Geist; interfaz en español de
   México. Las pantallas siguen los tableros de teléfono del lienzo (Main/Mesas, Biblioteca, Visor, Trabajos,
   Ajustes) — en React Native a mano: la app no usa el convertidor.
5. **El precio antes de generar**, siempre de `/api/jobs/quote`; nada se genera sin que el usuario lo pida.

## Fases

| Fase | Qué | Dónde |
|---|---|---|
| 0 | Base: tokens nuevos + Geist; arreglar el crash de hooks al abrir Restaurar/Relight (`create-screen.tsx`, `useEffect` después del `return`); `analysis`/`concept` se reinician con cada foto; entrada a «Cuenta» (hoy inalcanzable) | app |
| 1 | REST: `GET/POST /api/mesas`, `GET/PATCH /api/mesas/[id]`, `POST /api/mesas/[id]/archivar`, `GET /api/crear/config` (categorías, gasto del mes), `GET /api/saldo`, `GET /api/trabajos`, `POST /api/jobs/cancelar`; un check por ruta con lógica | servidor |
| 2 | Crear con mesas: lista de mesas → mesa (fotos del producto, ficha, photobook) → «¿Qué buscas?» con propuestas y su precio → `POST /api/jobs` → observar con `GET /api/jobs?hold=` → piezas; visor con «En alta» y «Reintentar» | app |
| 3 | Saldo: saldo arriba en Crear; IAP de saldo (`POST /api/iap/apple/saldo` → `SaldoMovimiento`); Ajustes con saldo, apartado y movimientos | ambos |
| 4 | Biblioteca (`GET /api/biblioteca`) y Trabajos (con cancelar) | ambos |
| 5 | Campañas: guiada y Colección (sus rutas REST) | ambos |

Cada fase se prueba en el simulador contra la base **local** (`pnpm dev:local` en toon-converter, puerto
3000, `EXPO_PUBLIC_API_URL` a la IP de la Mac), sin generar nada pagado salvo que el dueño lo pida.

## Bugs que ya se saben (del mapeo)

- `views/create/create-screen.tsx`: `useEffect` (≈l.305) después del `return` del panel (≈l.281) → «Rendered
  fewer hooks» al abrir Restaurar o Relight con foto.
- `analysis` y `concept` no se reinician con una foto nueva: la generación siguiente manda el `promptOverride`
  viejo.
- `/account` no tiene entrada desde que se quitó el dashboard: no hay cómo cerrar sesión.
- Nadie llama `fetchSubscription()`: `plan` y `termsAccepted` se quedan en caché.
- Cada subida se analiza dos veces (`/api/analyze-product` y `/api/create/analyze`).

## Estado (2026-11-05)

| Fase | Estado |
|---|---|
| 0 | Hecha: tokens, Geist, los dos bugs de Crear, entrada a Cuenta. |
| 1 | Hecha (rama `feat/api-nativa` en toon-converter). Además: `GET /api/biblioteca`, `GET /api/trabajos`, `GET /api/campanas`, `GET /api/campanas/[id]`; y la carrera al crear la cuenta en el primer login (dos pedidos a la vez → P2002) quedó arreglada en `resolveUser`. |
| 2 | Hecha: Crear con mesas. Falta probar en el simulador con la cuenta que tiene mesas. |
| 3 | Hecha la parte de código: pantalla Saldo, recargas `com.autotoon.saldo.{100,250,500}`. **Falta crear esos tres consumibles en App Store Connect** (y su precio). |
| 4 | Hecha: pestaña Biblioteca, Trabajos con cancelar. |
| 5 | **Sólo lectura** (decisión mía): lista de campañas y cada campaña con sus piezas. Armar una campaña (guiada, Colección) se queda en la web mientras la sesión «Campaña completa creada desde Crear» cambia cómo se crean; copiar hoy el flujo viejo sería trabajo para tirar. |

Pendiente aparte: el texto de inicio de sesión y onboarding sigue en inglés y habla de créditos.
