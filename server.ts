import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log("Using Supabase as database engine.");
} else {
  console.log("Supabase credentials missing. Falling back to SQLite.");
}

const db = new Database("golf_shots.db");

// Initialize SQLite (Fallback)
try {
  const tableInfo = db.prepare("PRAGMA table_info(shots)").all() as any[];
  const hasSessionId = tableInfo.some(col => col.name === 'session_id');
  if (!hasSessionId && tableInfo.length > 0) {
    db.exec("ALTER TABLE shots ADD COLUMN session_id INTEGER");
    db.exec("ALTER TABLE shots ADD COLUMN club TEXT");
  }
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS shots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    club TEXT,
    club_speed REAL,
    ball_speed REAL,
    smash_factor REAL,
    launch_angle REAL,
    spin_rate REAL,
    carry_distance REAL,
    analysis TEXT,
    improvement TEXT,
    rating INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/sessions", async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('sessions').select('*').order('timestamp', { ascending: false });
        if (error) throw error;
        return res.json(data);
      }
      const sessions = db.prepare("SELECT * FROM sessions ORDER BY timestamp DESC").all();
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const { name } = req.body;
      if (supabase) {
        const { data, error } = await supabase.from('sessions').insert([{ name: name || "Ospecificerad session" }]).select();
        if (error) throw error;
        return res.json({ id: data[0].id });
      }
      const info = db.prepare("INSERT INTO sessions (name) VALUES (?)").run(name || "Ospecificerad session");
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/shots", async (req, res) => {
    try {
      const { session_id } = req.query;
      if (supabase) {
        let query = supabase.from('shots').select('*');
        if (session_id) query = query.eq('session_id', session_id);
        const { data, error } = await query.order('timestamp', { ascending: false }).limit(100);
        if (error) throw error;
        return res.json(data);
      }
      let query = "SELECT * FROM shots";
      let params = [];
      if (session_id) {
        query += " WHERE session_id = ?";
        params.push(session_id);
      }
      query += " ORDER BY timestamp DESC LIMIT 100";
      const shots = db.prepare(query).all(...params);
      res.json(shots);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/shots", async (req, res) => {
    try {
      const { 
        session_id, club, club_speed, ball_speed, smash_factor, launch_angle, 
        spin_rate, carry_distance, analysis, improvement, rating 
      } = req.body;

      if (supabase) {
        const { data, error } = await supabase.from('shots').insert([{
          session_id, club, club_speed, ball_speed, smash_factor, launch_angle, 
          spin_rate, carry_distance, analysis, improvement, rating
        }]).select();
        if (error) throw error;
        return res.json({ id: data[0].id });
      }

      const info = db.prepare(`
        INSERT INTO shots (
          session_id, club, club_speed, ball_speed, smash_factor, launch_angle, 
          spin_rate, carry_distance, analysis, improvement, rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session_id, club, club_speed, ball_speed, smash_factor, launch_angle, 
        spin_rate, carry_distance, analysis, improvement, rating
      );

      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
