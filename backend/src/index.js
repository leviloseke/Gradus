import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { migrate } from './db.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import programRoutes from './routes/programs.js';
import exerciseRoutes from './routes/exercises.js';
import sessionRoutes from './routes/sessions.js';
import bodyWeightRoutes from './routes/bodyweight.js';
import statsRoutes from './routes/stats.js';
import exportRoutes from './routes/exportData.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/programs', requireAuth, programRoutes);
app.use('/api/exercises', requireAuth, exerciseRoutes);
app.use('/api/sessions', requireAuth, sessionRoutes);
app.use('/api/body-weight', requireAuth, bodyWeightRoutes);
app.use('/api/stats', requireAuth, statsRoutes);
app.use('/api/export', requireAuth, exportRoutes);

// Future Apple Health endpoints — stubbed so the API surface is stable
app.get('/api/health/auth-url', requireAuth, (req, res) =>
  res.status(501).json({ error: 'Health integration not yet implemented' }));
app.post('/api/health/callback', requireAuth, (req, res) =>
  res.status(501).json({ error: 'Health integration not yet implemented' }));
app.get('/api/health/sync-status', requireAuth, (req, res) =>
  res.json({ connected: false, last_sync: null }));
app.post('/api/health/sync', requireAuth, (req, res) =>
  res.status(501).json({ error: 'Health integration not yet implemented' }));

// In production the frontend build is copied into ./public — serve it from
// the same origin so no separate web server or /api proxy is needed.
const staticDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 5000;
migrate()
  .then(() => app.listen(port, () => console.log(`Gradus API listening on :${port}`)))
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
