CREATE DATABASE museo_videojuegos;
USE museo_videojuegos;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('USER','ADMIN') DEFAULT 'USER',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  verification_token VARCHAR(255) DEFAULT NULL,
  donor_tier ENUM('none','visitante','coleccionista','arcade') NOT NULL DEFAULT 'none'
);

-- Migración para bases de datos existentes:
-- ALTER TABLE usuarios ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE usuarios ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL;
-- UPDATE usuarios SET email_verified = 1; -- marcar usuarios existentes como verificados
-- ALTER TABLE usuarios ADD COLUMN donor_tier ENUM('none','visitante','coleccionista','arcade') NOT NULL DEFAULT 'none';

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
  primer_arcade TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Migración para bases de datos existentes:
-- ALTER TABLE recomendaciones ADD COLUMN primer_arcade TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE cambios_pendientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo ENUM('email','password') NOT NULL,
  nuevo_email VARCHAR(100) DEFAULT NULL,
  nuevo_hash VARCHAR(255) DEFAULT NULL,
  codigo VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Migración para bases de datos existentes:
-- CREATE TABLE cambios_pendientes (id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, tipo ENUM('email','password') NOT NULL, nuevo_email VARCHAR(100) DEFAULT NULL, nuevo_hash VARCHAR(255) DEFAULT NULL, codigo VARCHAR(6) NOT NULL, expires_at DATETIME NOT NULL, used TINYINT(1) NOT NULL DEFAULT 0, FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE);

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Migración para bases de datos existentes:
-- CREATE TABLE password_resets (id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, token VARCHAR(64) NOT NULL UNIQUE, expires_at DATETIME NOT NULL, used TINYINT(1) NOT NULL DEFAULT 0, FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE);

CREATE TABLE donaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT DEFAULT NULL,
  stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
  amount INT NOT NULL,
  tier ENUM('visitante','coleccionista','arcade') NOT NULL,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Migración para bases de datos existentes:
-- CREATE TABLE donaciones (id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT DEFAULT NULL, stripe_session_id VARCHAR(255) NOT NULL UNIQUE, amount INT NOT NULL, tier ENUM('visitante','coleccionista','arcade') NOT NULL, created_at DATETIME DEFAULT NOW(), FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL);
