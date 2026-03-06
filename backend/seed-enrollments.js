import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seedEnrollments() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const enrollments = [
      { studentId: 'STU001', courseId: 'CRS001' },
      { studentId: 'STU7312', courseId: 'CRS001' },
      { studentId: 'STU001', courseId: 'CRS002' }
    ];

    console.log('Seeding enrollments...');
    for (const e of enrollments) {
      await connection.execute(
        'INSERT IGNORE INTO enrollments (student_id, course_id) VALUES (?, ?)',
        [e.studentId, e.courseId]
      );
    }
    console.log('Enrollments seeded successfully.');

  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await connection.end();
  }
}

seedEnrollments();