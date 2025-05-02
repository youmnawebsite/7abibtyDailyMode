const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 8080;
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    // Get the original file extension or default to .webm for audio files
    let ext = path.extname(file.originalname);
    if (!ext && file.mimetype.startsWith('audio/')) {
      // If no extension but it's an audio file, use the appropriate extension
      if (file.mimetype.includes('webm')) {
        ext = '.webm';
      } else if (file.mimetype.includes('wav')) {
        ext = '.wav';
      } else if (file.mimetype.includes('mp3')) {
        ext = '.mp3';
      } else if (file.mimetype.includes('ogg')) {
        ext = '.ogg';
      } else {
        ext = '.audio'; // Generic fallback
      }
    }
    cb(null, file.fieldname + '-' + Date.now() + ext);
  },
});

// Set file size limits and other options
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
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
      finalAnswer = `/uploads/${req.file.filename}`; // إذا وُجد ملف صوتي
    }

    const result = await pool.query(
      'INSERT INTO responses (question, answer, timestamp) VALUES ($1, $2, NOW()) RETURNING *',
      [question, finalAnswer]
    );

    res.status(200).json({ message: '✅ Response saved successfully', response: result.rows[0] });
  } catch (err) {
    console.error('❌ Error saving response:', err);
    res.status(500).json({ error: 'Error saving response' });
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
