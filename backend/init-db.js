import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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
    created_by VARCHAR(50)
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

INSERT IGNORE INTO users (id, name, password, role, status) 
VALUES ('ADMIN', 'SYSTEM ADMINISTRATOR', 'admin123', 'admin', 'active');
`;

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true
  });

  try {
    const dbName = process.env.DB_NAME;
    console.log('Finalizing database ' + dbName + '...');
    await connection.query('CREATE DATABASE IF NOT EXISTS ' + dbName);
    await connection.query('USE ' + dbName);
    await connection.query(schema);
    console.log('Full Database Schema ready!');
  } catch (err) {
    console.error('Update failed:', err.message);
  } finally {
    await connection.end();
  }
}

init();
