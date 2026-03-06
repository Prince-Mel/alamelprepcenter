import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const [columns] = await connection.query('DESCRIBE users');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('admin_code')) {
      console.log('Adding admin_code...');
      await connection.query('ALTER TABLE users ADD COLUMN admin_code VARCHAR(50)');
    }
    if (!columnNames.includes('email')) {
      console.log('Adding email...');
      await connection.query('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
    }
    if (!columnNames.includes('contact')) {
      console.log('Adding contact...');
      await connection.query('ALTER TABLE users ADD COLUMN contact VARCHAR(50)');
    }
    if (!columnNames.includes('created_by')) {
      console.log('Adding created_by...');
      await connection.query('ALTER TABLE users ADD COLUMN created_by VARCHAR(50)');
    }
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrate();
