import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const courses = [
      { id: 'CRS001', name: 'Mathematics', code: 'MATH101', instructor: 'Dr. Smith', color: 'blue', image: '' },
      { id: 'CRS002', name: 'Physics', code: 'PHYS101', instructor: 'Dr. Jones', color: 'green', image: '' },
      { id: 'CRS003', name: 'Chemistry', code: 'CHEM101', instructor: 'Dr. Brown', color: 'red', image: '' },
      { id: 'CRS004', name: 'Biology', code: 'BIO101', instructor: 'Dr. White', color: 'yellow', image: '' }
    ];

    console.log('Seeding courses...');
    for (const course of courses) {
      await connection.execute(
        'INSERT IGNORE INTO courses (id, name, code, instructor, color, image) VALUES (?, ?, ?, ?, ?, ?)',
        [course.id, course.name, course.code, course.instructor, course.color, course.image]
      );
    }
    console.log('Courses seeded successfully.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await connection.end();
  }
}

seed();