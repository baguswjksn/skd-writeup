const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const methodOverride = require('method-override');

app.use(methodOverride('_method'));


const db = new sqlite3.Database('data/skd_database.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS skd_writeup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT,
    explanation TEXT,
    category TEXT,
    type TEXT,
    is_public INTEGER DEFAULT 1
  )
`;
db.run(createTableQuery, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Table initialized successfully.');
});

app.get('/d', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  
  // Get filter parameters
  const { category, type, search } = req.query;

  // Build dynamic WHERE clause
  let whereClauses = ['is_public = 1'];
  let queryParams = [];

  if (category) {
    whereClauses.push('category = ?');
    queryParams.push(category);
  }

  if (type) {
    whereClauses.push('type = ?');
    queryParams.push(type);
  }

  if (search) {
    whereClauses.push('question LIKE ?');
    queryParams.push(`%${search}%`);
  }

  const where = whereClauses.join(' AND ');
  
  const query = `
    SELECT id, question, category, type 
    FROM skd_writeup 
    ${where ? 'WHERE ' + where : ''}
    LIMIT ? OFFSET ?`;

  // Add pagination parameters
  queryParams.push(pageSize, offset);

  db.all(query, queryParams, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.render('index', { 
      questions: rows, 
      page,
      pageSize,
      category: category || '',
      type: type || '',
      search: search || ''
    });
  });
});


app.get('/q/:id', (req, res) => {
  const query = "SELECT question, answer, explanation, category, type FROM skd_writeup WHERE id = ? AND is_public = 1";
  const id = req.params.id;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).render('question', { question: null });
    }
    res.render('question', { question: row });
  });
});

app.get('/f', (req, res) => {
  const query = "SELECT id, question, answer, category, type, explanation FROM skd_writeup WHERE is_public = 1 ORDER BY RANDOM() LIMIT 1";
  db.get(query, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.render('flash', { question: row || null });
  });
});

app.use(express.static('public'));

app.get('/', (req, res) => {
    // Send the static HTML file
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
