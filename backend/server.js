import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Large limit for Base64 files

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- SCHEMA UTILITY ---
async function applySchemaUpdates() {
  const alterStatements = [
    `ALTER TABLE enrollments DROP FOREIGN KEY IF EXISTS enrollments_ibfk_1;`,
    `ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_users FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;`,
    `ALTER TABLE results DROP FOREIGN KEY IF EXISTS results_ibfk_1;`,
    `ALTER TABLE results ADD CONSTRAINT fk_results_users FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;`,
    `ALTER TABLE announcements DROP FOREIGN KEY IF EXISTS announcements_ibfk_1;`,
    `ALTER TABLE announcements ADD CONSTRAINT fk_announcements_users FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;`,
    `ALTER TABLE activity_log DROP FOREIGN KEY IF EXISTS activity_log_ibfk_1;`,
    `ALTER TABLE activity_log ADD CONSTRAINT fk_activity_log_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS details JSON AFTER contact;`,
    `ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' AFTER details;`,
    `ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS approved_user_id VARCHAR(50) AFTER status;`,
    `ALTER TABLE materials ADD COLUMN IF NOT EXISTS assigned_student_ids JSON;`,
    `ALTER TABLE materials MODIFY COLUMN url LONGTEXT;`
  ];

  console.log('Syncing database schema (ON UPDATE CASCADE)...');
  for (const statement of alterStatements) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY' && error.code !== 'ER_DROP_INDEX_FK') {
         console.warn(`Note: ${error.message}`);
      }
    }
  }
}

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
  let { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ message: 'ID and password required' });
  id = id.toUpperCase();
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    const user = rows[0];
    if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid ID or password' });
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
    res.json(user);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- STUDENTS ---
