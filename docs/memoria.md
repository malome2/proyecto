# Museo virtual de videojuegos

## Introducción
En este proyecto se desarrolla un **museo virtual de videojuegos en entorno web**, donde el usuario puede recorrer un espacio interactivo, inspirado en los videojuegos clásicos como *Doom*. A lo largo del museo se muestran diferentes juegos representados en forma de cuadros, y al acercarse a ellos se puede consultar información, escuchar la banda sonora y visualizar fragmentos del juego.

La web no solo permite visitar el museo, sino que también incluye una forma de **gestión de usuarios**, teniendo tanto usuarios como administradores. Los usuarios pueden recomendar nuevos videojuegos para el museo, mientras que los administradores pueden gestionar el contenido que se muestra en este.

El proyecto también incluye un **sistema de donaciones** con Stripe que otorga un nivel (*tier*) al usuario donante, lo que le da visibilidad prioritaria en las recomendaciones.

Este proyecto se realiza como **proyecto final del ciclo formativo de Desarrollo de Aplicaciones Web (DAW)**, aplicando los conocimientos adquiridos tanto en frontend como en backend, bases de datos y despliegue de aplicaciones web.

---

## Objetivos del proyecto

### Objetivo principal
Desarrollar una aplicación web que funcione como un museo virtual de videojuegos, utilizando contenido multimedia, gestión de usuarios y base de datos.

### Objetivos específicos
- Crear una web con varias secciones.
- Implementar un museo virtual en primera persona con movimiento mediante teclado.
- Mostrar información dinámica de los videojuegos guardados en la base de datos.
- Integrar contenido multimedia como imágenes, audio y vídeo.
- Añadir un sistema de registro e inicio de sesión con verificación por email.
- Diferenciar entre usuarios normales y administradores.
- Permitir a los usuarios enviar recomendaciones.
- Permitir a los administradores añadir, modificar y eliminar el contenido del museo.
- Implementar un sistema de donaciones con Stripe y tiers de usuario.
- Implementar un perfil de usuario con cambio de email y contraseña verificado por OTP.
- Desplegar la aplicación para que sea accesible desde Internet.

---

## Tecnologías utilizadas

### Frontend
- **HTML5** para la estructura de la web.
- **CSS3** para el diseño.
- **JavaScript Vanilla** para la interacción y lógica de cliente.
- **Canvas API** para la creación del museo virtual (raycasting 2.5D).
- **Fetch API** para la comunicación con el backend.

### Backend
- **Node.js** como entorno de ejecución.
- **Express 5** para la creación de la API REST.
- **JSON Web Tokens (JWT)** para la autenticación de usuarios.
- **bcrypt** para el cifrado de contraseñas.
- **Multer** para la subida de archivos multimedia.
- **Nodemailer** para el envío de emails transaccionales (verificación, OTP, reset).
- **Stripe** para la gestión de pagos y donaciones.

### Base de datos
- **MySQL** para almacenar usuarios, videojuegos, recomendaciones, donaciones y tokens temporales.
- **mysql2** como driver de conexión desde Node.js.

### Herramientas adicionales
- **Git / GitHub** para el control de versiones.
- **dotenv** para la gestión de variables de entorno.
- **express-rate-limit** para la protección contra abuso de la API.
- **Cloudinary** para el almacenamiento de imágenes en la nube con CDN.
- **Brevo (SMTP)** como relay de correo para los emails transaccionales.

---

## Análisis y diseño

### Casos de uso

#### Usuario no registrado
- Acceder a la página principal.
- Acceder a la sección "Quiénes somos".
- Registrarse en la aplicación.
- Verificar su cuenta por email.
- Iniciar sesión.
- Solicitar restablecimiento de contraseña.
- Visualizar información general del proyecto.

#### Usuario registrado
- Iniciar sesión y cerrar sesión.
- Acceder al museo virtual.
- Moverse por el museo mediante controles WASD.
- Visualizar la información de los juegos al acercarse a un cuadro.
- Reproducir la música asociada a un juego.
- Visualizar un vídeo de gameplay del juego.
- Enviar una recomendación de juego al museo.
- Ver el estado de sus propias recomendaciones.
- Editar su perfil (username, email, contraseña) con confirmación por OTP.
- Realizar una donación y obtener un tier de donante.

