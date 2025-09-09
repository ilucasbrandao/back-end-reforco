import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/*
(async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
  } catch (err) {
    console.error("❌ Erro ao conectar ao MySQL:");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
  }
})();
*/
