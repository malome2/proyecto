const mysql = require('./backend/node_modules/mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'yamanote.proxy.rlwy.net',
    port: 13013,
    user: 'root',
    password: 'cNtxinuSaZRfqPPyKxBksHwAdSQXZJRv',
    database: 'railway'
  });

  const [result] = await conn.query(
    "UPDATE usuarios SET role='ADMIN' WHERE email='malome2@jviladoms.cat'"
  );
  console.log('Filas actualizadas:', result.affectedRows);
  await conn.end();
}

main().catch(console.error);
