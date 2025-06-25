import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // قراءة ملف admin.html
      const adminPath = path.join(process.cwd(), 'admin.html');
      const adminContent = fs.readFileSync(adminPath, 'utf8');
      
      // إرسال الصفحة كـ HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(adminContent);
    } catch (err) {
      console.error('❌ Error serving admin page:', err);
      res.status(500).json({ error: 'Error serving admin page' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 