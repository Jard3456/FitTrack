const path = require("node:path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const port = Number(process.env.API_PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || "change-this-development-secret";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "fittrack",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(cors());
app.use(express.json());

function publicUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
  };
}

function createSession(user) {
  return {
    token: jwt.sign({ sub: String(user.id) }, jwtSecret, { expiresIn: "7d" }),
    user: publicUser(user),
  };
}

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ message: "Sesión requerida." });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = String(payload.sub);
    return next();
  } catch {
    return res.status(401).json({ message: "La sesión no es válida o expiró." });
  }
}

function validateCredentials(email, password) {
  if (!email || !email.includes("@")) return "El correo no es válido.";
  if (!password || password.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return null;
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", database: "connected" });
  } catch {
    return res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const validationError = validateCredentials(email, password);

  if (!name) return res.status(400).json({ message: "El nombre es requerido." });
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length) {
      return res.status(409).json({ message: "El correo ya está registrado." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash]
    );
    const user = { id: result.insertId, name, email };

    return res.status(201).json(createSession(user));
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "No se pudo crear la cuenta." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const validationError = validateCredentials(email, password);

  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    const user = users[0];
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ message: "Correo o contraseña incorrectos." });
    }

    return res.json(createSession(user));
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "No se pudo iniciar sesión." });
  }
});

app.get("/api/exercises/custom", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, type, muscle, difficulty, equipment, instructions,
              safety_info AS safetyInfo
       FROM custom_exercises
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.userId]
    );

    return res.json(rows);
  } catch (error) {
    console.error("Get custom exercises error:", error.message);
    return res.status(500).json({ message: "No se pudieron consultar tus ejercicios." });
  }
});

app.post("/api/exercises/custom", requireAuth, async (req, res) => {
  const fields = {
    name: String(req.body?.name || "").trim(),
    type: String(req.body?.type || "").trim(),
    muscle: String(req.body?.muscle || "").trim(),
    difficulty: String(req.body?.difficulty || "").trim(),
    equipment: String(req.body?.equipment || "").trim(),
    instructions: String(req.body?.instructions || "").trim(),
    safetyInfo: String(req.body?.safetyInfo || "").trim(),
  };

  if (!fields.name || !fields.instructions) {
    return res.status(400).json({
      message: "El nombre y las instrucciones son obligatorios.",
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO custom_exercises
       (user_id, name, type, muscle, difficulty, equipment, instructions, safety_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        fields.name,
        fields.type || "Fuerza",
        fields.muscle || "General",
        fields.difficulty || "Intermedio",
        fields.equipment || "Sin equipo",
        fields.instructions,
        fields.safetyInfo || "Usa una técnica controlada y detente si sientes dolor.",
      ]
    );

    return res.status(201).json({ id: result.insertId, ...fields });
  } catch (error) {
    console.error("Create custom exercise error:", error.message);
    return res.status(500).json({ message: "No se pudo guardar el ejercicio." });
  }
});

app.delete("/api/exercises/custom/:exerciseId", requireAuth, async (req, res) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM custom_exercises WHERE id = ? AND user_id = ?",
      [req.params.exerciseId, req.userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Ejercicio no encontrado." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Delete custom exercise error:", error.message);
    return res.status(500).json({ message: "No se pudo eliminar el ejercicio." });
  }
});

function ensureOwnUser(req, res) {
  if (req.params.userId !== req.userId) {
    res.status(403).json({ message: "No puedes consultar otro usuario." });
    return false;
  }
  return true;
}

app.get("/api/progress/:userId", requireAuth, async (req, res) => {
  if (!ensureOwnUser(req, res)) return;

  try {
    const [rows] = await pool.execute(
      `SELECT u.name, p.weight, p.height, p.objective
       FROM users u
       LEFT JOIN user_progress p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [req.userId]
    );

    if (!rows.length) return res.status(404).json({ message: "Usuario no encontrado." });
    return res.json(rows[0]);
  } catch (error) {
    console.error("Get progress error:", error.message);
    return res.status(500).json({ message: "No se pudo consultar el progreso." });
  }
});

app.put("/api/progress/:userId", requireAuth, async (req, res) => {
  if (!ensureOwnUser(req, res)) return;

  const name = String(req.body?.name || "").trim();
  const weight = req.body?.weight || null;
  const height = req.body?.height || null;
  const objective = req.body?.objective || null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    if (name) {
      await connection.execute("UPDATE users SET name = ? WHERE id = ?", [
        name,
        req.userId,
      ]);
    }
    await connection.execute(
      `INSERT INTO user_progress (user_id, weight, height, objective)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         weight = VALUES(weight), height = VALUES(height), objective = VALUES(objective)`,
      [req.userId, weight, height, objective]
    );
    await connection.commit();
    return res.json({ message: "Progreso guardado." });
  } catch (error) {
    await connection.rollback();
    console.error("Save progress error:", error.message);
    return res.status(500).json({ message: "No se pudo guardar el progreso." });
  } finally {
    connection.release();
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`FitTrack API escuchando en http://0.0.0.0:${port}`);
});
