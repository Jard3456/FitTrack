const path = require("node:path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || "change-this-development-secret";
const allowedRoles = new Set(["usuario", "entrenador", "administrador"]);

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres en producción.");
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const databaseConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DB_POOL_MAX || 10),
    }
  : {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || "fittrack",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      max: Number(process.env.DB_POOL_MAX || 10),
    };

const database = new Pool(databaseConfig);

function toPostgresQuery(sql) {
  let parameterIndex = 0;
  let query = sql
    .replace(/\?/g, () => `$${++parameterIndex}`)
    .replace(
      /DATE_SUB\(CURRENT_DATE, INTERVAL WEEKDAY\(CURRENT_DATE\) DAY\)/gi,
      "date_trunc('week', CURRENT_DATE)::date"
    )
    .replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d'\)/gi, "TO_CHAR($1, 'YYYY-MM-DD')")
    .replace(/DATE\(([^()]+)\)/gi, "($1)::date")
    .replace(
      /ON DUPLICATE KEY UPDATE\s+weight = VALUES\(weight\),\s*target_weight = VALUES\(target_weight\),\s*height = VALUES\(height\),\s*objective = VALUES\(objective\)/gi,
      "ON CONFLICT (user_id) DO UPDATE SET weight = EXCLUDED.weight, target_weight = EXCLUDED.target_weight, height = EXCLUDED.height, objective = EXCLUDED.objective"
    );

  return query.replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/g, 'AS "$1"');
}

function mysqlCompatibleResult(result) {
  if (["SELECT", "SHOW", "WITH"].includes(result.command)) {
    return result.rows;
  }

  return {
    affectedRows: result.rowCount,
    insertId: result.rows[0]?.id,
  };
}

async function runQuery(client, sql, values = []) {
  const result = await client.query(toPostgresQuery(sql), values);
  return [mysqlCompatibleResult(result), result];
}

const pool = {
  query: (sql, values) => runQuery(database, sql, values),
  execute: (sql, values) => runQuery(database, sql, values),
  async getConnection() {
    const client = await database.connect();
    return {
      query: (sql, values) => runQuery(client, sql, values),
      execute: (sql, values) => runQuery(client, sql, values),
      beginTransaction: () => client.query("BEGIN"),
      commit: () => client.query("COMMIT"),
      rollback: () => client.query("ROLLBACK"),
      release: () => client.release(),
    };
  },
};

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  throw new Error("CORS_ORIGINS debe configurarse en producción.");
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origen no permitido por CORS."));
    },
  })
);
app.use(express.json());

function publicUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: allowedRoles.has(user.role) ? user.role : "usuario",
  };
}

function createSession(user) {
  const safeUser = publicUser(user);
  return {
    token: jwt.sign(
      { sub: safeUser.id, role: safeUser.role },
      jwtSecret,
      { expiresIn: "7d" }
    ),
    user: safeUser,
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
    req.userRole = allowedRoles.has(payload.role) ? payload.role : "usuario";
    return next();
  } catch {
    return res.status(401).json({ message: "La sesión no es válida o expiró." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: "No tienes permisos para esta acción." });
    }
    return next();
  };
}

function validateRole(role) {
  return allowedRoles.has(role) ? role : null;
}

function validateCredentials(email, password) {
  if (!email || !email.includes("@")) return "El correo no es válido.";
  if (!password || password.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return null;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id",
      [name, email, passwordHash, "usuario"]
    );
    const user = { id: result.insertId, name, email, role: "usuario" };

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
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
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

app.get("/api/users", requireAuth, requireRole("administrador"), async (_req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    return res.json(users.map(publicUser));
  } catch (error) {
    console.error("List users error:", error.message);
    return res.status(500).json({ message: "No se pudieron consultar los usuarios." });
  }
});

app.patch(
  "/api/users/:userId/role",
  requireAuth,
  requireRole("administrador"),
  async (req, res) => {
    const role = validateRole(String(req.body?.role || "").trim().toLowerCase());

    if (!role) {
      return res.status(400).json({
        message: "El rol debe ser usuario, entrenador o administrador.",
      });
    }

    try {
      const [result] = await pool.execute(
        "UPDATE users SET role = ? WHERE id = ?",
        [role, req.params.userId]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }

      return res.json({ message: "Rol actualizado.", role });
    } catch (error) {
      console.error("Update user role error:", error.message);
      return res.status(500).json({ message: "No se pudo actualizar el rol." });
    }
  }
);

