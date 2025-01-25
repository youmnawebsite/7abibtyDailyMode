const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// تحديد المنفذ (يستخدم المنفذ من البيئة أو 3000)
// Set the port (use the port from the environment or 3000)
const PORT = process.env.PORT || 3000;

// استخدام Express لعرض الملفات الساكنة من مجلد "public"
app.use(express.static(path.join(__dirname, 'public')));

// تمكين قراءة بيانات JSON في الطلبات
app.use(express.json());

// استلام الإجابات وحفظها في ملف responses.txt
// Endpoint to receive answers and save them to responses.txt
// Expected input format: { "question": "your question", "answer": "your answer" }
app.post('/submit', (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).send('Invalid input');
  }

  const data = `${new Date().toISOString()} - ${question}: ${answer}\n`;

  fs.promises.appendFile('responses.txt', data)
    .then(() => {
      res.send('Response saved successfully');
    })
    .catch(err => {
      console.error('Error saving response:', err);
      res.status(500).send('Error saving response');
    });
});
app.listen(PORT_NUMBER, () => {
  console.log(`Server is running on port ${PORT_NUMBER}`);
  console.log(`Server is running on port ${PORT}`);
});
