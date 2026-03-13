import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

async function check() {
  try {
    const [rows] = await pool.execute('SELECT * FROM enrollments');
    console.log('Enrollments:', JSON.stringify(rows, null, 2));
    const [courses] = await pool.execute('SELECT id, name FROM courses');
    console.log('Courses:', JSON.stringify(courses, null, 2));
    const [users] = await pool.execute('SELECT id, name, role FROM users');
    console.log('Users:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
