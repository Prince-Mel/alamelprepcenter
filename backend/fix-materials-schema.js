import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Modifying materials table...');
    // Change `url` to LONGTEXT
    await connection.query('ALTER TABLE materials MODIFY COLUMN url LONGTEXT');
    console.log('materials.url converted to LONGTEXT.');
    
    // While we are at it, ensure description is also sufficient, though TEXT is usually enough for desc.
    
  } catch (err) {
    console.error('Fix failed:', err.message);
  } finally {
    await connection.end();
  }
}

fix();