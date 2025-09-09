import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "lucas12345",
  database: process.env.DB_NAME || "reforcoescolar",
  port: process.env.DB_PORT || 3306, // ✅ corrigido para a porta padrão
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Teste de conexão
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conectado ao MySQL com sucesso!");
    connection.release();
  } catch (err) {
    console.error("❌ Erro ao conectar ao MySQL:");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
  }
})();
