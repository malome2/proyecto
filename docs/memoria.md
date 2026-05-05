# Museo virtual de videojuegos

## Introducción
En este proyecto se desarrolla un **museo virtual de videojuegos en entorno web**, donde el usuario puede recorrer un espacio interactivo, inspirado en los videojuegos clásicos como *Doom*. A lo largo del museo se muestran diferentes juegos representados en forma de cuadros, y al acercarse a ellos se puede consultar información, escuchar la banda sonora y visualizar fragmentos del juego.

La web no solo permite visitar el museo, sino que también incluye una forma de **gestión de usuarios**, teniendo tanto usuarios como administradores. Los usuarios pueden recomendar nuevos videojuegos para el museo, mientras que los administradores pueden gestionar el contenido que se muestra en este.

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
- Añadir un sistema de registro e inicio de sesión.
- Diferenciar entre usuarios normales y administradores.
- Permitir a los usuarios enviar recomendaciones.
- Permitir a los administradores añadir, modificar y eliminar el contenido del museo.
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

### Base de datos
- **MySQL** para almacenar usuarios, videojuegos y recomendaciones.
- **mysql2** como driver de conexión desde Node.js.

### Herramientas adicionales
- **Git / GitHub** para el control de versiones.
- **dotenv** para la gestión de variables de entorno.
- **express-rate-limit** para la protección contra abuso de la API.
- **Cloudinary** para el almacenamiento de imágenes en la nube con CDN.

---

## Análisis y diseño

### Casos de uso

#### Usuario no registrado
- Acceder a la página principal.
- Acceder a la sección "Quiénes somos".
- Registrarse en la aplicación.
- Iniciar sesión.
- Visualizar información general del proyecto.

#### Usuario registrado
- Iniciar sesión y cerrar sesión.
- Acceder al museo virtual.
- Moverse por el museo mediante controles WASD.
- Visualizar la información de los juegos al acercarse a un cuadro.
- Reproducir la música asociada a un juego.
- Visualizar un vídeo de gameplay del juego.
- Enviar una recomendación de juego al museo.

#### Administrador
- Iniciar sesión como administrador.
- Acceder al panel de administración.
- Añadir un nuevo juego al museo.
- Editar la información de un juego existente.
- Eliminar un juego del museo.
- Subir contenido multimedia (imagen, música y vídeo).
- Aprobar o rechazar recomendaciones de usuarios.
- Visualizar la lista de usuarios registrados.

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

### Tabla `juegos`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT PK AUTO_INCREMENT | Identificador único |
| titulo | VARCHAR(100) NOT NULL | Título del videojuego |
| descripcion | TEXT | Descripción del juego |
| imagen | VARCHAR(255) | Ruta de la imagen del juego |
| video_url | VARCHAR(255) | URL o ruta del vídeo de gameplay |
| musica_url | VARCHAR(255) | URL o ruta del archivo de música |
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

---

## Desarrollo

### Estructura del proyecto

```
final/
├── backend/
│   ├── app.js                  # Punto de entrada del servidor
│   ├── config/
│   │   └── db.js               # Pool de conexión MySQL
│   ├── middleware/
│   │   └── auth.js             # Middlewares JWT (verifyToken, verifyAdmin)
│   ├── routes/
│   │   ├── auth.routes.js              # Rutas de autenticación
│   │   ├── juegos.routes.js            # Rutas de juegos (CRUD + multer)
│   │   ├── recomendaciones.routes.js   # Rutas de recomendaciones
│   │   └── usuarios.routes.js          # Rutas de usuarios
│   ├── uploads/                # Archivos subidos (imágenes, música, vídeos)
│   ├── .env                    # Variables de entorno (no versionado)
│   ├── DB.sql                  # Script de creación de la base de datos
│   └── package.json
├── frontend/
│   ├── login.html              # Página de login y registro
│   ├── index.html              # Página principal
│   ├── museo.html              # Museo virtual 2.5D
│   ├── admin.html              # Panel de administración
│   ├── support.html            # Página de donaciones
│   ├── us.html                 # Página "Quiénes somos"
│   ├── CSS/
│   │   ├── base.css            # Reset y variables globales
│   │   ├── nav.css             # Barra de navegación
│   │   ├── index.css           # Estilos página principal
│   │   ├── login.css           # Estilos login/registro
│   │   ├── museo.css           # Estilos del museo y canvas
│   │   ├── support.css         # Estilos página donaciones
│   │   ├── ui.css              # Componentes reutilizables
│   │   └── us.css              # Estilos "Quiénes somos"
│   ├── JS/
│   │   ├── config.js           # API_BASE (autodetecta localhost vs producción)
│   │   ├── nav.js              # renderNav(), logout()
│   │   ├── login.js            # Lógica login y registro
│   │   ├── index.js            # Lógica página principal
│   │   ├── museo.js            # Motor raycaster 2.5D completo
│   │   └── support.js          # Lógica página donaciones
│   └── img/
│       ├── logo.svg
│       └── icon.svg
└── docs/
    ├── memoria.md              # Este documento
    ├── prompt.txt              # Contexto del proyecto
    └── ER-Final.png            # Diagrama entidad-relación
```

