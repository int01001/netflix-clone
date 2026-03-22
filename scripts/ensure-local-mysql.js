/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env" });
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const mysql = require("mysql2/promise");

const host = process.env.DB_HOST ?? "127.0.0.1";
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER ?? "root";
const password = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME ?? "netflix_local";

const basedir =
  process.env.MYSQL_BASEDIR ?? "C:\\Program Files\\MySQL\\MySQL Server 8.4";
const mysqldPath =
  process.env.MYSQLD_PATH ?? path.join(basedir, "bin", "mysqld.exe");
const dataDir =
  process.env.MYSQL_DATA_DIR ?? path.join(process.cwd(), ".mysql", "data");
const logFile =
  process.env.MYSQL_LOG_FILE ?? path.join(process.cwd(), ".mysql", "mysqld.log");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function canConnect() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: dbName,
      connectTimeout: 2000,
    });
    await connection.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

async function canReachServer() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 2000,
    });
    await connection.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

function isLocalMysql() {
  return host === "127.0.0.1" || host === "localhost";
}

function initializeDataDirIfNeeded() {
  if (fs.existsSync(path.join(dataDir, "mysql"))) {
    return;
  }

  fs.mkdirSync(dataDir, { recursive: true });

  const init = spawn(
    mysqldPath,
    [`--initialize-insecure`, `--basedir=${basedir}`, `--datadir=${dataDir}`],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );

  return new Promise((resolve, reject) => {
    init.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`mysqld --initialize-insecure failed with exit code ${code}`));
    });
    init.on("error", reject);
  });
}

async function startLocalMysql() {
  if (!fs.existsSync(mysqldPath)) {
    throw new Error(`mysqld.exe not found at ${mysqldPath}`);
  }

  await initializeDataDirIfNeeded();
  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const child = spawn(
    mysqldPath,
    [
      `--basedir=${basedir}`,
      `--datadir=${dataDir}`,
      `--port=${port}`,
      `--bind-address=127.0.0.1`,
      `--log-error=${logFile}`,
    ],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );

  child.unref();
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await canReachServer()) {
      return;
    }
    await sleep(1000);
  }

  throw new Error(
    `MySQL did not become ready on ${host}:${port}. Check ${logFile}`,
  );
}

async function main() {
  if (await canConnect()) {
    console.log(`MySQL is ready on ${host}:${port}/${dbName}`);
    return;
  }

  if (await canReachServer()) {
    console.log(
      `MySQL server is running on ${host}:${port}, but database ${dbName} is not ready yet.`,
    );
    return;
  }

  if (!isLocalMysql()) {
    throw new Error(`Cannot auto-start remote MySQL host ${host}`);
  }

  console.log(`Starting local MySQL for ${dbName} on ${host}:${port}...`);
  await startLocalMysql();
  await waitUntilReady();
  console.log(`Local MySQL is running on ${host}:${port}`);
}

main().catch((error) => {
  console.error("Failed to ensure local MySQL:", error.message);
  process.exit(1);
});
