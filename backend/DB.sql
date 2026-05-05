CREATE DATABASE museo_videojuegos;
USE museo_videojuegos;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('USER','ADMIN') DEFAULT 'USER',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  verification_token VARCHAR(255) DEFAULT NULL
);

-- Migración para bases de datos existentes:
-- ALTER TABLE usuarios ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE usuarios ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL;
-- UPDATE usuarios SET email_verified = 1; -- marcar usuarios existentes como verificados

CREATE TABLE juegos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  imagen VARCHAR(255),
  video_url VARCHAR(255),
  musica_url VARCHAR(255),
  pos_x FLOAT,
  pos_y FLOAT,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

CREATE TABLE recomendaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(100),
  descripcion TEXT,
  usuario_id INT,
  estado ENUM('pendiente','aprobado') DEFAULT 'pendiente',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
