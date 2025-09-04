import mysql from "mysql2/promise";

export const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "application",
    password: process.env.DB_PASS || "password",
    database: process.env.DB_NAME || "projet_web",
    waitForConnections: true,
    connectionLimit: 10,
});
