import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addGlobalCourse() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Adding GLOBAL course...');
    // Insert 'GLOBAL' course if not exists
    await connection.execute(
      `INSERT IGNORE INTO courses (id, name, code, instructor, color, image) VALUES (?, ?, ?, ?, ?, ?)`,
      ['GLOBAL', 'Global Content', 'GLB000', 'System Admin', 'gray', '']
    );
    console.log('GLOBAL course added/verified.');

  } catch (err) {
    console.error('Failed to add GLOBAL course:', err.message);
  } finally {
    await connection.end();
  }
}

addGlobalCourse();