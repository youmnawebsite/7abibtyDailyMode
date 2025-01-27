const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

const responsesFilePath = path.join(__dirname, 'responses.json');

// Middleware to parse JSON
app.use(express.json());

// Serve static files (frontend)
app.use(express.static('public'));

// Load responses from file or initialize empty array
function loadResponses() {
  if (!fs.existsSync(responsesFilePath)) {
    fs.writeFileSync(responsesFilePath, JSON.stringify([]));
  }
  const data = fs.readFileSync(responsesFilePath, 'utf-8');
  return JSON.parse(data);
}

// Save responses to file
function saveResponses(responses) {
  fs.writeFileSync(responsesFilePath, JSON.stringify(responses, null, 2));
}

// Endpoint to get all responses
app.get('/responses', (req, res) => {
  try {
    const responses = loadResponses();
    res.json(responses);
  } catch (err) {
    res.status(500).send('Error reading responses.');
  }
});

// Endpoint to add a new response
app.post('/responses', (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).send('Question and answer are required.');
    }

    const responses = loadResponses();
    const newResponse = {
      id: responses.length > 0 ? responses[responses.length - 1].id + 1 : 1,
      question,
      answer,
      timestamp: new Date().toISOString(),
    };
    responses.push(newResponse);
    saveResponses(responses);
    res.status(201).json(newResponse);
  } catch (err) {
    res.status(500).send('Error saving response.');
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
