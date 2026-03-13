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
      { id: 'CRS1772824087260', name: 'English Language', code: 'ENG101', instructor: 'Admin', color: 'bg-blue-500', image: '/english-language.png' },
      { id: 'CRS1772810500000', name: 'Mathematics', code: 'MATH101', instructor: 'Dr. Smith', color: 'bg-red-500', image: '/course-placeholder.svg' },
      { id: 'CRS1772824129455', name: 'OWOP', code: 'OWO101', instructor: 'Admin', color: 'bg-green-500', image: '/owop.png' }
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
