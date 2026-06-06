const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(__dirname));

async function readDB() {
  try {
    const txt = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(DB_PATH, '[]');
      return [];
    }
    throw err;
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/applicants', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Replace entire applicants array (simple approach)
app.put('/api/applicants', async (req, res) => {
  const arr = req.body;
  if (!Array.isArray(arr)) return res.status(400).json({ error: 'Expected array body' });
  try {
    await writeDB(arr);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add single applicant
app.post('/api/applicants', async (req, res) => {
  const body = req.body;
  if (!body) return res.status(400).json({ error: 'Missing body' });
  try {
    // If client sends the full array (used by beacon/save), overwrite DB
    if (Array.isArray(body)) {
      await writeDB(body);
      return res.json({ ok: true });
    }
    // Otherwise treat as single applicant to append
    const applicant = body;
    const db = await readDB();
    const maxId = db.reduce((m, a) => Math.max(m, a.id || 1000), 1000);
    applicant.id = applicant.id || (maxId + 1);
    db.push(applicant);
    await writeDB(db);
    res.json(applicant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