#### Administrador
- Iniciar sesión como administrador.
- Acceder al panel de administración.
- Añadir un nuevo juego al museo.
- Editar la información de un juego existente.
- Eliminar un juego del museo.
- Subir contenido multimedia (imagen, música y vídeo).
- Aprobar o rechazar recomendaciones de usuarios.
- Editar el título y descripción de una recomendación.
- Visualizar la lista de usuarios registrados.
- Cambiar el rol de un usuario (USER ↔ ADMIN).
- Eliminar un usuario.

---

## Modelo de datos

### Tabla `usuarios`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO_INCREMENT | Identificador único |
| username | VARCHAR(50) NOT NULL | Nombre de usuario |
| email | VARCHAR(100) NOT NULL UNIQUE | Correo electrónico |
| password | VARCHAR(255) NOT NULL | Contraseña hasheada (bcrypt) |
| role | ENUM('USER','ADMIN') DEFAULT 'USER' | Rol del usuario |
| email_verified | TINYINT(1) DEFAULT 0 | Si el email ha sido verificado |
| verification_token | VARCHAR(255) | Código de verificación + timestamp (`code|timestamp`) |
| donor_tier | ENUM('none','visitante','coleccionista','arcade') DEFAULT 'none' | Nivel de donante (solo sube, nunca baja) |

### Tabla `juegos`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO_INCREMENT | Identificador único |
| titulo | VARCHAR(100) NOT NULL | Título del videojuego |
| descripcion | TEXT | Descripción del juego |
| imagen | VARCHAR(255) | URL de Cloudinary |
| video_url | VARCHAR(255) | URL de Cloudinary o URL externa |
| musica_url | VARCHAR(255) | URL de Cloudinary |
| pos_x | FLOAT | Posición X del cuadro en el mapa del museo |
| pos_y | FLOAT | Posición Y del cuadro en el mapa del museo |
| created_by | INT FK → usuarios.id | Usuario admin que lo creó |

### Tabla `recomendaciones`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO_INCREMENT | Identificador único |
| titulo | VARCHAR(100) | Título sugerido para el juego |
| descripcion | TEXT | Descripción del juego recomendado |
| usuario_id | INT FK → usuarios.id | Usuario que envió la recomendación |
| estado | ENUM('pendiente','aprobado') DEFAULT 'pendiente' | Estado de revisión |
| primer_arcade | TINYINT(1) DEFAULT 0 | 1 si el usuario tiene tier `arcade` y es su primera recomendación; da prioridad visual en el panel admin |

### Tabla `cambios_pendientes`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO_INCREMENT | Identificador único |
| usuario_id | INT NOT NULL FK → usuarios.id | Usuario que solicitó el cambio |
| tipo | ENUM('email','password') NOT NULL | Tipo de cambio |
| nuevo_email | VARCHAR | Nuevo email (solo para tipo email) |
| nuevo_hash | VARCHAR | Nueva contraseña ya hasheada (solo para tipo password) |
| codigo | VARCHAR(6) | Código OTP de 6 dígitos |
| expires_at | DATETIME | Expiración (+15 minutos) |
| used | TINYINT(1) DEFAULT 0 | Si el código ya fue usado |

### Tabla `password_resets`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO_INCREMENT | Identificador único |
| usuario_id | INT NOT NULL FK → usuarios.id | Usuario que solicitó el reset |
| token | VARCHAR(64) UNIQUE | Token aleatorio de 64 caracteres hex |
| expires_at | DATETIME | Expiración (+1 hora) |
| used | TINYINT(1) DEFAULT 0 | Si el token ya fue usado |

### Tabla `donaciones`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO_INCREMENT | Identificador único |
| usuario_id | INT DEFAULT NULL FK → usuarios.id | Usuario donante (nullable para donaciones anónimas) |
| stripe_session_id | VARCHAR(255) UNIQUE | ID de sesión Stripe (evita duplicados) |
| amount | INT | Cantidad donada en euros |
| tier | ENUM('visitante','coleccionista','arcade') | Tier obtenido con esta donación |
| created_at | DATETIME DEFAULT NOW() | Fecha de la donación |

---

## Desarrollo

### Estructura del proyecto

