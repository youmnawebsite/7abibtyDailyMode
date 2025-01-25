const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/submit", (req, res) => {
  const { question, answer } = req.body;
  const filePath = path.join(__dirname, "responses.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    let responses = [];
    if (err) {
      if (err.code === "ENOENT") {
        responses = [];
      } else {
        return res.status(500).send("Error reading file.");
      }
    } else {
      try {
        responses = JSON.parse(data);
      } catch {
        responses = [];
      }
    }

    responses.push({ question, answer, date: new Date().toISOString() });

    fs.writeFile(filePath, JSON.stringify(responses, null, 2), (err) => {
      if (err) return res.status(500).send("Error saving answer.");
      res.status(200).send("Answer saved!");
    });
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
