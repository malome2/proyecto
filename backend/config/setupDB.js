const pool = require('./db');

async function setupDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('USER','ADMIN') DEFAULT 'USER',
        email_verified TINYINT(1) NOT NULL DEFAULT 0,
        verification_token VARCHAR(255) DEFAULT NULL,
        donor_tier ENUM('none','visitante','coleccionista','arcade') NOT NULL DEFAULT 'none'
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS juegos (
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
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS recomendaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(100),
        descripcion TEXT,
        usuario_id INT,
        estado ENUM('pendiente','aprobado') DEFAULT 'pendiente',
        primer_arcade TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS cambios_pendientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo ENUM('email','password') NOT NULL,
        nuevo_email VARCHAR(100) DEFAULT NULL,
        nuevo_hash VARCHAR(255) DEFAULT NULL,
        codigo VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS donaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT DEFAULT NULL,
        stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
        amount INT NOT NULL,
        tier ENUM('visitante','coleccionista','arcade') NOT NULL,
        created_at DATETIME DEFAULT NOW(),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);

    console.log('DB: tablas verificadas/creadas correctamente');
  } finally {
    conn.release();
  }
}

module.exports = setupDB;
