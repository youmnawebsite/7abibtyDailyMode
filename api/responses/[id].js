import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM responses WHERE id = $1', [id]);
      res.status(200).json({ message: '✅ Response deleted successfully' });
    } catch (err) {
      console.error('❌ Error deleting response:', err);
      res.status(500).json({ error: 'Failed to delete response' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { answer, timestamp } = req.body;
      
      if (!answer && !timestamp) {
        return res.status(400).json({ error: 'Nothing to update' });
      }
      
      if (answer && timestamp) {
        await pool.query('UPDATE responses SET answer = $1, timestamp = $2 WHERE id = $3', [answer, timestamp, id]);
      } else if (answer) {
        await pool.query('UPDATE responses SET answer = $1 WHERE id = $2', [answer, id]);
      } else if (timestamp) {
        await pool.query('UPDATE responses SET timestamp = $1 WHERE id = $2', [timestamp, id]);
      }
      
      res.status(200).json({ message: '✅ Response updated successfully' });
    } catch (err) {
      console.error('❌ Error updating response:', err);
      res.status(500).json({ error: 'Failed to update response' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 