const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// التأكد من وجود مجلد uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

const app = express();
const port = process.env.PORT || 8080;
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    // الحصول على امتداد الملف الأصلي أو استخدام امتداد افتراضي للملفات الصوتية
    let ext = path.extname(file.originalname);
    if (!ext && file.mimetype.startsWith('audio/')) {
      // إذا لم يكن هناك امتداد ولكنه ملف صوتي، استخدم الامتداد المناسب
      if (file.mimetype.includes('webm')) {
        ext = '.webm';
      } else if (file.mimetype.includes('wav')) {
        ext = '.wav';
      } else {
        ext = '.audio'; // امتداد عام احتياطي
      }
    }
    cb(null, file.fieldname + '-' + Date.now() + ext);
  },
});

// تعيين حدود حجم الملف وخيارات أخرى
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // الحد الأقصى لحجم الملف 10 ميجابايت
  }
});

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// PostgreSQL Connection
const pool = new Pool({
  user: "postgres",
  host: "autorack.proxy.rlwy.net",
  database: "railway",
  password: "newpassword", // تأكد إن ده الباسورد الصحيح
  port: 34770,
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Error connecting to database:", err);
  } else {
    console.log("✅ Database connected successfully at:", res.rows[0].now);
  }
});

// Serve Admin Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fetch all responses
app.get('/responses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM responses ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching responses:', err);
    res.status(500).json({ error: 'Error fetching responses' });
  }
});

// Submit a new response
app.post('/submit', upload.single('audio'), async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    let finalAnswer = answer || null; // الإجابة النصية

    if (req.file) {
      // تسجيل معلومات الملف للتشخيص
      console.log('✅ File received:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      finalAnswer = `/uploads/${req.file.filename}`; // إذا وُجد ملف صوتي
    }

    const result = await pool.query(
      'INSERT INTO responses (question, answer, timestamp) VALUES ($1, $2, NOW()) RETURNING *',
      [question, finalAnswer]
    );

    console.log('✅ Response saved successfully:', result.rows[0]);

    // إرسال استجابة بسيطة لتجنب مشاكل التحليل في العميل
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error saving response:', err);
    // إرسال استجابة بسيطة لتجنب مشاكل التحليل في العميل
    res.status(500).send('Error');
  }
});

app.use('/uploads', express.static('uploads'));

// Delete a response by ID
app.delete('/responses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM responses WHERE id = $1', [id]);
    res.status(200).json({ message: '✅ Response deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting response:', err);
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// Update a response by ID
app.put('/responses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { answer, timestamp } = req.body;

    if (!answer) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    if (timestamp) {
      await pool.query('UPDATE responses SET answer = $1, timestamp = $2 WHERE id = $3', [
        answer,
        timestamp,
        id,
      ]);
    } else {
      await pool.query('UPDATE responses SET answer = $1 WHERE id = $2', [answer, id]);
    }

    res.status(200).json({ message: '✅ Response updated successfully' });
  } catch (err) {
    console.error('❌ Error updating response:', err);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