app.get("/api/trainer/users", requireAuth, requireRole("entrenador"), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email,
              a.trainer_id AS trainerId,
              t.name AS trainerName,
              (SELECT COUNT(*) FROM routines r
               WHERE r.user_id = u.id AND r.trainer_id = ?) AS routineCount,
              CASE WHEN a.user_id IS NULL THEN 1 ELSE 0 END AS isAvailable,
              CASE WHEN a.trainer_id = ? THEN 1 ELSE 0 END AS assignedToMe
       FROM users u
       LEFT JOIN trainer_user_assignments a ON a.user_id = u.id
       LEFT JOIN users t ON t.id = a.trainer_id
       WHERE u.role = 'usuario'
       ORDER BY u.name ASC`,
      [req.userId, req.userId]
    );

    return res.json(
      rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        email: row.email,
        trainerId: row.trainerId === null ? null : String(row.trainerId),
        trainerName: row.trainerName || null,
        routineCount: Number(row.routineCount || 0),
        isAvailable: Boolean(row.isAvailable),
        assignedToMe: Boolean(row.assignedToMe),
      }))
    );
  } catch (error) {
    console.error("List trainer users error:", error.message);
    return res.status(500).json({ message: "No se pudieron consultar los usuarios." });
  }
});

app.post(
  "/api/trainer/users/:userId",
  requireAuth,
  requireRole("entrenador"),
  async (req, res) => {
    const userId = String(req.params.userId);

    if (userId === req.userId) {
      return res.status(400).json({ message: "No puedes asignarte como tu propio usuario." });
    }

    try {
      const [users] = await pool.execute(
        "SELECT id, role FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      const user = users[0];

      if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
      if (user.role !== "usuario") {
        return res.status(400).json({
          message: "Solo puedes asignar usuarios con rol usuario.",
        });
      }

      await pool.execute(
        "INSERT INTO trainer_user_assignments (trainer_id, user_id) VALUES (?, ?)",
        [req.userId, userId]
      );

      return res.status(201).json({ message: "Usuario asignado correctamente." });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Este usuario ya está siendo entrenado por otro entrenador.",
        });
      }

      console.error("Assign trainer user error:", error.message);
      return res.status(500).json({ message: "No se pudo asignar el usuario." });
    }
  }
);

app.delete(
  "/api/trainer/users/:userId",
  requireAuth,
  requireRole("entrenador"),
  async (req, res) => {
    try {
      const [result] = await pool.execute(
        "DELETE FROM trainer_user_assignments WHERE trainer_id = ? AND user_id = ?",
        [req.userId, req.params.userId]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Este usuario no está asignado a ti." });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Remove trainer user error:", error.message);
      return res.status(500).json({ message: "No se pudo liberar el usuario." });
    }
  }
);

app.post(
  "/api/trainer/users/:userId/routines",
  requireAuth,
  requireRole("entrenador"),
  async (req, res) => {
    const userId = String(req.params.userId);
    const title = String(req.body?.title || "").trim();
    const level = String(req.body?.level || "Intermedio").trim();
    const durationMinutes = Number(req.body?.durationMinutes || 0);
    const scheduledDate = String(req.body?.scheduledDate || "").trim();
    const exerciseIds = Array.from(
      new Set(
        (Array.isArray(req.body?.exerciseIds) ? req.body.exerciseIds : [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );

    if (
      !title ||
      !exerciseIds.length ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      !isValidIsoDate(scheduledDate)
    ) {
      return res.status(400).json({
        message: "El título, la fecha, la duración y al menos un ejercicio son obligatorios.",
      });
    }

    try {
      const [assignment] = await pool.execute(
        `SELECT id FROM trainer_user_assignments
         WHERE trainer_id = ? AND user_id = ? LIMIT 1`,
        [req.userId, userId]
      );

      if (!assignment.length) {
        return res.status(403).json({
          message: "Solo puedes asignar rutinas a tus usuarios entrenados.",
        });
      }

      const placeholders = exerciseIds.map(() => "?").join(", ");
      const [exercises] = await pool.query(
        `SELECT id FROM custom_exercises
         WHERE user_id = ? AND id IN (${placeholders})`,
        [req.userId, ...exerciseIds]
      );

      if (exercises.length !== exerciseIds.length) {
        return res.status(400).json({
          message: "Solo puedes agregar ejercicios registrados por ti.",
        });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [routineResult] = await connection.execute(
          `INSERT INTO routines
           (trainer_id, user_id, title, level, duration_minutes, scheduled_date)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
          [
            req.userId,
            userId,
            title,
            level || "Intermedio",
            durationMinutes,
            scheduledDate,
          ]
        );

        for (const [index, exerciseId] of exerciseIds.entries()) {
          await connection.execute(
            `INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order)
             VALUES (?, ?, ?)`,
            [routineResult.insertId, exerciseId, index + 1]
          );
        }

        await connection.commit();
        return res.status(201).json({
          id: String(routineResult.insertId),
          title,
          level: level || "Intermedio",
          durationMinutes,
          scheduledDate,
          exerciseCount: exerciseIds.length,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Create routine error:", error.message);
      return res.status(500).json({ message: "No se pudo guardar la rutina." });
    }
  }
);

