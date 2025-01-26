const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// تحديد المنفذ (يستخدم المنفذ من البيئة أو 3000)
const PORT = process.env.PORT || 3000;

// استخدام Express لعرض الملفات الساكنة من مجلد "public"
app.use(express.static(path.join(__dirname, 'public')));

// تمكين قراءة بيانات JSON في الطلبات
app.use(express.json());

// استلام الإجابات وحفظها في ملف responses.txt
app.post('/submit', (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).send('Invalid input');
  }

  const data = `${new Date().toISOString()} - ${question}: ${answer}\n`;

  fs.appendFile('responses.txt', data, (err) => {
    if (err) {
      console.error('Error saving response:', err);
      return res.status(500).send('Error saving response');
    }
    res.send('Response saved successfully');
  });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
