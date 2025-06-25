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
  connectionString: "postgresql://postgres.mnaisebumwnrjewtdzmh:GIx5bTNAJ9Pf3W5A@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
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
    console.log('📁 Serving file:', filePath);

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

    // تعيين رؤوس CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // تعيين رؤوس التخزين المؤقت
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    // السماح بالتحميل
    res.setHeader('Content-Disposition', 'inline');
  }
}));

// تكوين خاص لمجلد النسخ الاحتياطية
app.use('/backups', express.static(path.join(__dirname, 'backups'), {
  setHeaders: (res, filePath) => {
    console.log('📁 Serving backup file:', filePath);

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

    // تعيين رؤوس CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

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

// إنشاء جدول التذكيرات إذا لم يكن موجودًا
async function createRemindersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        time TIME NOT NULL,
        message TEXT NOT NULL,
        method VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Reminders table created or already exists');
  } catch (err) {
    console.error('❌ Error creating reminders table:', err);
  }
}

// إنشاء جدول التذكيرات عند بدء التطبيق
createRemindersTable();

// API لإدارة التذكيرات
app.post('/reminders', async (req, res) => {
  try {
    console.log('📝 Received reminder request:', req.body);

    const { time, message, method, email } = req.body;

    if (!time || !message || !method) {
      console.error('❌ Missing required fields:', { time, message, method });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (method === 'email' && !email) {
      console.error('❌ Email is required for email reminders');
      return res.status(400).json({ error: 'Email is required for email reminders' });
    }

    // التحقق من وجود جدول التذكيرات
    try {
      await pool.query('SELECT 1 FROM reminders LIMIT 1');
    } catch (tableErr) {
      console.error('❌ Reminders table might not exist, creating it now...');
      await createRemindersTable();
    }

    // تخزين التذكير في قاعدة البيانات
    console.log('📝 Saving reminder to database:', { time, message, method, email: email || null });

    const result = await pool.query(
      'INSERT INTO reminders (time, message, method, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [time, message, method, email || null]
    );

    console.log('✅ Reminder saved successfully:', result.rows[0]);

    res.status(200).json({
      message: 'Reminder saved successfully',
      reminder: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error saving reminder:', err);

    // معالجة أكثر تفصيلاً للأخطاء
    if (err.code === '42P01') {
      // جدول غير موجود
      try {
        await createRemindersTable();
        return res.status(500).json({ error: 'Table was missing but has been created. Please try again.' });
      } catch (createErr) {
        console.error('❌ Error creating reminders table:', createErr);
        return res.status(500).json({ error: 'Failed to create reminders table' });
      }
    } else if (err.code === '23505') {
      // تعارض المفتاح الأساسي
      return res.status(400).json({ error: 'A reminder with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to save reminder' });
    }
  }
});

// الحصول على جميع التذكيرات
app.get('/reminders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reminders ORDER BY time');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching reminders:', err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// حذف تذكير
app.delete('/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM reminders WHERE id = $1', [id]);
    res.status(200).json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting reminder:', err);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// تبديل حالة التذكير (نشط/غير نشط)
app.put('/reminders/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (active === undefined) {
      return res.status(400).json({ error: 'Active status is required' });
    }

    await pool.query('UPDATE reminders SET active = $1 WHERE id = $2', [active, id]);
    res.status(200).json({ message: 'Reminder status updated successfully' });
  } catch (err) {
    console.error('❌ Error updating reminder status:', err);
    res.status(500).json({ error: 'Failed to update reminder status' });
  }
});

// اختبار التذكير
app.post('/reminders/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    // الحصول على التذكير
    const result = await pool.query('SELECT * FROM reminders WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = result.rows[0];

    // إرسال التذكير
    if (reminder.method === 'notification') {
      // الحصول على جميع اشتراكات الإشعارات
      const subscriptionsResult = await pool.query('SELECT * FROM push_subscriptions');

      let sent = false;
      for (const sub of subscriptionsResult.rows) {
        try {
          const subscription = JSON.parse(sub.subscription);
          const success = await sendNotification(subscription, reminder.message);
          if (success) {
            sent = true;
          }
        } catch (err) {
          console.error('❌ Error parsing subscription:', err);
        }
      }

      if (!sent && subscriptionsResult.rows.length > 0) {
        return res.status(500).json({ error: 'Failed to send notification' });
      }

      if (subscriptionsResult.rows.length === 0) {
        return res.status(400).json({ error: 'No push subscriptions found' });
      }
    } else if (reminder.method === 'email' && reminder.email) {
      const success = await sendEmail(reminder.email, reminder.message);

      if (!success) {
        return res.status(500).json({ error: 'Failed to send email' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid reminder method' });
    }

    res.status(200).json({ message: 'Reminder sent successfully' });
  } catch (err) {
    console.error('❌ Error testing reminder:', err);
    res.status(500).json({ error: 'Failed to test reminder' });
  }
});

// إنشاء جدول اشتراكات الإشعارات إذا لم يكن موجودًا
async function createSubscriptionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        subscription TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Push subscriptions table created or already exists');
  } catch (err) {
    console.error('❌ Error creating push subscriptions table:', err);
  }
}

// إنشاء جدول اشتراكات الإشعارات عند بدء التطبيق
createSubscriptionsTable();

// API لإرسال إشعارات المتصفح
app.get('/push-subscription', (req, res) => {
  res.json({
    publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
  });
});

// تخزين اشتراك الإشعارات
app.post('/push-subscription', async (req, res) => {
  try {
    const subscription = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Subscription data is required' });
    }

    // تخزين الاشتراك في قاعدة البيانات
    await pool.query(
      'INSERT INTO push_subscriptions (subscription) VALUES ($1)',
      [JSON.stringify(subscription)]
    );

    res.status(200).json({ message: 'Subscription saved successfully' });
  } catch (err) {
    console.error('❌ Error saving subscription:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// إرسال إشعار
async function sendNotification(subscription, message) {
  try {
    const webpush = require('web-push');

    // تكوين مفاتيح الإشعارات
    webpush.setVapidDetails(
      'mailto:example@example.com',
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
      'Xpo8WrhQDLcfo1LrYFST-y1qXd_qVYJQQyJUUN7i0Ns'
    );

    // إرسال الإشعار
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'تذكير من موقع حبيبتي',
        body: message,
        icon: '/icon.png'
      })
    );

    console.log('✅ Notification sent successfully');
    return true;
  } catch (err) {
    console.error('❌ Error sending notification:', err);
    return false;
  }
}

// إرسال بريد إلكتروني
async function sendEmail(email, message) {
  try {
    // استخدام مكتبة nodemailer لإرسال البريد الإلكتروني
    const nodemailer = require('nodemailer');

    // إنشاء ناقل بريد إلكتروني باستخدام خدمة Gmail
    // ملاحظة: في بيئة الإنتاج، يجب استخدام متغيرات بيئية لتخزين بيانات الاعتماد
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mazenyousseff2@gmail.com', // استبدل بعنوان بريدك الإلكتروني
        pass: '' // استبدل بكلمة مرور التطبيق (ليس كلمة مرور حسابك)
      }
    });

    // إعداد خيارات البريد الإلكتروني
    const mailOptions = {
      from: 'mazenyousseff2@gmail.com', // استبدل بعنوان بريدك الإلكتروني
      to: email,
      subject: 'تذكير من موقع حبيبتي',
      text: message,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #e91e63;">تذكير من ويبسايت حبيبتي</h2>
          <p style="font-size: 16px; color: #333;">${message}</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="font-size: 14px; color: #777;">ده تذكير تلقائي من ويبسايت حبيبتي </p>
          </div>
        </div>
      `
    };

    // في الوقت الحالي، سنقوم فقط بتسجيل الرسالة بدلاً من إرسالها فعليًا
    // لإرسال البريد الإلكتروني فعليًا، قم بإزالة التعليق عن الكود التالي
    // وتكوين بيانات اعتماد البريد الإلكتروني الخاصة بك

    /*
    // إرسال البريد الإلكتروني
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    */

    // تسجيل الرسالة فقط (للاختبار)
    console.log(`✅ Email would be sent to ${email}: ${message}`);

    return true;
  } catch (err) {
    console.error('❌ Error sending email:', err);
    return false;
  }
}

// التحقق من التذكيرات وإرسالها
async function checkAndSendReminders() {
  try {
    // الحصول على الوقت الحالي
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    // البحث عن التذكيرات التي يجب إرسالها
    const result = await pool.query(
      'SELECT * FROM reminders WHERE time = $1 AND active = TRUE',
      [currentTime]
    );

    if (result.rows.length === 0) {
      return;
    }

    console.log(`🔔 Found ${result.rows.length} reminders to send at ${currentTime}`);

    // إرسال كل تذكير
    for (const reminder of result.rows) {
      if (reminder.method === 'notification') {
        // الحصول على جميع اشتراكات الإشعارات
        const subscriptionsResult = await pool.query('SELECT * FROM push_subscriptions');

        for (const sub of subscriptionsResult.rows) {
          try {
            const subscription = JSON.parse(sub.subscription);
            await sendNotification(subscription, reminder.message);
          } catch (err) {
            console.error('❌ Error parsing subscription:', err);
          }
        }
      } else if (reminder.method === 'email' && reminder.email) {
        await sendEmail(reminder.email, reminder.message);
      }
    }
  } catch (err) {
    console.error('❌ Error checking reminders:', err);
  }
}

// تشغيل فحص التذكيرات كل دقيقة
setInterval(checkAndSendReminders, 60000);

// إعادة ترتيب جميع الـ IDs
app.post('/reorder-ids', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      // إذا لم يتم توفير التحديثات، قم بإعادة ترتيب جميع الـ IDs تلقائيًا
      return await reorderAllIds(req, res);
    }

    // بدء معاملة قاعدة البيانات
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // إنشاء جدول مؤقت لتخزين التحديثات
      await client.query(`
        CREATE TEMP TABLE id_updates (
          old_id INTEGER,
          new_id INTEGER
        )
      `);

      // إدراج التحديثات في الجدول المؤقت
      for (const update of updates) {
        await client.query('INSERT INTO id_updates (old_id, new_id) VALUES ($1, $2)', [
          update.id,
          update.newId
        ]);
      }

      // تحديث الـ IDs باستخدام الجدول المؤقت
      await client.query(`
        UPDATE responses
        SET id = id_updates.new_id
        FROM id_updates
        WHERE responses.id = id_updates.old_id
      `);

      // إعادة ضبط تسلسل الـ ID
      const maxIdResult = await client.query('SELECT MAX(id) FROM responses');
      const maxId = maxIdResult.rows[0].max || 0;

      // إعادة ضبط تسلسل الـ ID
      await client.query(`ALTER SEQUENCE responses_id_seq RESTART WITH ${maxId + 1}`);

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

// إعادة ترتيب جميع الـ IDs تلقائيًا
async function reorderAllIds(req, res) {
  try {
    // بدء معاملة قاعدة البيانات
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // الحصول على جميع الردود مرتبة حسب التاريخ
      const result = await client.query('SELECT id FROM responses ORDER BY timestamp');
      const responses = result.rows;

      if (responses.length === 0) {
        await client.query('COMMIT');

        if (res) {
          res.status(200).json({
            message: 'No responses to reorder',
            count: 0
          });
        }

        return true;
      }

      // استخدام طريقة أكثر أمانًا لإعادة ترتيب الـ IDs
      // أولاً، نقوم بتحديث جميع الـ IDs إلى قيم سالبة مؤقتة لتجنب تعارضات المفاتيح الأساسية
      for (let i = 0; i < responses.length; i++) {
        await client.query('UPDATE responses SET id = $1 WHERE id = $2', [
          -(i + 1), // قيمة سالبة مؤقتة
          responses[i].id
        ]);
      }

      // ثم نقوم بتحديث الـ IDs إلى القيم النهائية الموجبة
      for (let i = 0; i < responses.length; i++) {
        await client.query('UPDATE responses SET id = $1 WHERE id = $2', [
          i + 1, // القيمة النهائية
          -(i + 1)
        ]);
      }

      // إعادة ضبط تسلسل الـ ID
      await client.query(`ALTER SEQUENCE responses_id_seq RESTART WITH ${responses.length + 1}`);

      await client.query('COMMIT');

      if (res) {
        res.status(200).json({
          message: 'All IDs reordered successfully',
          count: responses.length
        });
      }

      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error reordering all IDs:', err);

    if (res) {
      res.status(500).json({ error: 'Failed to reorder all IDs' });
    }

    return false;
  }
}

// إعادة ترتيب الـ IDs عند بدء التطبيق
setTimeout(async () => {
  try {
    console.log('🔄 Reordering IDs on startup...');
    await reorderAllIds();
    console.log('✅ IDs reordered successfully');
  } catch (err) {
    console.error('❌ Error reordering IDs on startup:', err);
  }
}, 5000); // انتظر 5 ثوانٍ بعد بدء التطبيق

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

// API لاختبار الملفات الصوتية
app.get('/test-audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    console.log('🎵 Testing audio file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      return res.status(404).json({
        error: 'File not found',
        path: filePath,
        exists: false
      });
    }

    const stats = fs.statSync(filePath);
    console.log('✅ File found:', {
      path: filePath,
      size: stats.size,
      modified: stats.mtime
    });

    res.json({
      message: 'File exists and accessible',
      path: filePath,
      size: stats.size,
      modified: stats.mtime,
      exists: true
    });

  } catch (err) {
    console.error('❌ Error testing audio file:', err);
    res.status(500).json({ error: 'Error testing file' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
