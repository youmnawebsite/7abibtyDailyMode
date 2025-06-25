import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      await pool.query('DELETE FROM responses WHERE id = $1', [id]);
      res.status(200).json({ message: '✅ Response deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete response' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 