```
final/
├── backend/
│   ├── app.js                          # Punto de entrada del servidor
│   ├── config/
│   │   ├── db.js                       # Pool de conexión MySQL
│   │   ├── cloudinary.js               # Configuración Cloudinary v2
│   │   └── mailer.js                   # Nodemailer + SMTP Brevo
│   ├── middleware/
│   │   ├── auth.js                     # verifyToken, verifyAdmin (JWT)
│   │   └── rateLimiter.js              # authLimiter, writeLimiter, globalLimiter
│   ├── routes/
│   │   ├── auth.routes.js              # Autenticación (registro, login, verificación, reset)
│   │   ├── juegos.routes.js            # CRUD juegos + multer + Cloudinary
│   │   ├── recomendaciones.routes.js   # Recomendaciones (user + admin)
│   │   ├── usuarios.routes.js          # Perfil + gestión admin de usuarios
│   │   └── pagos.routes.js             # Donaciones con Stripe
│   ├── uploads/                        # Directorio temporal (los archivos se suben a Cloudinary y se eliminan)
│   ├── .env                            # Variables de entorno (no versionado)
│   ├── DB.sql                          # Script de creación de la base de datos
│   └── package.json
├── frontend/
│   ├── login.html                      # Login, registro, verificación y recuperación
│   ├── index.html                      # Página principal
│   ├── museo.html                      # Museo virtual 2.5D
│   ├── admin.html                      # Panel de administración
│   ├── support.html                    # Página de donaciones (Stripe)
│   ├── us.html                         # Página "Quiénes somos"
│   ├── perfil.html                     # Perfil de usuario
│   ├── success.html                    # Confirmación post-pago
│   ├── reset-password.html             # Restablecimiento de contraseña
│   ├── CSS/
│   │   ├── base.css                    # Reset y variables globales
│   │   ├── nav.css                     # Barra de navegación
│   │   ├── index.css                   # Estilos página principal
│   │   ├── login.css                   # Estilos login/registro
│   │   ├── museo.css                   # Estilos del museo y canvas
│   │   ├── support.css                 # Estilos página donaciones
│   │   ├── ui.css                      # Componentes reutilizables
│   │   └── us.css                      # Estilos "Quiénes somos"
│   ├── JS/
│   │   ├── config.js                   # API_BASE (autodetecta localhost vs producción)
│   │   ├── nav.js                      # renderNav(), logout()
│   │   ├── login.js                    # Login, registro, verificación, recuperación
│   │   ├── index.js                    # Página principal: portadas y recomendación
│   │   ├── museo.js                    # Motor raycaster 2.5D completo
│   │   ├── admin.js                    # Panel admin: juegos, recomendaciones, usuarios
│   │   ├── perfil.js                   # Perfil: editar datos con confirmación OTP
│   │   └── support.js                  # Donaciones con Stripe Checkout
│   └── img/
│       ├── logo.svg
│       └── icon.svg
└── docs/
    ├── memoria.md                      # Este documento
    └── ER-Final.png                    # Diagrama entidad-relación
```

### Variables de entorno requeridas (`.env`)
```
# Base de datos — opción A: variables individuales
DB_HOST=localhost
DB_PORT=3306
DB_USER=<usuario_mysql>
DB_PASS=<contraseña_mysql>
DB_NAME=museo_videojuegos

# Base de datos — opción B: cadena de conexión única (Railway la provee automáticamente)
# DATABASE_URL=mysql://user:pass@host:port/dbname

JWT_SECRET=<clave_secreta_jwt>
SUPER_ADMIN_EMAIL=<email_protegido>

CLOUDINARY_CLOUD_NAME=<nombre>
CLOUDINARY_API_KEY=<clave>
CLOUDINARY_API_SECRET=<secreto>

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<usuario_brevo>
BREVO_API_KEY=<api_key_brevo>
SMTP_FROM=<nombre> <email>

FRONTEND_URL=http://127.0.0.1:5500/frontend

# CORS — orígenes permitidos separados por coma (opcional, tiene defaults en desarrollo)
ALLOWED_ORIGINS=https://mi-dominio.com

PORT=3000

PK_TEST=<clave_publica_stripe>
SK_TEST=<clave_secreta_stripe>
```

---

### API REST — Endpoints implementados

#### Autenticación (`/api/auth`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Registra un nuevo usuario |
| POST | `/api/auth/reenviar` | Público | Reenvía el código de verificación |
| POST | `/api/auth/verificar` | Público | Verifica el código y activa la cuenta |
| POST | `/api/auth/login` | Público | Inicia sesión y devuelve JWT |
| POST | `/api/auth/recuperar` | Público | Solicita enlace de restablecimiento de contraseña |
| POST | `/api/auth/reset-password` | Público | Establece nueva contraseña con token |

