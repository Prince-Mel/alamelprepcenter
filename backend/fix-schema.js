import mysql from 'mysql2/promise';

const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'student_app' });

const [cols] = await c.query('SHOW COLUMNS FROM assessments');
const existing = cols.map(x => x.Field);
console.log('Before:', existing.join(', '));

const addCol = async (name, def, after) => {
  if (existing.includes(name)) { console.log(`SKIP: ${name}`); return; }
  try {
    let sql = `ALTER TABLE assessments ADD COLUMN ${name} ${def}`;
    if (after) sql += ` AFTER ${after}`;
    await c.query(sql);
    console.log(`OK: Added ${name}`);
  } catch (e) { console.log(`FAIL ${name}: ${e.message}`); }
};

await addCol('mode', 'ENUM("objectives","written","integrated","file_upload") DEFAULT "objectives"', 'submission_mode');
await addCol('duration', 'INT DEFAULT 30', 'timer');
await addCol('start_date', 'DATETIME DEFAULT NULL', 'duration');
await addCol('end_date', 'DATETIME DEFAULT NULL', 'start_date');
await addCol('assigned_student_ids', 'JSON DEFAULT NULL', 'end_date');
await addCol('question_file_name', 'VARCHAR(255) DEFAULT NULL', 'question_file_url');

await c.query('UPDATE assessments SET duration = timer WHERE (duration IS NULL OR duration = 0) AND timer > 0');

const [cols2] = await c.query('SHOW COLUMNS FROM assessments');
console.log('After:', cols2.map(x => x.Field).join(', '));
await c.end();
