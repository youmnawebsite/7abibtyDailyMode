import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { updates } = req.body;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (!updates || !Array.isArray(updates)) {
          // إعادة ترتيب تلقائي
          const result = await client.query('SELECT id FROM responses ORDER BY timestamp');
          const responses = result.rows;
          for (let i = 0; i < responses.length; i++) {
            await client.query('UPDATE responses SET id = $1 WHERE id = $2', [-(i + 1), responses[i].id]);
          }
          for (let i = 0; i < responses.length; i++) {
            await client.query('UPDATE responses SET id = $1 WHERE id = $2', [i + 1, -(i + 1)]);
          }
          await client.query(`ALTER SEQUENCE responses_id_seq RESTART WITH ${responses.length + 1}`);
          await client.query('COMMIT');
          res.status(200).json({ message: 'All IDs reordered successfully', count: responses.length });
        } else {
          // إعادة ترتيب مخصص
          await client.query(`CREATE TEMP TABLE id_updates (old_id INTEGER, new_id INTEGER)`);
          for (const update of updates) {
            await client.query('INSERT INTO id_updates (old_id, new_id) VALUES ($1, $2)', [update.id, update.newId]);
          }
          await client.query(`UPDATE responses SET id = id_updates.new_id FROM id_updates WHERE responses.id = id_updates.old_id`);
          const maxIdResult = await client.query('SELECT MAX(id) FROM responses');
          const maxId = maxIdResult.rows[0].max || 0;
          await client.query(`ALTER SEQUENCE responses_id_seq RESTART WITH ${maxId + 1}`);
          await client.query('COMMIT');
          res.status(200).json({ message: 'IDs reordered successfully' });
        }
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to reorder IDs' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 