**POST /api/auth/register**
- Body: `{ username, email, password }`
- Valida contraseña: 8+ chars, mayúscula, minúscula, número.
- Genera código de 6 dígitos válido 15 minutos y lo envía por email.
- Respuesta 201: `{ message: "Revisa tu email para verificar la cuenta" }`
- Si el email ya existe y está verificado → 409. Si existe pero no verificado → 200 (reenvía nuevo código).
- Errores: 400 (campos inválidos), 409 (email ya verificado), 500

**POST /api/auth/verificar**
- Body: `{ email, code }` (el campo se llama `code`, no `codigo`)
- Valida código y timestamp. Marca `email_verified=1`.
- Respuesta 200: `{ message: "Cuenta verificada correctamente" }`

**POST /api/auth/login**
- Body: `{ email, password }`
- Requiere `email_verified=1`. Compara con bcrypt.
- Respuesta 200: `{ token, user: { id, username, role } }` (no incluye `donor_tier`)
- Errores: 400, 401 (credenciales incorrectas), 403 (email no verificado), 500

**POST /api/auth/recuperar**
- Body: `{ email }`
- Genera token de 64 hex válido 1 hora, guarda en `password_resets`.
- Envía email con botón de restablecimiento.

**POST /api/auth/reset-password**
- Body: `{ token, newPassword }`
- Valida token y fecha. Hashea nueva contraseña. Marca token como `used=1`.

---

#### Usuarios (`/api/usuarios`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/usuarios/perfil` | USER | Obtener datos del perfil propio |
| PUT | `/api/usuarios/perfil` | USER | Actualizar username |
| POST | `/api/usuarios/perfil/solicitar-cambio` | USER | Solicitar cambio de email o password (envía OTP) |
| POST | `/api/usuarios/perfil/confirmar-cambio` | USER | Confirmar cambio con código OTP |
| GET | `/api/usuarios` | ADMIN | Listar todos los usuarios |
| PUT | `/api/usuarios/:id/role` | ADMIN | Cambiar rol de usuario |
| DELETE | `/api/usuarios/:id` | ADMIN | Eliminar usuario |

**GET /api/usuarios/perfil**
- Devuelve `{ id, username, email, role, email_verified }` (no incluye `donor_tier`).

**POST /api/usuarios/perfil/solicitar-cambio**
- Body: `{ tipo: 'email'|'password', email?, currentPassword?, newPassword? }`
- Valida disponibilidad del email / contraseña actual según tipo.
- Genera código OTP de 6 dígitos válido 15 min y lo envía por email.

**POST /api/usuarios/perfil/confirmar-cambio**
- Body: `{ tipo, codigo }`
- Valida código y expiración. Aplica el cambio (email o password). Marca como `used=1`.

**PUT /api/usuarios/:id/role**
- Body: `{ role: 'USER'|'ADMIN' }`
- Protege el email definido en `SUPER_ADMIN_EMAIL` (no se puede cambiar su rol).
- Un admin no puede quitarse a sí mismo el rol de ADMIN (auto-degradación bloqueada).

**DELETE /api/usuarios/:id**
- Protege el `SUPER_ADMIN_EMAIL` (no se puede eliminar).
- Un admin no puede eliminarse a sí mismo.

---

#### Juegos (`/api/juegos`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/juegos` | Público | Obtener todos los juegos |
| GET | `/api/juegos/:id` | Público | Obtener un juego por ID |
| POST | `/api/juegos` | ADMIN | Crear un juego (con archivos) |
| PUT | `/api/juegos/:id` | ADMIN | Editar un juego |
| DELETE | `/api/juegos/:id` | ADMIN | Eliminar un juego |

**GET /api/juegos**
- Respuesta 200: array de todos los juegos ordenados por id.

**POST /api/juegos** — `multipart/form-data`
- Campos de texto: `titulo`* (obligatorio), `descripcion`, `pos_x`, `pos_y`, `video_url` (URL externa opcional).
- Archivos: `imagen` (5 MB), `musica` (20 MB), `video` (200 MB). Si se sube archivo `video`, tiene prioridad sobre `video_url`.
- Imagen, música y vídeo se suben a Cloudinary; los archivos temporales se borran del disco.
- La música y el vídeo usan `resource_type: 'video'` en la API de Cloudinary.
- Respuesta 201: `{ id, message }`.

