const express = require('express');
const { Pool } = require('pg'); // مكتبة PostgreSQL
const app = express();

// الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // استخدم متغير البيئة
  ssl: {
    rejectUnauthorized: false, // لتجنب مشاكل الشهادات في Railway
  },
});

// المنفذ
const PORT = process.env.PORT || 3000;

// خدمة الملفات الساكنة
app.use(express.static('public'));

// تمكين قراءة JSON
app.use(express.json());

// استلام الإجابات
app.post('/submit', async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).send('Invalid input');
  }

  try {
    // حفظ الإجابة في قاعدة البيانات
    await pool.query(
      'INSERT INTO responses (question, answer, timestamp) VALUES ($1, $2, $3)',
      [question, answer, new Date()]
    );
    res.send('Response saved successfully');
  } catch (err) {
    console.error('Error saving response:', err);
    res.status(500).send('Error saving response');
  }
});

// عرض جميع الإجابات
app.get('/responses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM responses ORDER BY timestamp DESC');
    res.json(result.rows); // إرسال البيانات كـ JSON
  } catch (err) {
    console.error('Error fetching responses:', err);
    res.status(500).send('Error fetching responses');
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
