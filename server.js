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

// التأكد من وجود مجلد backups
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
  console.log('✅ Created backups directory');
}

// دالة لإنشاء نسخة احتياطية من ملف
function backupFile(sourcePath, fileId) {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file does not exist: ${sourcePath}`);
      return false;
    }

    // إنشاء اسم الملف الاحتياطي
    const fileExt = path.extname(sourcePath);
    const backupFileName = `backup_${fileId}_${Date.now()}${fileExt}`;
    const backupPath = path.join(backupsDir, backupFileName);

    // نسخ الملف
    fs.copyFileSync(sourcePath, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);

    return backupFileName;
  } catch (err) {
    console.error(`❌ Error creating backup: ${err}`);
    return false;
  }
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
    console.log('📝 Received submission request');
    console.log('📝 Request body:', req.body);

    const { question, answer } = req.body;

    if (!question) {
      console.error('❌ Question is missing in the request');
      return res.status(400).send('Question is required');
    }

    let finalAnswer = answer || null; // الإجابة النصية

    if (req.file) {
      // تسجيل معلومات الملف للتشخيص
      console.log('🎵 Audio file received:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      // التأكد من وجود المجلد
      if (!fs.existsSync(req.file.path)) {
        console.error('❌ File was not saved correctly:', req.file.path);
      } else {
        console.log('✅ File exists at path:', req.file.path);
      }

      finalAnswer = `/uploads/${req.file.filename}`; // إذا وُجد ملف صوتي
    } else {
      console.log('📝 No audio file in the request');
    }

    console.log('📝 Saving to database:', { question, finalAnswer });

    // إدراج الرد في قاعدة البيانات
    const result = await pool.query(
      'INSERT INTO responses (question, answer, timestamp) VALUES ($1, $2, NOW()) RETURNING *',
      [question, finalAnswer]
    );

    const responseId = result.rows[0].id;
    console.log('✅ Response saved successfully:', result.rows[0]);

    // إذا كان الرد يحتوي على ملف صوتي، قم بإنشاء نسخة احتياطية
    if (finalAnswer && finalAnswer.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, finalAnswer.substring(1));

      if (fs.existsSync(filePath)) {
        // إنشاء نسخة احتياطية
        const backupFileName = backupFile(filePath, responseId);

        if (backupFileName) {
          console.log(`✅ Backup created for file: ${backupFileName}`);

          // تحديث السجل بمعلومات النسخة الاحتياطية
          await pool.query(
            'ALTER TABLE responses ADD COLUMN IF NOT EXISTS backup_path TEXT'
          );

          await pool.query(
            'UPDATE responses SET backup_path = $1 WHERE id = $2',
            [`/backups/${backupFileName}`, responseId]
          );
        }
      } else {
        console.error(`❌ Audio file not found for backup: ${filePath}`);
      }
    }

    // إرسال استجابة بسيطة لتجنب مشاكل التحليل في العميل
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error saving response:', err);
    // إرسال استجابة بسيطة لتجنب مشاكل التحليل في العميل
    res.status(500).send('Error');
  }
});

// تكوين خاص لمجلد التحميلات
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // تعيين رؤوس HTTP للملفات الصوتية
    if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (filePath.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
    } else if (filePath.endsWith('.audio')) {
      res.setHeader('Content-Type', 'audio/mpeg'); // افتراضي
    }

    // تعيين رؤوس التخزين المؤقت
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    // السماح بالتحميل
    res.setHeader('Content-Disposition', 'inline');
  }
}));

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

// API لإدارة التذكيرات
app.post('/reminders', async (req, res) => {
  try {
    const { time, message, method, email } = req.body;

    if (!time || !message || !method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (method === 'email' && !email) {
      return res.status(400).json({ error: 'Email is required for email reminders' });
    }

    // في الإصدار الحالي، سنقوم فقط بتخزين التذكيرات في الذاكرة
    // في الإصدار المستقبلي، يمكن تخزينها في قاعدة البيانات

    res.status(200).json({ message: 'Reminder saved successfully' });
  } catch (err) {
    console.error('❌ Error saving reminder:', err);
    res.status(500).json({ error: 'Failed to save reminder' });
  }
});

// API لإرسال إشعارات المتصفح
app.get('/push-subscription', (req, res) => {
  res.json({
    publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
  });
});

app.post('/push-subscription', (req, res) => {
  // في الإصدار المستقبلي، يمكن تخزين اشتراكات الإشعارات في قاعدة البيانات
  res.status(200).json({ message: 'Subscription saved successfully' });
});

// إعادة ترتيب جميع الـ IDs
app.post('/reorder-ids', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid updates format' });
    }

    // بدء معاملة قاعدة البيانات
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // تحديث كل ID
      for (const update of updates) {
        await client.query('UPDATE responses SET id = $1 WHERE id = $2', [
          update.newId,
          update.id
        ]);
      }

      await client.query('COMMIT');
      res.status(200).json({ message: 'IDs reordered successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error reordering IDs:', err);
    res.status(500).json({ error: 'Failed to reorder IDs' });
  }
});

// API للتحقق من التسجيلات الصوتية
app.get('/check-audio-files', async (req, res) => {
  try {
    // التحقق من قاعدة البيانات
    const result = await pool.query('SELECT id, question, answer, timestamp, backup_path FROM responses WHERE answer LIKE \'/uploads/%\'');

    // التحقق من وجود الملفات
    const audioResponses = result.rows;
    const fileStatus = [];

    for (const response of audioResponses) {
      const filePath = path.join(__dirname, response.answer.substring(1)); // إزالة الشرطة المائلة الأولى
      const exists = fs.existsSync(filePath);

      // التحقق من وجود نسخة احتياطية
      let backupExists = false;
      if (response.backup_path) {
        const backupPath = path.join(__dirname, response.backup_path.substring(1));
        backupExists = fs.existsSync(backupPath);
      }

      fileStatus.push({
        id: response.id,
        path: response.answer,
        exists: exists,
        backup_path: response.backup_path,
        backup_exists: backupExists,
        timestamp: response.timestamp
      });
    }

    res.json({
      totalAudioResponses: audioResponses.length,
      fileStatus: fileStatus
    });
  } catch (err) {
    console.error('❌ Error checking audio files:', err);
    res.status(500).json({ error: 'Failed to check audio files' });
  }
});

// API لاستعادة ملف من النسخة الاحتياطية
app.post('/restore-audio/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // البحث عن الرد
    const result = await pool.query(
      'SELECT id, answer, backup_path FROM responses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Response not found' });
    }

    const response = result.rows[0];

    // التحقق من وجود نسخة احتياطية
    if (!response.backup_path) {
      return res.status(404).json({ error: 'No backup found for this response' });
    }

    const backupPath = path.join(__dirname, response.backup_path.substring(1));

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // إنشاء مسار الملف الأصلي
    const originalPath = path.join(__dirname, response.answer.substring(1));
    const originalDir = path.dirname(originalPath);

    // التأكد من وجود المجلد
    if (!fs.existsSync(originalDir)) {
      fs.mkdirSync(originalDir, { recursive: true });
    }

    // نسخ الملف من النسخة الاحتياطية
    fs.copyFileSync(backupPath, originalPath);

    res.status(200).json({
      message: 'Audio file restored successfully',
      original_path: response.answer,
      backup_path: response.backup_path
    });
  } catch (err) {
    console.error('❌ Error restoring audio file:', err);
    res.status(500).json({ error: 'Failed to restore audio file' });
  }
});

// API لإدارة النسخ الاحتياطية
app.get('/backups', async (req, res) => {
  try {
    // الحصول على جميع النسخ الاحتياطية
    const files = fs.readdirSync(backupsDir);

    const backups = files.map(file => {
      const stats = fs.statSync(path.join(backupsDir, file));
      return {
        filename: file,
        path: `/backups/${file}`,
        size: stats.size,
        created: stats.birthtime
      };
    });

    res.json({
      total: backups.length,
      backups: backups
    });
  } catch (err) {
    console.error('❌ Error fetching backups:', err);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