app.get("/api/routines", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.title, r.level, r.duration_minutes AS durationMinutes,
              DATE_FORMAT(r.scheduled_date, '%Y-%m-%d') AS scheduledDate,
              r.created_at,
              (SELECT COUNT(*) FROM routine_completions rc
               WHERE rc.routine_id = r.id AND rc.user_id = ?) AS completedCount,
              (SELECT MAX(rc.completed_at) FROM routine_completions rc
               WHERE rc.routine_id = r.id AND rc.user_id = ?) AS lastCompletedAt,
              ce.id AS exerciseId, ce.name AS exerciseName, ce.type AS exerciseType
       FROM routines r
       LEFT JOIN routine_exercises re ON re.routine_id = r.id
       LEFT JOIN custom_exercises ce ON ce.id = re.exercise_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC, re.exercise_order ASC`,
      [req.userId, req.userId, req.userId]
    );

    const routinesById = new Map();
    for (const row of rows) {
      const routineId = String(row.id);
      if (!routinesById.has(routineId)) {
        routinesById.set(routineId, {
          id: routineId,
          title: row.title,
          level: row.level,
          durationMinutes: Number(row.durationMinutes || 0),
          scheduledDate: row.scheduledDate,
          completedCount: Number(row.completedCount || 0),
          lastCompletedAt: row.lastCompletedAt,
          exercises: [],
        });
      }

      if (row.exerciseId !== null) {
        routinesById.get(routineId).exercises.push({
          id: String(row.exerciseId),
          name: row.exerciseName,
          type: row.exerciseType,
        });
      }
    }

    return res.json(Array.from(routinesById.values()));
  } catch (error) {
    console.error("Get routines error:", error.message);
    return res.status(500).json({ message: "No se pudieron consultar las rutinas." });
  }
});

app.post("/api/routines/:routineId/complete", requireAuth, async (req, res) => {
  const routineId = String(req.params.routineId);
  const submittedLogs = Array.isArray(req.body?.exercises)
    ? req.body.exercises
    : [];

  try {
    const [routineRows] = await pool.execute(
      `SELECT id, DATE_FORMAT(scheduled_date, '%Y-%m-%d') AS scheduledDate
       FROM routines WHERE id = ? AND user_id = ? LIMIT 1`,
      [routineId, req.userId]
    );

    if (!routineRows.length) {
      return res.status(404).json({ message: "Rutina no encontrada." });
    }

    const [todayRows] = await pool.execute(
      `SELECT id FROM routines
       WHERE id = ? AND user_id = ? AND scheduled_date = CURRENT_DATE
       LIMIT 1`,
      [routineId, req.userId]
    );

    if (!todayRows.length) {
      return res.status(400).json({
        message: `Esta rutina está programada para el ${routineRows[0].scheduledDate} y solo puede completarse el día actual.`,
      });
    }

    const [existingCompletion] = await pool.execute(
      `SELECT id FROM routine_completions
       WHERE routine_id = ? AND user_id = ? LIMIT 1`,
      [routineId, req.userId]
    );

    if (existingCompletion.length) {
      return res.status(409).json({ message: "Esta rutina ya fue completada." });
    }

    const [routineExercises] = await pool.execute(
      `SELECT r.id AS routineId, re.exercise_id AS exerciseId,
              ce.name AS exerciseName, ce.type AS exerciseType
       FROM routines r
       INNER JOIN routine_exercises re ON re.routine_id = r.id
       INNER JOIN custom_exercises ce ON ce.id = re.exercise_id
       WHERE r.id = ? AND r.user_id = ?
       ORDER BY re.exercise_order ASC`,
      [routineId, req.userId]
    );

    if (!routineExercises.length) {
      return res.status(404).json({ message: "Rutina no encontrada." });
    }

    const logByExercise = new Map(
      submittedLogs.map((log) => [String(log?.exerciseId), log])
    );
    const normalizedLogs = [];

    for (const exercise of routineExercises) {
      const log = logByExercise.get(String(exercise.exerciseId));
      if (!log) {
        return res.status(400).json({
          message: `Registra los datos de ${exercise.exerciseName}.`,
        });
      }

      const type = String(exercise.exerciseType || "").toLowerCase();
      const isCardio = type.includes("cardio");
      const weightKg = log.weightKg === "" || log.weightKg == null
        ? null
        : Number(log.weightKg);
      const durationMinutes = log.durationMinutes === "" || log.durationMinutes == null
        ? null
        : Number(log.durationMinutes);

      if (isCardio && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
        return res.status(400).json({
          message: `Registra el tiempo realizado en ${exercise.exerciseName}.`,
        });
      }

      if (!isCardio && type.includes("fuerza") && (!Number.isFinite(weightKg) || weightKg < 0)) {
        return res.status(400).json({
          message: `Registra el peso utilizado en ${exercise.exerciseName}.`,
        });
      }

      normalizedLogs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        exerciseType: exercise.exerciseType || "General",
        weightKg: isCardio ? null : weightKg,
        durationMinutes: isCardio ? durationMinutes : null,
        notes: String(log.notes || "").trim() || null,
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [completionResult] = await connection.execute(
        `INSERT INTO routine_completions (routine_id, user_id, total_exercises)
         VALUES (?, ?, ?) RETURNING id`,
        [routineId, req.userId, routineExercises.length]
      );

      for (const log of normalizedLogs) {
        await connection.execute(
          `INSERT INTO exercise_logs
           (completion_id, routine_id, exercise_id, exercise_name, exercise_type,
            weight_kg, duration_minutes, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            completionResult.insertId,
            routineId,
            log.exerciseId,
            log.exerciseName,
            log.exerciseType,
            log.weightKg,
            log.durationMinutes,
            log.notes,
          ]
        );
      }

      await connection.commit();
      return res.status(201).json({
        message: "Rutina completada y progreso guardado.",
        completionId: String(completionResult.insertId),
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Complete routine error:", error.message);
    return res.status(500).json({ message: "No se pudo guardar el progreso de la rutina." });
  }
});

