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
// Endpoint to add a new response
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

// Endpoint to delete a specific response by ID
app.delete('/responses/:id', (req, res) => {
  try {
    const responseId = parseInt(req.params.id, 10);
    const responses = loadResponses();
    const filteredResponses = responses.filter(response => response.id !== responseId);

    if (responses.length === filteredResponses.length) {
      return res.status(404).send('Response not found.');
    }

    saveResponses(filteredResponses);
    res.send('Response deleted.');
  } catch (err) {
    res.status(500).send('Error deleting response.');
  }
});

// Endpoint to delete all responses
app.delete('/responses', (req, res) => {
  try {
    saveResponses([]);
    res.send('All responses deleted.');
  } catch (err) {
    res.status(500).send('Error deleting all responses.');
  }
});

// Serve the admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
