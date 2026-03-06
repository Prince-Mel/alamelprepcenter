import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function heal() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Healing student records...');
    const [result] = await connection.query('UPDATE users SET created_by = "ADMIN" WHERE created_by IS NULL AND role = "student"');
    console.log(`Healed ${result.affectedRows} student records.`);
  } catch (err) {
    console.error('Heal failed:', err.message);
  } finally {
    await connection.end();
  }
}

heal();
