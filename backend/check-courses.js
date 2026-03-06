import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM courses');
    console.log('--- Current Courses in Database ---');
    console.table(rows);
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await connection.end();
  }
}

check();