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
    // Add ADMIN if missing
    await connection.execute("INSERT IGNORE INTO users (id, name, password, role, status) VALUES ('ADMIN', 'SYSTEM ADMINISTRATOR', 'admin123', 'admin', 'active')");
    
    // Add TEST STUDENT if missing
    await connection.execute("INSERT IGNORE INTO users (id, name, password, role, status) VALUES ('STU001', 'TEST STUDENT', 'student123', 'student', 'active')");

    const [rows] = await connection.execute('SELECT id, name, password, role FROM users');
    console.log('--- Current Users in Database ---');
    console.table(rows);
    
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await connection.end();
  }
}

check();