**PUT /api/juegos/:id** — `multipart/form-data`
- Solo se actualizan los campos recibidos.
- Si se sube imagen nueva, la anterior se borra de Cloudinary.
- Si se sube música/vídeo nuevo, el anterior se borra de Cloudinary.
- Respuesta 200: `{ message }`.

**DELETE /api/juegos/:id**
- Borra imagen, música y vídeo de Cloudinary.
- Respuesta 200: `{ message }`.

---

#### Recomendaciones (`/api/recomendaciones`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/recomendaciones` | USER | Enviar una recomendación |
| GET | `/api/recomendaciones/mis` | USER | Ver mis recomendaciones |
| GET | `/api/recomendaciones` | ADMIN | Ver todas las recomendaciones |
| PUT | `/api/recomendaciones/:id` | ADMIN | Editar título/descripción |
| PUT | `/api/recomendaciones/:id/aprobar` | ADMIN | Aprobar una recomendación |
| DELETE | `/api/recomendaciones/:id` | ADMIN | Rechazar/eliminar una recomendación |

**GET /api/recomendaciones/mis** (usuario)
- Devuelve las recomendaciones del usuario autenticado ordenadas por `id DESC` (más recientes primero).

**GET /api/recomendaciones** (admin)
- Devuelve todas ordenadas por `donor_tier` (arcade → coleccionista → visitante → none) e `id DESC`.
- Incluye: `id, titulo, descripcion, estado, usuario_id, username, donor_tier, primer_arcade`.

---

#### Pagos (`/api/pagos`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/pagos/crear-sesion` | Opcional | Crear sesión Stripe Checkout |
| POST | `/api/pagos/confirmar` | Opcional | Confirmar pago y actualizar tier |

**Tiers por cantidad donada:**
| Cantidad | Tier |
|---|---|
| $1 – $9 | visitante |
| $10 – $24 | coleccionista |
| $25+ | arcade |

**POST /api/pagos/crear-sesion**
- Body: `{ amount: 1-10000 }`
- Responde con `{ url }` de Stripe Checkout. Redirige automáticamente a `success.html` si el pago se completa.

**POST /api/pagos/confirmar**
- Body: `{ sessionId }`
- Valida `payment_status === 'paid'`. Evita duplicados por `stripe_session_id`.
- Actualiza `donor_tier` del usuario (solo sube, nunca baja).
- Registra la donación en la tabla `donaciones`.
- Respuesta 200: `{ message, tier, amount }` con el tier obtenido y la cantidad en euros.

---

### Frontend — Páginas implementadas

#### Módulos compartidos

**`JS/config.js`**
Define `API_BASE` detectando el hostname: si es localhost usa `http://localhost:3000`; en producción usa cadena vacía `''` (las llamadas van a la misma URL que sirve el frontend, ya que Express sirve ambos desde el mismo servidor).

**`JS/nav.js`**
Inyecta la barra de navegación en todas las páginas mediante `renderNav(pageName)`. Muestra el enlace "Panel admin" únicamente si el rol guardado en `localStorage` es `ADMIN`. La función `logout()` limpia el `localStorage` y redirige a `login.html`.

---

#### `login.html` / `login.js`
Página de acceso a la aplicación. Incluye cuatro tabs:
- **Iniciar sesión**: email y contraseña → JWT, redirige según rol.
- **Registrarse**: username, email, contraseña → envío de código de verificación.
- **Verificar cuenta**: inputs de código 6 dígitos con auto-avance, backspace y paste.
- **Recuperar contraseña**: email → envío de enlace de reset.

#### `index.html` / `index.js`
Página principal pública:
- Contador dinámico de juegos en el museo.
- Grilla de 12 portadas de juegos.
- Formulario de recomendación para usuarios autenticados.

#### `museo.html` / `museo.js`
Motor raycasting 2.5D. Ver sección detallada más abajo.

#### `admin.html` / `admin.js`
Panel de administración protegido (solo `ADMIN`). Tres tabs:
- **Juegos**: tabla con imagen, título, indicadores de media; formulario de creación/edición multipart.
- **Recomendaciones**: lista ordenada por tier, acciones aprobar/editar/eliminar.
- **Usuarios**: lista con cambio de rol y eliminación.

