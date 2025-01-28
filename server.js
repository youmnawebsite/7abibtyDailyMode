const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for hosted databases like Railway
});

// Serve Admin Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fetch all responses
app.get('/responses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM responses ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching responses:', err);
    res.status(500).send('Error fetching responses');
  }
});

// Delete a response by ID
app.delete('/responses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM responses WHERE id = $1', [id]);
    res.status(200).send('Response deleted successfully.');
  } catch (err) {
    console.error('Error deleting response:', err);
    res.status(500).send('Failed to delete response.');
  }
});

// Update a response by ID
app.put('/responses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { answer, timestamp } = req.body;

    if (timestamp) {
      await pool.query('UPDATE responses SET answer = $1, timestamp = $2 WHERE id = $3', [
        answer,
        timestamp,
        id,
      ]);
    } else {
      await pool.query('UPDATE responses SET answer = $1 WHERE id = $2', [answer, id]);
    }

    res.status(200).send('Response updated successfully.');
  } catch (err) {
    console.error('Error updating response:', err);
    res.status(500).send('Failed to update response.');
  }
});

// Submit a new response
app.post('/submit', async (req, res) => {
  try {
    const { question, answer } = req.body;
    await pool.query('INSERT INTO responses (question, answer, timestamp) VALUES ($1, $2, NOW())', [
      question,
      answer,
    ]);
    res.status(200).send('Response submitted successfully.');
  } catch (err) {
    console.error('Error submitting response:', err);
    res.status(500).send('Failed to submit response.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});