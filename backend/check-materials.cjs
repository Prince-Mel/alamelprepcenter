const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMaterials() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    console.log('Connection successful.');

    console.log('Querying `materials` table...');
    const [rows] = await connection.execute('SELECT id, title, approved, uploaded_by, course_id FROM materials');

    console.log('--- RAW DATABASE RESULTS ---');
    if (rows.length === 0) {
      console.log('The `materials` table is empty. No materials have been uploaded or saved correctly.');
    } else {
      console.table(rows);
      console.log('--- DATA TYPE ANALYSIS ---');
      rows.forEach(row => {
        console.log(`- Row ID ${row.id}:`);
        console.log(`  - title: "${row.title}"`);
        console.log(`  - approved: ${row.approved} (Type: ${typeof row.approved})`);
        console.log(`  - uploaded_by: "${row.uploaded_by}"`);
        console.log(`  - course_id: "${row.course_id}"`);
      });
      console.log('Diagnosis: Check the `approved` column. It should be a number (1 for true, 0 for false). If it is `null` or another value, the INSERT/UPDATE logic is flawed.');
    }
    console.log('--------------------------');

  } catch (error) {
    console.error('--- DIAGNOSIS FAILED ---');
    console.error('An error occurred:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Diagnosis: The database connection was refused. Is the database server running and accessible with the provided .env credentials?');
    }
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Diagnosis: Access denied. Check the DB_USER, DB_PASS, and DB_HOST in your .env file.');
    }
    if (error.code === 'ER_BAD_DB_ERROR') {
        console.error(`Diagnosis: The database "${process.env.DB_NAME}" does not exist. Check the DB_NAME in your .env file.`);
    }
    console.error('------------------------');
  } finally {
    if (connection) {
      console.log('Closing database connection.');
      await connection.end();
    }
  }
}

checkMaterials();
