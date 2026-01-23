# Museo virtual de videojuegos

## Introducción
En este proyecto se desarrolla un **museo virtual de videojuegos en entorno web**, donde el usuario puede recorrer un espacio interactivo, inspirado en los videojuegos clásicos como *Doom*. A lo largo del museo se muestran diferentes juegos representados en forma de cuadros, y al acercarse a ellos se puede consultar información, escuchar la banda sonora y visualizar fragmentos del juego.

La web no solo permite visitar el museo, sino que también incluye una forma de **gestión de usuarios**, teniendo tanto usuarios como administradores. Los usuarios pueden recomendar nuevos videojuegos para el museo, mientras que los administradores pueden gestionar el contenido que se muestra en este.

Este proyecto se realiza como **proyecto final del ciclo formativo de Desarrollo de Aplicaciones Web (DAW)**, aplicando los conocimientos adquiridos tanto en frontend como en backend, bases de datos y despliegue de aplicaciones web.

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

## Tecnologías utilizadas

### Frontend

- HTML5 para la estructura de la web.
- CSS3 para el diseño.
- JavaScript para la interacción.
- Canvas para la creación del museo virtual.

### Backend

- Node.js como entorno.
- Express para la creación de la API.
- JSON Web Tokens (JWT) para la autenticación de usuarios.
- bcrypt para el cifrado de contraseñas.

### Base de datos

- MySQL para almacenar usuarios, videojuegos y recomendaciones.

### Herramientas adicionales

- GitHub para control de versiones.
- Plataformas de hosting para el despliegue del frontend, backend y base de datos (por decidir).

## Análisis y diseño
### Casos de uso

#### Usuario no registrado
- Acceder a la página principal
- Acceder a la sección "Quiénes somos"
- Registrarse en la aplicación
- Iniciar sesión
- Visualizar información general del proyecto

#### Usuario registrado
- Iniciar sesión
- Cerrar sesión
- Acceder al museo virtual
- Moverse por el museo mediante controles WASD
- Visualizar la información de los juegos al acercarse a un cuadro
- Reproducir la música asociada a un juego
- Visualizar un vídeo de gameplay del juego
- Enviar una recomendación de juego al museo

#### Administrador
- Iniciar sesión como administrador
- Acceder al panel de administración
- Añadir un nuevo juego al museo
- Editar la información de un juego existente
- Eliminar un juego del museo
- Subir contenido multimedia (imágenes, música y vídeos)
- Aprobar o rechazar recomendaciones de usuarios
- Gestionar usuarios (visualizar usuarios registrados)

### Modelo de datos
## Desarrollo
## Despliegue
## Conclusiones
