import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkEnrollments() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM enrollments');
    console.log('--- Current Enrollments ---');
    console.table(rows);
    
    const [students] = await connection.execute('SELECT id, name FROM users WHERE role = "student"');
    console.log('--- Students ---');
    console.table(students);

  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await connection.end();
  }
}

checkEnrollments();