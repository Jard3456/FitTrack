const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const pool = new Pool(
    databaseUrl
      ? {
          connectionString: databaseUrl,
          ssl: process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : undefined,
        }
      : {
          host: process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.DB_PORT || 5432),
          database: process.env.DB_NAME || "fittrack",
          user: process.env.DB_USER || "postgres",
          password: process.env.DB_PASSWORD || "postgres",
        }
  );

  try {
    const schema = fs.readFileSync(
      path.resolve(__dirname, "../database/supabase-schema.sql"),
      "utf8"
    );

    await pool.query(schema);
    console.log("Base de datos y tablas de FitTrack listas en PostgreSQL/Supabase.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("No se pudo inicializar la base de datos:", error.message);
  process.exitCode = 1;
});
