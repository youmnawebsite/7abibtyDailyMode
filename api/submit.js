import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// دالة لتحليل multipart/form-data
function parseMultipartData(body, boundary) {
  console.log('🔍 Parsing multipart data with boundary:', boundary);
  
  const parts = body.split('--' + boundary);
  const data = {};
  
  console.log('🔍 Number of parts:', parts.length);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part || part === '--') continue;
    
    console.log(`🔍 Part ${i} length:`, part.length);
    
    if (part.includes('Content-Disposition: form-data')) {
      // تقسيم الجزء إلى سطور
      const lines = part.split(/\r?\n/);
      let name = null;
      let value = null;
      
      console.log('🔍 Lines in part:', lines.length);
      
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        
        if (line.startsWith('Content-Disposition: form-data; name=')) {
          const nameMatch = line.match(/name="([^"]+)"/);
          name = nameMatch ? nameMatch[1] : null;
          console.log('🔍 Found name:', name);
        } else if (line.trim() === '' && j + 1 < lines.length) {
          // القيمة في السطر التالي
          value = lines[j + 1];
          console.log('🔍 Found value:', value);
          break;
        }
      }
      
      if (name && value !== null) {
        data[name] = value;
        console.log('🔍 Added to data:', name, '=', value);
      }
    }
  }
  
  console.log('🔍 Final parsed data:', data);
  return data;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('📝 Received POST request to /api/submit');
      console.log('📝 Content-Type:', req.headers['content-type']);
      
      // استخراج boundary من Content-Type
      const boundaryMatch = req.headers['content-type'].match(/boundary=(.+)/);
      const boundary = boundaryMatch ? boundaryMatch[1] : null;
      
      if (!boundary) {
        return res.status(400).json({ error: 'No boundary found in Content-Type' });
      }
      
      // قراءة البيانات
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      
      const data = await new Promise((resolve) => {
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          console.log('📝 Raw body length:', body.length);
          
          // تحليل multipart/form-data
          const parsedData = parseMultipartData(body, boundary);
          console.log('📝 Parsed multipart data:', parsedData);
          resolve(parsedData);
        });
      });
      
      const { question, answer } = data;
      
      if (!question) {
        console.log('❌ Question is missing');
        return res.status(400).json({ error: 'Question is required' });
      }
      
      console.log('📝 Attempting to insert:', { question, answer });
      
      const result = await pool.query(
        'INSERT INTO responses (question, answer, timestamp) VALUES ($1, $2, NOW()) RETURNING *',
        [question, answer || null]
      );
      
      console.log('✅ Insert successful:', result.rows[0]);
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('❌ Error:', err);
      res.status(500).json({ error: 'Error saving response', details: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 