### Variables de entorno requeridas (`.env`)
```
DB_HOST=localhost
DB_USER=<usuario_mysql>
DB_PASS=<contraseña_mysql>
DB_NAME=museo_videojuegos
JWT_SECRET=<clave_secreta_jwt>
```

---

### API REST — Endpoints implementados

#### Autenticación (`/api/auth`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Registra un nuevo usuario |
| POST | `/api/auth/login` | Público | Inicia sesión y devuelve JWT |

**POST /api/auth/register**
- Body: `{ username, email, password }`
- Respuesta 201: `{ message: "Usuario registrado correctamente" }`
- Errores: 400 (campos vacíos), 409 (email ya existe), 500

**POST /api/auth/login**
- Body: `{ email, password }`
- Respuesta 200: `{ token, user: { id, username, role } }`
- Errores: 400 (campos vacíos), 401 (credenciales incorrectas), 500

#### Middleware de autenticación

- `verifyToken` — verifica el JWT del header `Authorization: Bearer <token>`. Añade `req.user` con `{ id, username, role }`.
- `verifyAdmin` — igual que `verifyToken` pero además exige `role === 'ADMIN'`.

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

**GET /api/juegos/:id**
- Respuesta 200: objeto con los datos del juego.
- Errores: 404 (no encontrado), 500.

**POST /api/juegos** — `multipart/form-data`
- Campos de texto: `titulo`* (obligatorio), `descripcion`, `pos_x`, `pos_y`, `video_url` (URL externa).
- Archivos: `imagen`, `musica`, `video`. Se guardan en `uploads/` con nombre único.
- El campo `video` acepta archivo subido O URL externa (`video_url`). El archivo tiene prioridad.
- Respuesta 201: `{ id, message }`.
- Errores: 400 (sin título), 403 (no admin), 500.

**PUT /api/juegos/:id** — `multipart/form-data`
- Solo se actualizan los campos recibidos; los demás conservan su valor anterior.
- Si se sube un archivo nuevo, el archivo anterior se elimina automáticamente del disco.
- Si se envía `video_url` (texto) sin archivo de vídeo, reemplaza la URL anterior.
- Respuesta 200: `{ message }`.
- Errores: 404, 403, 500.

**DELETE /api/juegos/:id**
- Elimina el registro de la BD y borra del disco los archivos locales asociados (imagen, música, vídeo). Las URLs externas no se tocan.
- Respuesta 200: `{ message }`.
- Errores: 404, 403, 500.

---

#### Recomendaciones (`/api/recomendaciones`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/recomendaciones` | USER autenticado | Enviar una recomendación |
| GET | `/api/recomendaciones` | ADMIN | Ver todas las recomendaciones |
| PUT | `/api/recomendaciones/:id/aprobar` | ADMIN | Aprobar una recomendación |
| DELETE | `/api/recomendaciones/:id` | ADMIN | Rechazar/eliminar una recomendación |

**POST /api/recomendaciones**
- Header: `Authorization: Bearer <token>` (usuario autenticado).
- Body: `{ titulo*, descripcion }`.
- Respuesta 201: `{ id, message: "Recomendación enviada correctamente" }`.
- Errores: 400 (sin título), 401 (sin token), 500.

**GET /api/recomendaciones**
- Header: `Authorization: Bearer <token>` (solo ADMIN).
- Respuesta 200: array de recomendaciones con `id, titulo, descripcion, estado, usuario_id, username`, ordenadas por id descendente.
- Errores: 401, 403, 500.

**PUT /api/recomendaciones/:id/aprobar**
- Cambia `estado` de `'pendiente'` a `'aprobado'`.
- Respuesta 200: `{ message: "Recomendación aprobada" }`.
- Errores: 404, 401, 403, 500.

**DELETE /api/recomendaciones/:id**
- Elimina la recomendación de la BD.
- Respuesta 200: `{ message: "Recomendación eliminada" }`.
- Errores: 404, 401, 403, 500.

#### Usuarios (`/api/usuarios`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | ADMIN | Listar todos los usuarios |

**GET /api/usuarios**
- Devuelve `id, username, email, role` de todos los usuarios (sin `password`), ordenados por id.
- Respuesta 200: array de usuarios.
- Errores: 401, 403, 500.

---

### Frontend — Páginas implementadas

#### Módulos compartidos

**`JS/config.js`**
Define `API_BASE` detectando automáticamente si el entorno es local (`http://localhost:3000`) o producción. Así el frontend funciona sin cambios en ambos entornos.

**`JS/nav.js`**
Inyecta la barra de navegación en todas las páginas mediante `renderNav(pageName)`. Muestra el enlace "Panel admin" únicamente si el rol guardado en `localStorage` es `ADMIN`. La función `logout()` limpia el `localStorage` y redirige a `login.html`.