#### `support.html` / `support.js`
Página de donaciones con tres tiers predefinidos y campo personalizado. Llama a `/api/pagos/crear-sesion` y redirige a Stripe Checkout.

#### `perfil.html` / `perfil.js`
Perfil del usuario autenticado:
- Editar username directamente.
- Cambiar email o contraseña con confirmación por código OTP de 6 dígitos.

#### `success.html`
Página de confirmación post-pago. Lee `?session_id=` y `?amount=` de la URL, llama a `/api/pagos/confirmar` y muestra el tier obtenido.

#### `reset-password.html`
Formulario para establecer nueva contraseña. Lee `?token=` de la URL y llama a `/api/auth/reset-password`.

#### `us.html`
Página estática "Quiénes somos".

---

### Motor del museo — `museo.js`

El museo virtual está implementado íntegramente en JavaScript usando la **Canvas API** sin ninguna librería externa.

#### Algoritmo raycasting (DDA)

Se implementa el algoritmo **Digital Differential Analyzer (DDA)**, la misma técnica que usa Wolfenstein 3D y Doom. Por cada columna de píxeles del canvas se lanza un rayo desde la posición del jugador. El algoritmo calcula con qué celda del mapa colisiona y a qué distancia perpendicular, obteniendo la altura de pared que debe dibujar en esa columna. La distancia perpendicular (en lugar de euclidiana) evita el efecto ojo de pez.

#### Generación procedural del mapa

El laberinto se genera mediante un **algoritmo de retroceso recursivo** (recursive backtracker). Con paso de cuadrícula 3, produce salas de 2×2 celdas y pasillos de 2 celdas de ancho. El tamaño del mapa crece automáticamente según el número de juegos cargados desde la API.

#### Orden de los cuadros

Antes de construir el mapa, el array de juegos recibido de la API se baraja mediante el algoritmo **Fisher-Yates**. De este modo cada visita al museo muestra los juegos en un orden distinto, evitando que la disposición sea siempre la misma.

#### Sistema de cuadros

Tras generar el mapa se detectan todas las caras de muro con celda transitable adyacente. Los juegos con imagen se asignan a estas caras. Un LUT indexado por `(celda_x, celda_y, side, step)` permite identificar en O(1) si la columna renderizada pertenece a un cuadro. La coordenada horizontal se corrige según la dirección del rayo para evitar espejo horizontal.

#### Marco de cuadro

Los cuadros se renderizan con un marco biselado en múltiples bandas de color: lado izquierdo iluminado (nogal cálido con destello dorado), lado derecho en sombra, moldurón superior con arista dorada, moldurón inferior oscuro y sombra proyectada de 5px bajo el cuadro.

#### Sistema de audio

Al acercarse a un cuadro con música asociada, el audio sube progresivamente de volumen (fade in). Al alejarse, baja hasta silenciarse (fade out). Solo suena un track simultáneamente.

#### Sistema de diálogo

Al entrar en el radio de proximidad aparece un panel con el título y la descripción con efecto **typewriter**. El botón **[R] Leer más** abre un overlay con el texto completo. El botón **[E]** abre el vídeo del juego en una pestaña nueva.

#### Colisión y movimiento

La colisión usa un **AABB** con margen de 0.22 unidades verificando las 4 esquinas del jugador, permitiendo deslizamiento suave a lo largo de paredes.

| Tecla | Acción |
|---|---|
| `W` / `↑` | Avanzar |
| `S` / `↓` | Retroceder |
| `A` | Strafe izquierda |
| `D` | Strafe derecha |
| `←` / `→` | Girar |
| `R` | Abrir/cerrar texto completo |
| `E` | Ver vídeo del juego |

#### Texturas procedurales

Las texturas de ladrillo se generan en tiempo de ejecución con una paleta de grises cálidos y juntas de mortero. Se generan dos versiones (clara y oscura) para simular iluminación lateral.

---

## Seguridad

### Autenticación y autorización
- Las contraseñas se almacenan cifradas con **bcrypt** (factor de coste 10). Nunca se guarda la contraseña en claro.
- El inicio de sesión devuelve un **JWT** firmado con `JWT_SECRET` y con expiración de 8 horas. El token se guarda en `localStorage` del navegador.
- Todas las rutas protegidas verifican el JWT mediante los middlewares `verifyToken` y `verifyAdmin` antes de ejecutar ninguna lógica.
- El email `SUPER_ADMIN_EMAIL` está protegido contra cambio de rol y eliminación.

