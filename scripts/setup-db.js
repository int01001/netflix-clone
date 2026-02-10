/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env" });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const host = process.env.DB_HOST ?? "127.0.0.1";
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER ?? "root";
const password = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME ?? "netflix_local";

async function main() {
  const sqlPath = path.join(process.cwd(), "scripts", "init-db.sql");
  const sql = fs
    .readFileSync(sqlPath, "utf8")
    .replace(/netflix_local/g, dbName);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  console.log(
    `Running init script against mysql://${user}@${host}:${port}/${dbName}`,
  );
  await connection.query(sql);
  await connection.end();
  console.log("Database created and seeded successfully.");
}

main().catch((error) => {
  console.error("Failed to set up database:", error.message);
  process.exit(1);
});
