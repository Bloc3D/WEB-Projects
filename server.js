
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// DB (lowdb) setup
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static front-end (your existing files)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB with defaults
async function initDB() {
  await db.read();
  db.data ||= { projects: [], contacts: [] };
  await db.write();
}
initDB();

/* Simple admin check using ADMIN_KEY in .env */
function checkAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!process.env.ADMIN_KEY) return next(); // if ADMIN_KEY not set, allow (dev mode)
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden: invalid admin key' });
  }
  next();
}

/* Projects API */
app.get('/api/projects', async (req, res) => {
  await db.read();
  res.json(db.data.projects || []);
});

app.get('/api/projects/:id', async (req, res) => {
  await db.read();
  const p = (db.data.projects || []).find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/projects', checkAdmin, async (req, res) => {
  const { title, description, url, tags = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const project = { id: nanoid(), title, description: description || '', url: url || '', tags };
  await db.read();
  db.data.projects.push(project);
  await db.write();
  res.status(201).json(project);
});

app.put('/api/projects/:id', checkAdmin, async (req, res) => {
  await db.read();
  const idx = (db.data.projects || []).findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = { ...db.data.projects[idx], ...req.body };
  db.data.projects[idx] = updated;
  await db.write();
  res.json(updated);
});

app.delete('/api/projects/:id', checkAdmin, async (req, res) => {
  await db.read();
  db.data.projects = (db.data.projects || []).filter(x => x.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

/* Contact API */
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!message || (!email && !name)) {
    return res.status(400).json({ error: 'Provide at least message and one contact field (name or email)' });
  }
  await db.read();
  const entry = { id: nanoid(), name: name || '', email: email || '', message, createdAt: new Date().toISOString() };
  db.data.contacts.push(entry);
  await db.write();

  // Optionally send email if SMTP credentials are set
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.CONTACT_DEST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `\"TechNova Contact\" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_DEST,
        subject: `New contact from ${entry.name || entry.email || 'visitor'}`,
        text: `Name: ${entry.name}\nEmail: ${entry.email}\nMessage:\n${entry.message}`
      });
    } catch (err) {
      console.error('Failed sending email:', err);
      // do not fail the request for email error
    }
  }

  res.status(201).json({ success: true, entry });
});

app.get('/api/contacts', checkAdmin, async (req, res) => {
  await db.read();
  res.json(db.data.contacts || []);
});

// Fallback - serve index.html for SPA routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