---

#### `login.html`
Página de acceso a la aplicación. Incluye:
- Tab **Iniciar sesión**: formulario con email y contraseña. Llama a `POST /api/auth/login`, guarda el token y datos del usuario en `localStorage` y redirige según el rol (`museo.html` para USER, `admin.html` para ADMIN).
- Tab **Registrarse**: formulario con username, email y contraseña. Llama a `POST /api/auth/register` y redirige automáticamente al tab de login.
- Si el usuario ya tiene sesión activa al entrar, redirige directamente.

#### `index.html`
Página principal pública. Incluye:
- Contador dinámico de juegos en el museo (llama a `GET /api/juegos`).
- Formulario de recomendación de videojuego para usuarios autenticados. Llama a `POST /api/recomendaciones`. Si el usuario no está autenticado, redirige al login.

#### `admin.html`
Panel de administración protegido (solo `ADMIN`). Permite:
- Listar, crear, editar y eliminar juegos del museo con subida de archivos (imagen, música, vídeo).
- Ver y gestionar recomendaciones pendientes (aprobar o rechazar).
- Ver la lista de usuarios registrados.

#### `support.html`
Página de donaciones con información sobre el proyecto y botones de donación. La pasarela de pago no está implementada.

#### `us.html`
Página estática "Quiénes somos" con información del equipo y descripción del proyecto.

---

### Motor del museo — `museo.js`

El museo virtual está implementado íntegramente en JavaScript usando la **Canvas API** sin ninguna librería externa.

#### Algoritmo raycasting (DDA)

Se implementa el algoritmo **Digital Differential Analyzer (DDA)**, la misma técnica que usa Wolfenstein 3D y Doom. Por cada columna de píxeles del canvas se lanza un rayo desde la posición del jugador. El algoritmo calcula con qué celda del mapa colisiona y a qué distancia perpendicular, obteniendo la altura de pared que debe dibujar en esa columna. La distancia perpendicular (en lugar de euclidiana) evita el efecto ojo de pez.

#### Generación procedural del mapa

El laberinto se genera mediante un **algoritmo de retroceso recursivo** (recursive backtracker). Con paso de cuadrícula 3, produce salas de 2×2 celdas y pasillos de 2 celdas de ancho. El tamaño del mapa crece automáticamente según el número de juegos cargados desde la API.

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

---

## Seguridad

### Autenticación y autorización
- Las contraseñas se almacenan cifradas con **bcrypt** (factor de coste 10). Nunca se guarda la contraseña en claro.
- El inicio de sesión devuelve un **JWT** firmado con `JWT_SECRET` y con expiración de 8 horas. El token se guarda en `localStorage` del navegador.
- Todas las rutas protegidas verifican el JWT mediante los middlewares `verifyToken` y `verifyAdmin` antes de ejecutar ninguna lógica.

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
4. La URL de Cloudinary (`https://res.cloudinary.com/...`) se guarda en la columna `imagen` de la base de datos.

Al eliminar o reemplazar un juego, la imagen se borra también de Cloudinary mediante su API. La música y el vídeo siguen almacenándose en `uploads/` del servidor.

Variables de entorno necesarias:
```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Límites de subida de archivos
Los archivos multimedia subidos al museo pasan por dos validaciones en el servidor:

1. **Tipo MIME**: se comprueba que el campo `imagen` reciba una imagen, `musica` un audio y `video` un vídeo. Cualquier otro tipo es rechazado con error 400 antes de guardarse en disco.
2. **Tamaño máximo por tipo**:

| Campo | Límite |
|---|---|
| `imagen` | 5 MB |
| `musica` | 20 MB |
| `video` | 200 MB |

Si un archivo supera el límite se borra automáticamente del disco y se devuelve un error descriptivo al cliente. Esto evita que un administrador (o alguien que haya conseguido un token) pueda llenar el almacenamiento del servidor.

### Rate limiting (protección contra abuso)
Se aplican tres niveles de límite de peticiones por IP mediante `express-rate-limit`:

| Limiter | Límite | Ventana | Rutas afectadas |
|---|---|---|---|
| `authLimiter` | 10 peticiones | 15 minutos | `POST /api/auth/login`, `POST /api/auth/register` |
| `writeLimiter` | 30 peticiones | 15 minutos | `POST /api/recomendaciones` |
| `globalLimiter` | 200 peticiones | 15 minutos | Toda la API (aplicado en `app.js`) |

El `authLimiter` protege contra fuerza bruta en el login (probar contraseñas masivamente). El `writeLimiter` evita el spam de recomendaciones. El `globalLimiter` es la red de seguridad general contra ataques de denegación de servicio.

Las cabeceras estándar `RateLimit-*` se incluyen en las respuestas para que los clientes sepan cuántas peticiones les quedan.

---

## Despliegue
*(Por definir)*

## Conclusiones
*(Por completar al finalizar el proyecto)*
