import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

dotenv.config();

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150MB limit
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '250mb' }));

app.use((req, res, next) => {
  logDebug(`${req.method} ${req.url}`);
  next();
});

fs.writeFileSync(path.join(process.cwd(), 'startup.log'), `Server starting at ${new Date().toISOString()}\n`);
const logFile = path.join(process.cwd(), 'login.log');
function logDebug(msg) {
  const t = new Date().toISOString();
  const line = `[${t}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logFile, line);
  } catch (err) {
    console.error(`Failed to write to login.log: ${err.message}`);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
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

  logDebug('Syncing database schema (ON UPDATE CASCADE)...');
  for (const statement of alterStatements) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY' && error.code !== 'ER_DROP_INDEX_FK') {
         logDebug(`Note: ${error.message}`);
      }
    }
  }
}

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
  let { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ message: 'ID and password required' });
  id = id.trim().toUpperCase();
  const trimmedPassword = password.trim();
  logDebug(`[Login Attempt] ID: "${id}", PW: "${trimmedPassword}"`);
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    const user = rows[0];
    if (!user) {
      logDebug(`[Login Failed] User not found: "${id}"`);
      return res.status(401).json({ message: 'Invalid ID or password' });
    }
    if (user.password !== trimmedPassword) {
      logDebug(`[Login Failed] Incorrect password for: "${id}". Received: "${trimmedPassword}", Expected: "${user.password}"`);
      return res.status(401).json({ message: 'Invalid ID or password' });
    }
    logDebug(`[Login Success] User logged in: "${id}"`);
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
    await pool.execute('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)', [id, 'login', 'User logged in']);
    res.json(user);
  } catch (error) {
    logDebug(`[Login Error] ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/logout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'User ID is required' });
  try {
    await pool.execute('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)', [userId, 'logout', 'User logged out']);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logDebug(`[Logout Error] ${error.message}`);
    res.status(500).json({ message: 'Failed to log logout' });
  }
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
  } catch (error) { res.status(500).json({ message: error.message }); }
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
  } catch (error) { res.status(500).json({ message: error.message }); }
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
    res.status(500).json({ message: error.message }); 
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
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
  } catch (error) { res.status(500).json({ message: error.message }); }
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
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- COURSES & ENROLLMENTS ---
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM courses');
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/courses', async (req, res) => {
  const { id, name, code, instructor, color, image } = req.body;
  logDebug(`Creating course: ${JSON.stringify({ id, name, code })}`);
  try {
    await pool.execute('INSERT INTO courses (id, name, code, instructor, color, image) VALUES (?, ?, ?, ?, ?, ?)', 
      [id || null, name || null, code || null, instructor || null, color || null, image || '/course-placeholder.svg']);
    res.status(201).json({ message: 'Created' });
  } catch (error) { 
    logDebug(`Course creation error: ${error.message}`);
    res.status(500).json({ message: error.message }); 
  }
});

