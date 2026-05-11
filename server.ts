import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.API_PORT || '3002', 10);

// Data directory for persistent storage
const DATA_DIR = path.join(__dirname, 'data', 'battles');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Middleware
app.use(express.json({ limit: '5mb' }));

// CORS — allow Vite dev server
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Helpers ────────────────────────────────────────────────

function battlePath(id: string): string {
  // Sanitize ID to avoid path traversal
  const safe = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

function readBattle(id: string): any | null {
  const p = battlePath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeBattle(battle: any): void {
  fs.writeFileSync(battlePath(battle.id), JSON.stringify(battle, null, 2), 'utf-8');
}

// ─── Routes ─────────────────────────────────────────────────

// List all battles (sorted by date descending)
app.get('/api/battles', (_req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const battles = files
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(battles);
  } catch (err) {
    console.error('GET /api/battles error:', err);
    res.status(500).json({ error: 'Failed to list battles' });
  }
});

// Get a single battle
app.get('/api/battles/:id', (req, res) => {
  const battle = readBattle(req.params.id);
  if (!battle) return res.status(404).json({ error: 'Battle not found' });
  res.json(battle);
});

// Create / update a battle
app.post('/api/battles', (req, res) => {
  try {
    const battle = req.body;
    if (!battle.id) {
      return res.status(400).json({ error: 'Missing battle id' });
    }
    writeBattle(battle);
    res.status(201).json({ ok: true, id: battle.id });
  } catch (err) {
    console.error('POST /api/battles error:', err);
    res.status(500).json({ error: 'Failed to save battle' });
  }
});

// Delete a battle
app.delete('/api/battles/:id', (req, res) => {
  const p = battlePath(req.params.id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ ok: true });
});

// ─── Start ──────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚔️  MayronCombat API running on http://0.0.0.0:${PORT}`);
  console.log(`   Data directory: ${DATA_DIR}`);
});