app.get('/api/students', async (req, res) => {
  try {
    const [students] = await pool.execute('SELECT * FROM users WHERE role = "student"');
    for (let student of students) {
      const [enrolls] = await pool.execute('SELECT course_id FROM enrollments WHERE student_id = ?', [student.id]);
      student.courses = enrolls.map(e => e.course_id);
    }
    res.json(students);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/students', async (req, res) => {
  const { id, name, password, role, status, created_by, email, contact, details } = req.body;
  try {
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || null);
    await pool.execute('INSERT INTO users (id, name, password, role, status, created_by, email, contact, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [
        id || null, 
        name || null, 
        password || null, 
        role || 'student', 
        status || 'active', 
        created_by || null, 
        email || null, 
        contact || null, 
        detailsStr
      ]);
    res.status(201).json({ message: 'Created' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/students/:id', async (req, res) => {
  const { id: newId, name, password, status, email, contact } = req.body;
  const oldId = req.params.id;
  try {
    const updateId = newId && newId !== oldId;
    let query = 'UPDATE users SET name = ?, password = ?, status = ?, email = ?, contact = ?';
    let params = [name || '', password || '', status || 'active', email || null, contact || null];

    if (updateId) {
      query += ', id = ?';
      params.push(newId);
    }
    
    query += ' WHERE id = ?';
    params.push(oldId);

    await pool.execute(query, params);
    res.json({ message: 'Updated' });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- SUB-ADMINS ---
app.get('/api/subadmins', async (req, res) => {
  try {
    const [subadmins] = await pool.execute(`
      SELECT u.*, COUNT(s.id) as student_count 
      FROM users u 
      LEFT JOIN users s ON u.id = s.created_by AND s.role = 'student'
      WHERE u.role = 'sub-admin'
      GROUP BY u.id
    `);
    res.json(subadmins);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/subadmins', async (req, res) => {
  const { id, name, password, email, contact } = req.body;
  try {
    await pool.execute('INSERT INTO users (id, name, password, role, status, email, contact) VALUES (?, ?, ?, "sub-admin", "active", ?, ?)', 
      [
        (id || '').toUpperCase(), 
        (name || '').toUpperCase(), 
        password || null, 
        email || null, 
        contact || null
      ]);
    res.status(201).json({ message: 'Sub-Admin Created' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- COURSES & ENROLLMENTS ---
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM courses');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/courses', async (req, res) => {
  const { id, name, code, instructor, color, image } = req.body;
  try {
    await pool.execute('INSERT INTO courses (id, name, code, instructor, color, image) VALUES (?, ?, ?, ?, ?, ?)', 
      [id || null, name || null, code || null, instructor || null, color || null, image || null]);
    res.status(201).json({ message: 'Created' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/enrollments', async (req, res) => {
  const { studentId, courseId } = req.body;
  try {
    await pool.execute('INSERT IGNORE INTO enrollments (student_id, course_id) VALUES (?, ?)', [studentId || null, courseId || null]);
    res.json({ message: 'Enrolled' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/enrollments/:studentId/:courseId', async (req, res) => {
  try {
    await pool.execute('DELETE FROM enrollments WHERE student_id = ? AND course_id = ?', [req.params.studentId, req.params.courseId]);
    res.json({ message: 'Unenrolled' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- MATERIALS ---
app.get('/api/materials', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM materials');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/materials', async (req, res) => {
  const { id, courseId, type, title, description, fileName, fileSize, url, uploadedBy, approved, assignedStudentIds } = req.body;
  try {
    await pool.execute('INSERT INTO materials (id, course_id, type, title, description, file_name, file_size, url, uploaded_by, approved, assigned_student_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id || null, 
        courseId || null, 
        type || null, 
        title || null, 
        description || null, 
        fileName || null, 
        fileSize || 0, 
        url || null, 
        uploadedBy || null, 
        approved ? 1 : 0, 
        JSON.stringify(assignedStudentIds || [])
      ]);
    res.status(201).json({ message: 'Uploaded' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/materials/approve/:id', async (req, res) => {
  try {
    await pool.execute('UPDATE materials SET approved = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Approved' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- ASSESSMENTS ---
app.get('/api/assessments', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM assessments');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/assessments', async (req, res) => {
  const { id, courseId, title, type, markingType, submissionMode, mode, duration, startDate, endDate, structuredQuestions, questionFileUrl, questionFileName, assignedStudentIds } = req.body;
  try {
    await pool.execute('INSERT INTO assessments (id, course_id, title, type, marking_type, submission_mode, mode, duration, start_date, end_date, structured_questions, question_file_url, question_file_name, assigned_student_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id || null, 
        courseId || null, 
        title || null, 
        type || null, 
        markingType || null, 
        submissionMode || null, 
        mode || null, 
        duration || 0, 
        startDate || null, 
        endDate || null, 
        JSON.stringify(structuredQuestions || []), 
        questionFileUrl || null, 
        questionFileName || null, 
        JSON.stringify(assignedStudentIds || [])
      ]);
    res.status(201).json({ message: 'Assessment Created' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/assessments/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM assessments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- RESULTS ---
app.get('/api/results', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.*, a.title as assessmentTitle, a.type as assessmentType, c.name as courseName, u.name as studentName
      FROM results r
      JOIN assessments a ON r.assessment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON r.student_id = u.id
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/results', async (req, res) => {
  const { id, studentId, assessmentId, score, correctAnswers, totalQuestions, status, answers, studentFile, feedback, manualMarking } = req.body;
  try {
    await pool.execute('INSERT INTO results (id, student_id, assessment_id, score, correct_answers, total_questions, status, answers, student_file, feedback, manual_marking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id || null, 
        studentId || null, 
        assessmentId || null, 
        score || 0, 
        correctAnswers || 0, 
        totalQuestions || 0, 
        status || 'pending', 
        JSON.stringify(answers || {}), 
        JSON.stringify(studentFile || null), 
        feedback || null, 
        JSON.stringify(manualMarking || {})
      ]);
    res.status(201).json({ message: 'Result Saved' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/results/:id', async (req, res) => {
  const { status, score, correctAnswers, feedback, manualMarking } = req.body;
  try {
    await pool.execute('UPDATE results SET status = ?, score = ?, correct_answers = ?, feedback = ?, manual_marking = ? WHERE id = ?',
      [status || 'pending', score || 0, correctAnswers || 0, feedback || null, JSON.stringify(manualMarking || {}), req.params.id]);
    res.json({ message: 'Result Updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/results/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM results WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- ANNOUNCEMENTS ---
app.get('/api/announcements/:studentId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM announcements WHERE student_id = ? ORDER BY timestamp DESC', [req.params.studentId]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/announcements', async (req, res) => {
  const { id, studentId, message, type } = req.body;
  try {
    await pool.execute('INSERT INTO announcements (id, student_id, message, type) VALUES (?, ?, ?, ?)', [id || null, studentId || null, message || null, type || 'general']);
    res.status(201).json({ message: 'Sent' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- REGISTRATION REQUESTS ---
app.get('/api/reg-requests', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM registration_requests');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/reg-requests', async (req, res) => {
  const { name, phone, email, role, adminCode, details } = req.body;
  try {
    await pool.execute('INSERT INTO registration_requests (name, phone, email, role, admin_code, details) VALUES (?, ?, ?, ?, ?, ?)',
      [
        name || null, 
        phone || null, 
        email || null, 
        role || null, 
        adminCode || null, 
        details ? JSON.stringify(details) : null
      ]);
    res.status(201).json({ message: 'Request Submitted' });
  } catch (error) { 
    console.error('Registration Request Error:', error);
    res.status(500).json({ error: error.message }); 
  }
});

app.delete('/api/reg-requests/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM registration_requests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/reg-requests/:id', async (req, res) => {
  const { status, approved_user_id } = req.body;
  try {
    await pool.execute('UPDATE registration_requests SET status = ?, approved_user_id = ? WHERE id = ?',
      [status || 'pending', approved_user_id || null, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- ACTIVITY LOG ---
app.get('/api/activity', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 100');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/activity', async (req, res) => {
  const { userId, action, details } = req.body;
  try {
    await pool.execute('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)', [userId || null, action || null, details || null]);
    res.status(201).json({ message: 'Logged' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await applySchemaUpdates();
  console.log(`Backend API running on http://localhost:${PORT}`);
});
