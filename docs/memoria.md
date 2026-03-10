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
- Plataformas de hosting para el despliegue (por definir).

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
│   ├── index.html              # Página principal (pendiente)
│   ├── museo.html              # Museo virtual Canvas (pendiente)
│   ├── admin.html              # Panel de administración (pendiente)
│   ├── CSS/                    # Hojas de estilo (pendiente)
│   ├── JS/                     # Scripts de cliente (pendiente)
│   └── assets/                 # Recursos estáticos
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

### API REST — Endpoints implementados (juegos)

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

### API REST — Endpoints implementados (recomendaciones y usuarios)

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
- Header: `Authorization: Bearer <token>` (solo ADMIN).
- Cambia `estado` de `'pendiente'` a `'aprobado'`.
- Respuesta 200: `{ message: "Recomendación aprobada" }`.
- Errores: 404, 401, 403, 500.

**DELETE /api/recomendaciones/:id**
- Header: `Authorization: Bearer <token>` (solo ADMIN).
- Elimina la recomendación de la BD.
- Respuesta 200: `{ message: "Recomendación eliminada" }`.
- Errores: 404, 401, 403, 500.

#### Usuarios (`/api/usuarios`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | ADMIN | Listar todos los usuarios |

**GET /api/usuarios**
- Header: `Authorization: Bearer <token>` (solo ADMIN).
- Devuelve `id, username, email, role` de todos los usuarios (sin `password`), ordenados por id.
- Respuesta 200: array de usuarios.
- Errores: 401, 403, 500.

---

### Frontend — Páginas implementadas

#### `login.html`
Página de acceso a la aplicación. Incluye:
- Tab **Iniciar sesión**: formulario con email y contraseña. Llama a `POST /api/auth/login`, guarda el token y datos del usuario en `localStorage` y redirige según el rol (`museo.html` para USER, `admin.html` para ADMIN).
- Tab **Registrarse**: formulario con username, email y contraseña. Llama a `POST /api/auth/register` y redirige automáticamente al tab de login.
- Si el usuario ya tiene sesión activa al entrar, redirige directamente.

---

## Despliegue
*(Por definir)*

## Conclusiones
*(Por completar al finalizar el proyecto)*