app.get(
  "/api/trainer/users/:userId/progress",
  requireAuth,
  requireRole("entrenador"),
  async (req, res) => {
    try {
      const [assignment] = await pool.execute(
        `SELECT id FROM trainer_user_assignments
         WHERE trainer_id = ? AND user_id = ? LIMIT 1`,
        [req.userId, req.params.userId]
      );

      if (!assignment.length) {
        return res.status(403).json({
          message: "Solo puedes consultar el progreso de tus usuarios.",
        });
      }

      const [goalRows] = await pool.execute(
        `SELECT p.weight AS currentWeight,
                p.target_weight AS targetWeight,
                COALESCE(
                  (SELECT wh.weight FROM weight_history wh
                   WHERE wh.user_id = u.id
                   ORDER BY wh.recorded_date ASC, wh.id ASC LIMIT 1),
                  p.weight
                ) AS startingWeight
         FROM users u
         LEFT JOIN user_progress p ON p.user_id = u.id
         WHERE u.id = ? LIMIT 1`,
        [req.params.userId]
      );

      const [weightHistory] = await pool.execute(
        `SELECT weight, DATE_FORMAT(recorded_date, '%Y-%m-%d') AS recordedDate
         FROM weight_history
         WHERE user_id = ?
         ORDER BY recorded_date DESC, id DESC`,
        [req.params.userId]
      );

      const [rows] = await pool.execute(
        `SELECT r.id, r.title, r.level,
                r.duration_minutes AS durationMinutes,
                DATE_FORMAT(r.scheduled_date, '%Y-%m-%d') AS scheduledDate,
                CASE
                  WHEN r.scheduled_date < CURRENT_DATE THEN 'past'
                  WHEN r.scheduled_date > CURRENT_DATE THEN 'future'
                  ELSE 'current'
                END AS period,
                rc.id AS completionId, rc.completed_at AS completedAt,
                rc.total_exercises AS totalExercises,
                ce.id AS exerciseId, ce.name AS exerciseName,
                ce.type AS exerciseType,
                el.weight_kg AS weightKg,
                el.duration_minutes AS durationMinutesLogged,
                el.notes
         FROM routines r
         LEFT JOIN routine_exercises re ON re.routine_id = r.id
         LEFT JOIN custom_exercises ce ON ce.id = re.exercise_id
         LEFT JOIN routine_completions rc
           ON rc.routine_id = r.id AND rc.user_id = r.user_id
         LEFT JOIN exercise_logs el
           ON el.completion_id = rc.id AND el.exercise_id = ce.id
         WHERE r.user_id = ? AND r.trainer_id = ?
         ORDER BY r.scheduled_date DESC, re.exercise_order ASC`,
        [req.params.userId, req.userId]
      );

      const routinesById = new Map();
      for (const row of rows) {
        const routineId = String(row.id);
        if (!routinesById.has(routineId)) {
          routinesById.set(routineId, {
            id: routineId,
            title: row.title,
            level: row.level,
            durationMinutes: Number(row.durationMinutes || 0),
            scheduledDate: row.scheduledDate,
            period: row.period,
            completed: row.completionId !== null,
            completedAt: row.completedAt,
            totalExercises: Number(row.totalExercises || 0),
            exercises: [],
          });
        }

        if (row.exerciseId !== null) {
          routinesById.get(routineId).exercises.push({
            name: row.exerciseName,
            type: row.exerciseType,
            logged: row.completionId !== null,
            weightKg: row.weightKg === null ? null : Number(row.weightKg),
            durationMinutes:
              row.durationMinutesLogged === null
                ? null
                : Number(row.durationMinutesLogged),
            notes: row.notes,
          });
        }
      }

      const routines = Array.from(routinesById.values()).map((routine) => ({
        ...routine,
        totalExercises: routine.totalExercises || routine.exercises.length,
      }));

      const goal = goalRows[0] || {};
      return res.json({
        goal: {
          currentWeight: goal.currentWeight ?? null,
          targetWeight: goal.targetWeight ?? null,
          startingWeight: goal.startingWeight ?? null,
          weightHistory,
        },
        routines: {
          past: routines.filter((routine) => routine.period === "past"),
          current: routines.filter((routine) => routine.period === "current"),
          future: routines.filter((routine) => routine.period === "future"),
        },
      });
    } catch (error) {
      console.error("Get trainee progress error:", error.message);
      return res.status(500).json({ message: "No se pudo consultar el progreso." });
    }
  }
);

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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
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
      `SELECT u.name, p.weight, p.height, p.objective,
              p.target_weight AS targetWeight,
              COALESCE(
                (SELECT wh.weight FROM weight_history wh
                 WHERE wh.user_id = u.id
                 ORDER BY wh.recorded_date ASC, wh.id ASC LIMIT 1),
                p.weight
              ) AS startingWeight,
              (SELECT DATE_FORMAT(wh.recorded_date, '%Y-%m-%d')
               FROM weight_history wh
               WHERE wh.user_id = u.id
               ORDER BY wh.recorded_date DESC, wh.id DESC LIMIT 1) AS lastWeightDate,
              CASE WHEN EXISTS (
                SELECT 1 FROM weight_history wh
                WHERE wh.user_id = u.id AND wh.recorded_date = CURRENT_DATE
              ) THEN 0 ELSE 1 END AS canRecordWeight
       FROM users u
       LEFT JOIN user_progress p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [req.userId]
    );

    if (!rows.length) return res.status(404).json({ message: "Usuario no encontrado." });

    const [history] = await pool.execute(
      `SELECT weight, DATE_FORMAT(recorded_date, '%Y-%m-%d') AS recordedDate
       FROM weight_history
       WHERE user_id = ?
       ORDER BY recorded_date DESC, id DESC`,
      [req.userId]
    );

    const [weeklyRows] = await pool.execute(
      `SELECT
         DATE_FORMAT(
           DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY),
           '%Y-%m-%d'
         ) AS weekStart,
         DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS weekEnd,
         COUNT(DISTINCT el.id) AS completedTrainings,
         COUNT(DISTINCT rc.id) AS completedRoutines
       FROM routine_completions rc
       LEFT JOIN exercise_logs el ON el.completion_id = rc.id
       WHERE rc.user_id = ?
         AND DATE(rc.completed_at) BETWEEN
           DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY)
           AND CURRENT_DATE`,
      [req.userId]
    );

    const weeklyActivity = weeklyRows[0] || {};

    return res.json({
      ...rows[0],
      weightHistory: history,
      weeklyActivity: {
        weekStart: weeklyActivity.weekStart,
        weekEnd: weeklyActivity.weekEnd,
        completedTrainings: Number(weeklyActivity.completedTrainings || 0),
        completedRoutines: Number(weeklyActivity.completedRoutines || 0),
      },
    });
  } catch (error) {
    console.error("Get progress error:", error.message);
    return res.status(500).json({ message: "No se pudo consultar el progreso." });
  }
});

app.put("/api/progress/:userId", requireAuth, async (req, res) => {
  if (!ensureOwnUser(req, res)) return;

  const name = String(req.body?.name || "").trim();
  const hasWeight = req.body?.weight !== undefined &&
    req.body?.weight !== null &&
    String(req.body.weight).trim() !== "";
  const hasTargetWeight = req.body?.targetWeight !== undefined &&
    req.body?.targetWeight !== null &&
    String(req.body.targetWeight).trim() !== "";
  const weight = hasWeight ? Number(String(req.body.weight).replace(",", ".")) : null;
  const targetWeight = hasTargetWeight
    ? Number(String(req.body.targetWeight).replace(",", "."))
    : null;
  const height = req.body?.height || null;
  const objective = req.body?.objective || null;

  if (hasWeight && (!Number.isFinite(weight) || weight <= 0)) {
    return res.status(400).json({ message: "El peso debe ser un número mayor que cero." });
  }

  if (hasTargetWeight && (!Number.isFinite(targetWeight) || targetWeight <= 0)) {
    return res.status(400).json({ message: "La meta de peso debe ser un número mayor que cero." });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingProgress] = await connection.execute(
      "SELECT weight, target_weight, height, objective FROM user_progress WHERE user_id = ? LIMIT 1",
      [req.userId]
    );
    const currentProgress = existingProgress[0] || {};

    const [todayWeightEntries] = await connection.execute(
      `SELECT id, weight FROM weight_history
       WHERE user_id = ? AND recorded_date = CURRENT_DATE
       LIMIT 1`,
      [req.userId]
    );

    if (hasWeight && todayWeightEntries.length) {
      const todayWeight = Number(todayWeightEntries[0].weight);
      if (todayWeight.toFixed(2) !== Number(weight).toFixed(2)) {
        await connection.rollback();
        return res.status(409).json({
          message: "Ya registraste tu peso de hoy. Podrás actualizarlo nuevamente mañana.",
        });
      }
    }

    if (name) {
      await connection.execute("UPDATE users SET name = ? WHERE id = ?", [
        name,
        req.userId,
      ]);
    }

    if (hasWeight && !todayWeightEntries.length) {
      await connection.execute(
        `INSERT INTO weight_history (user_id, weight, recorded_date)
         VALUES (?, ?, CURRENT_DATE)`,
        [req.userId, weight]
      );
    }

    await connection.execute(
      `INSERT INTO user_progress (user_id, weight, target_weight, height, objective)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         weight = VALUES(weight), target_weight = VALUES(target_weight),
         height = VALUES(height), objective = VALUES(objective)`,
      [
        req.userId,
        hasWeight ? weight : currentProgress.weight || null,
        hasTargetWeight ? targetWeight : currentProgress.target_weight || null,
        height || currentProgress.height || null,
        objective || currentProgress.objective || null,
      ]
    );
    await connection.commit();
    return res.json({
      message: "Progreso guardado.",
      canRecordWeight: !todayWeightEntries.length && !hasWeight,
      lastWeightDate: hasWeight || todayWeightEntries.length
        ? new Date().toISOString().slice(0, 10)
        : null,
    });
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
