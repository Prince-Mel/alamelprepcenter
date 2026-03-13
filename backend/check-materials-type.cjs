const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMaterials() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    const [rows] = await connection.execute('SELECT id, title, approved, uploaded_by, course_id, type FROM materials');
    console.table(rows);

  } catch (error) {
    console.error(error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkMaterials();
