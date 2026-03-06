const mysql = require('mysql2/promise');
require('dotenv').config();

const alterStatements = [
  `ALTER TABLE enrollments DROP FOREIGN KEY enrollments_ibfk_1;`,
  `ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_users FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;`,
  `ALTER TABLE results DROP FOREIGN KEY results_ibfk_1;`,
  `ALTER TABLE results ADD CONSTRAINT fk_results_users FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;`,
  `ALTER TABLE announcements DROP FOREIGN KEY announcements_ibfk_1;`,
  `ALTER TABLE announcements ADD CONSTRAINT fk_announcements_users FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;`,
  `ALTER TABLE activity_log DROP FOREIGN KEY activity_log_ibfk_1;`,
  `ALTER TABLE activity_log ADD CONSTRAINT fk_activity_log_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;`
];

async function updateSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('Applying schema updates for ON UPDATE CASCADE...');
    for (const statement of alterStatements) {
      try {
        await connection.query(statement);
        console.log(`SUCCESS: ${statement}`);
      } catch (error) {
        // We can ignore errors if the constraint or table doesn't exist, etc.
        console.warn(`WARNING: Could not execute: ${statement}. This might be okay if the schema is already updated. Error: ${error.message}`);
      }
    }
    console.log('Schema update process complete.');
  } catch (err) {
    console.error('Schema update failed:', err.message);
  } finally {
    await connection.end();
  }
}

updateSchema();
