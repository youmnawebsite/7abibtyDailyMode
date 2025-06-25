import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { question, answer } = req.body;
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }
      const result = await pool.query(
        'INSERT INTO responses (question, answer, timestamp) VALUES ($1, $2, NOW()) RETURNING *',
        [question, answer || null]
      );
      res.status(200).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Error saving response' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 