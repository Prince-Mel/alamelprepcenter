import mysql from 'mysql2/promise';

const localConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'student_app'
};

const cloudConfig = {
  host: 'yamabiko.proxy.rlwy.net',
  port: 48079,
  user: 'root',
  password: 'eLfTUyLYovLyzXHcbKgsBhLsFGreewbt',
  database: 'railway',
  multipleStatements: true
};

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'sub-admin', 'student') NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_code VARCHAR(50),
    email VARCHAR(255),
    contact VARCHAR(50),
    created_by VARCHAR(50),
    details JSON
);

CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    instructor VARCHAR(255),
    color VARCHAR(50),
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
    student_id VARCHAR(50),
    course_id VARCHAR(50),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    type ENUM('quiz', 'examination', 'assignment') NOT NULL,
    marking_type ENUM('auto', 'manual') DEFAULT 'auto',
    submission_mode ENUM('online', 'file') DEFAULT 'online',
    mode ENUM('objectives', 'written', 'integrated', 'file_upload') DEFAULT 'objectives',
    duration INT DEFAULT 30,
    start_date DATETIME,
    end_date DATETIME,
    structured_questions JSON,
    question_file_url LONGTEXT,
    question_file_name VARCHAR(255),
    assigned_student_ids JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS results (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50),
    assessment_id VARCHAR(50),
    score DECIMAL(5,2) DEFAULT 0,
    correct_answers INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    status ENUM('pending', 'released') DEFAULT 'pending',
    answers JSON,
    student_file JSON,
    feedback TEXT,
    manual_marking JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255),
    file_size VARCHAR(50),
    url LONGTEXT,
    uploaded_by VARCHAR(50),
    approved BOOLEAN DEFAULT FALSE,
    assigned_student_ids JSON,
    date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50),
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'individual',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registration_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    role VARCHAR(50),
    admin_code VARCHAR(50),
    details JSON,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
`;

async function migrate() {
  let localConn, cloudConn;
  try {
    console.log('Connecting to databases...');
    localConn = await mysql.createConnection(localConfig);
    cloudConn = await mysql.createConnection(cloudConfig);

    console.log('Initializing Cloud Schema...');
    // Drop existing tables to start fresh with correct schema
    const dropTables = [
      'activity_log', 'registration_requests', 'announcements', 
      'materials', 'results', 'assessments', 'enrollments', 
      'courses', 'users'
    ];
    await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of dropTables) {
      await cloudConn.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    await cloudConn.query(schema);
    console.log('Cloud Schema Initialized.');

    const tables = [
      'users', 
      'courses', 
      'enrollments', 
      'materials', 
      'assessments', 
      'results', 
      'announcements', 
      'registration_requests', 
      'activity_log'
    ];

    for (const table of tables) {
      console.log(`Migrating table: ${table}...`);
      
      const [rows] = await localConn.execute(`SELECT * FROM ${table}`);
      console.log(`  Found ${rows.length} rows in ${table}`);

      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });
        await cloudConn.execute(sql, values);
      }
      
      console.log(`  Successfully migrated ${rows.length} rows to ${table}`);
    }

    await cloudConn.execute(`SET FOREIGN_KEY_CHECKS = 1`);
    console.log('--- Migration Complete! ---');

  } catch (err) {
    console.error('Migration Failed:', err.message);
  } finally {
    if (localConn) await localConn.end();
    if (cloudConn) await cloudConn.end();
  }
}

migrate();
