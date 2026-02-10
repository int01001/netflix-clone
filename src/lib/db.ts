import mysql from "mysql2/promise";

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

declare global {
  var mysqlPool: mysql.Pool | undefined;
}

const buildConfig = (): DbConfig => ({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "netflix_local",
});

export const getPool = (): mysql.Pool => {
  if (!globalThis.mysqlPool) {
    globalThis.mysqlPool = mysql.createPool({
      ...buildConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return globalThis.mysqlPool;
};

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  values?: unknown[],
): Promise<T> {
  const [rows] = await getPool().query(sql, values);
  return rows as T;
}

export async function execute(
  sql: string,
  values?: unknown[],
): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute<mysql.ResultSetHeader>(sql, values);
  return result;
}
