import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM responses ORDER BY timestamp DESC');
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error fetching responses' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 