**Middlewares de autenticación:**
- `verifyToken` — extrae y verifica el JWT del header `Authorization: Bearer <token>`. Inyecta `req.user`.
- `verifyAdmin` — aplica `verifyToken` y además comprueba que `req.user.role === 'ADMIN'`.
- `optionalAuth` — middleware en `/api/pagos`: extrae el usuario del JWT si está presente, pero no falla si no hay token. Permite donaciones anónimas y autenticadas con el mismo endpoint.

### Verificación de email
El registro requiere verificar la cuenta antes de poder iniciar sesión. El flujo es:
1. El usuario se registra → se genera un código de 6 dígitos válido 15 minutos.
2. El código se envía por email (plantilla HTML con Nodemailer + Brevo).
3. El usuario introduce el código → la cuenta se activa (`email_verified=1`).
4. Si el código caduca, puede solicitar uno nuevo con `/api/auth/reenviar`.

### Cambio de email y contraseña (OTP)
Para cambiar email o contraseña desde el perfil, se requiere un segundo factor:
1. El usuario solicita el cambio → se genera un código OTP de 6 dígitos válido 15 minutos.
2. El código se envía al email actual del usuario.
3. El usuario confirma con el código → el cambio se aplica.

### Política de contraseñas
Las contraseñas deben cumplir los siguientes requisitos, validados tanto en el frontend (feedback inmediato) como en el backend (fuente de verdad):
- Mínimo 8 caracteres.
- Al menos una letra mayúscula.
- Al menos una letra minúscula.
- Al menos un número.

Regex utilizado en backend: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`

### Almacenamiento de imágenes en la nube (Cloudinary)
Las imágenes de los juegos se almacenan en **Cloudinary** en lugar del disco del servidor. El flujo es:

1. Multer recibe el archivo y lo guarda temporalmente en `uploads/`.
2. El servidor sube la imagen a Cloudinary (carpeta `museo-videojuegos`) y obtiene una URL pública con CDN.
3. El archivo temporal se elimina del disco inmediatamente.
4. La URL de Cloudinary se guarda en la columna `imagen` de la base de datos.

Al eliminar o reemplazar un juego, imagen, música y vídeo se borran de Cloudinary mediante su API. El servidor no guarda ningún archivo multimedia de forma permanente en disco.

### Límites de subida de archivos
Los archivos multimedia subidos al museo pasan por dos validaciones en el servidor:

1. **Tipo MIME**: se comprueba que el campo `imagen` reciba una imagen, `musica` un audio y `video` un vídeo.
2. **Tamaño máximo por tipo**:

| Campo | Límite |
|---|---|
| `imagen` | 5 MB |
| `musica` | 20 MB |
| `video` | 200 MB |

### Rate limiting (protección contra abuso)
Se aplican tres niveles de límite de peticiones por IP mediante `express-rate-limit`:

| Limiter | Límite | Ventana | Rutas afectadas |
|---|---|---|---|
| `authLimiter` | 10 peticiones | 15 minutos | Registro, login, verificación, recuperación |
| `writeLimiter` | 30 peticiones | 15 minutos | Recomendaciones, cambios de perfil, pagos |
| `globalLimiter` | 200 peticiones | 15 minutos | Toda la API |

---

## Despliegue

La aplicación se despliega en **Railway** usando la CLI oficial.

### Proveedor
- **Railway** — plataforma PaaS que ejecuta el servidor Node.js en un contenedor Docker.
- Deploy mediante CLI: `railway up` desde la raíz del proyecto.
- Railway detecta el comando de inicio definido en `railway.json` (`node backend/app.js`).

### railway.json
```json
{
  "deploy": {
    "startCommand": "node backend/app.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### Variables de entorno en producción
Las mismas variables del `.env` local se configuran en el panel de Railway (Settings → Variables).

### Filesystem efímero
Railway usa un sistema de archivos **efímero**: todo lo escrito en disco se pierde al reiniciar o redesplegar el contenedor. Por este motivo **toda la multimedia** (imagen, música y vídeo) se almacena en **Cloudinary** y no en `uploads/`.

### Frontend
El frontend (HTML/CSS/JS estático) lo sirve el propio servidor Express desde la carpeta `frontend/` como archivos estáticos.

## Conclusiones
*(Por completar al finalizar el proyecto)*
