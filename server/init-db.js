const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    multipleStatements: true,
  });

  const schema = fs.readFileSync(
    path.resolve(__dirname, "../database/schema.sql"),
    "utf8"
  );
  await connection.query(schema);

  const [roleColumn] = await connection.query(
    "SHOW COLUMNS FROM fittrack.users LIKE 'role'"
  );

  if (!roleColumn.length) {
    await connection.query(
      "ALTER TABLE fittrack.users ADD COLUMN role ENUM('usuario', 'entrenador', 'administrador') NOT NULL DEFAULT 'usuario' AFTER password_hash"
    );
    console.log("Columna de roles agregada a users.");
  }

  await connection.end();
  console.log("Base de datos y tablas de FitTrack listas.");
}

main().catch((error) => {
  console.error("No se pudo inicializar la base de datos:", error.message);
  process.exitCode = 1;
});