app.put('/api/courses/:id', async (req, res) => {
  const { name, code, instructor, color, image } = req.body;
  try {
    await pool.execute('UPDATE courses SET name = ?, code = ?, instructor = ?, color = ?, image = ? WHERE id = ?',
      [name || null, code || null, instructor || null, color || null, image || '/course-placeholder.svg', req.params.id]);
    res.json({ message: 'Updated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/enrollments', async (req, res) => {
  const { student_id, course_id } = req.body;
  logDebug(`Enrolling student: ${JSON.stringify({ student_id, course_id })}`);
  try {
    await pool.execute('INSERT IGNORE INTO enrollments (student_id, course_id) VALUES (?, ?)', [student_id || null, course_id || null]);
    res.json({ message: 'Enrolled' });
  } catch (error) { 
    logDebug(`Enrollment error: ${error.message}`);
    res.status(500).json({ message: error.message }); 
  }
});

app.get('/api/enrollments/:student_id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT course_id FROM enrollments WHERE student_id = ?', [req.params.student_id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/enrollments/:student_id/:course_id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM enrollments WHERE student_id = ? AND course_id = ?', [req.params.student_id, req.params.course_id]);
    res.json({ message: 'Unenrolled' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- CLOUDINARY UPLOAD ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Determine resource type based on file type
    let resource_type = 'auto';
    if (req.file.mimetype.startsWith('video/')) resource_type = 'video';
    else if (req.file.mimetype.startsWith('image/')) resource_type = 'image';
    else resource_type = 'raw'; // For PDFs, docs, etc.

    const stream = cloudinary.uploader.upload_stream(
      { 
        resource_type,
        folder: 'alamel_materials',
        public_id: `file_${Date.now()}`
      },
      (error, result) => {
        if (error) return res.status(500).json({ message: error.message });
        res.json({
          url: result.secure_url,
          public_id: result.public_id,
          file_name: req.file.originalname,
          file_size: req.file.size
        });
      }
    );

    stream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- MATERIALS ---
app.get('/api/materials', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM materials');
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/materials', async (req, res) => {
  const { id, course_id, type, title, description, file_name, file_size, url, uploaded_by, approved, assigned_student_ids, date } = req.body;
  logDebug(`[Materials] New upload request from ${uploaded_by} for course ${course_id}. Title: ${title}, File: ${file_name || 'N/A'} (${file_size || 'N/A'})`);
  
  if (url && url.length > 1000) {
    logDebug(`[Materials] URL/File data length: ${url.length} characters`);
  }

  try {
    await pool.execute('INSERT INTO materials (id, course_id, type, title, description, file_name, file_size, url, uploaded_by, approved, assigned_student_ids, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id || null, 
        course_id || null, 
        type || null, 
        title || null, 
        description || null, 
        file_name || null, 
        file_size || null, 
        url || null, 
        uploaded_by || null, 
        approved ? 1 : 0, 
        JSON.stringify(assigned_student_ids || []),
        date || new Date().toISOString().split('T')[0]
      ]);
    logDebug(`[Materials] Successfully uploaded ${id}`);
    res.status(201).json({ message: 'Uploaded' });
  } catch (error) { 
    logDebug(`[Materials] Error uploading ${id}: ${error.message}`);
    res.status(500).json({ message: error.message }); 
  }
});

app.put('/api/materials/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  
  // Basic validation to prevent updating arbitrary columns
  const allowedFields = ['course_id', 'type', 'title', 'description', 'url', 'approved', 'assigned_student_ids'];
  const fieldEntries = Object.entries(fields).filter(([key]) => allowedFields.includes(key));

  if (fieldEntries.length === 0) {
    return res.status(400).json({ message: 'No valid fields to update.' });
  }

  // Handle boolean to integer conversion for 'approved'
  if (fields.approved !== undefined) {
    const approvedIndex = fieldEntries.findIndex(([key]) => key === 'approved');
    if (approvedIndex !== -1) {
      fieldEntries[approvedIndex][1] = fields.approved ? 1 : 0;
    }
  }

  // Handle JSON stringification
  if (fields.assigned_student_ids !== undefined) {
    const assignedIdsIndex = fieldEntries.findIndex(([key]) => key === 'assigned_student_ids');
    if (assignedIdsIndex !== -1) {
      fieldEntries[assignedIdsIndex][1] = JSON.stringify(fields.assigned_student_ids);
    }
  }

  const setClauses = fieldEntries.map(([key]) => `${key} = ?`).join(', ');
  const values = fieldEntries.map(([, value]) => value);
  values.push(id);

  try {
    await pool.execute(`UPDATE materials SET ${setClauses} WHERE id = ?`, values);
    res.json({ message: 'Material updated successfully' });
  } catch (error) {
    logDebug(`Material update error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- ASSESSMENTS ---
app.get('/api/assessments', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM assessments');
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/assessments', async (req, res) => {
  const { id, course_id, title, type, marking_type, submission_mode, mode, duration, start_date, end_date, structured_questions, question_file_url, question_file_name, assigned_student_ids } = req.body;
  try {
    await pool.execute('INSERT INTO assessments (id, course_id, title, type, marking_type, submission_mode, mode, duration, start_date, end_date, structured_questions, question_file_url, question_file_name, assigned_student_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id || null, 
        course_id || null, 
        title || null, 
        type || null, 
        marking_type || null, 
        submission_mode || null, 
        mode || null, 
        duration || 0, 
        start_date || null, 
        end_date || null, 
        JSON.stringify(structured_questions || []), 
        question_file_url || null, 
        question_file_name || null, 
        JSON.stringify(assigned_student_ids || [])
      ]);
    res.status(201).json({ message: 'Assessment Created' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/assessments/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM assessments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- RESULTS ---
app.get('/api/results', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.*, a.title as assessment_title, a.type as assessment_type, c.name as course_name, u.name as student_name
      FROM results r
      JOIN assessments a ON r.assessment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON r.student_id = u.id
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/results/:student_id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.*, a.title as assessment_title, a.type as assessment_type, c.name as course_name, u.name as student_name
      FROM results r
      JOIN assessments a ON r.assessment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON r.student_id = u.id
      WHERE r.student_id = ?
    `, [req.params.student_id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/results', async (req, res) => {
  const { id, student_id, assessment_id, score, correct_answers, total_questions, status, answers, student_file, feedback, manual_marking } = req.body;
  try {
    await pool.execute('INSERT INTO results (id, student_id, assessment_id, score, correct_answers, total_questions, status, answers, student_file, feedback, manual_marking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id || null, 
        student_id || null, 
        assessment_id || null, 
        score || 0, 
        correct_answers || 0, 
        total_questions || 0, 
        status || 'pending', 
        JSON.stringify(answers || {}), 
        JSON.stringify(student_file || null), 
        feedback || null, 
        JSON.stringify(manual_marking || {})
      ]);
    res.status(201).json({ message: 'Result Saved' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/results/:id', async (req, res) => {
  const { status, score, correct_answers, feedback, manual_marking } = req.body;
  try {
    await pool.execute('UPDATE results SET status = ?, score = ?, correct_answers = ?, feedback = ?, manual_marking = ? WHERE id = ?',
      [status || 'pending', score || 0, correct_answers || 0, feedback || null, JSON.stringify(manual_marking || {}), req.params.id]);
    res.json({ message: 'Result Updated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/results/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM results WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- ANNOUNCEMENTS ---
app.get('/api/announcements/:student_id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM announcements WHERE student_id = ? ORDER BY timestamp DESC', [req.params.student_id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/announcements', async (req, res) => {
  const { id, student_id, message, type } = req.body;
  try {
    await pool.execute('INSERT INTO announcements (id, student_id, message, type) VALUES (?, ?, ?, ?)', [id || null, student_id || null, message || null, type || 'general']);
    res.status(201).json({ message: 'Sent' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- REGISTRATION REQUESTS ---
app.get('/api/reg-requests', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM registration_requests');
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/reg-requests', async (req, res) => {
  const { name, phone, email, role, admin_code, details } = req.body;
  try {
    await pool.execute('INSERT INTO registration_requests (name, phone, email, role, admin_code, details) VALUES (?, ?, ?, ?, ?, ?)',
      [
        name || null, 
        phone || null, 
        email || null, 
        role || null, 
        admin_code || null, 
        details ? JSON.stringify(details) : null
      ]);
    res.status(201).json({ message: 'Request Submitted' });
  } catch (error) { 
    logDebug(`Registration Request Error: ${error.message}`);
    res.status(500).json({ message: error.message }); 
  }
});

app.delete('/api/reg-requests/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM registration_requests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/reg-requests/:id', async (req, res) => {
  const { status, approved_user_id } = req.body;
  try {
    await pool.execute('UPDATE registration_requests SET status = ?, approved_user_id = ? WHERE id = ?',
      [status || 'pending', approved_user_id || null, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- ACTIVITY LOG ---
app.get('/api/activity', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, u.name as user_name, u.status as user_status 
      FROM activity_log a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.timestamp DESC 
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/activity', async (req, res) => {
  const { user_id, action, details } = req.body;
  try {
    await pool.execute('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)', [user_id || null, action || null, details || null]);
    res.status(201).json({ message: 'Logged' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await applySchemaUpdates();
  logDebug(`Server is fully ready and listening on port ${PORT}`);
  logDebug(`Backend API running on http://localhost:${PORT}`);
});
