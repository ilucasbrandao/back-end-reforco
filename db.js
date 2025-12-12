import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// Configuração da conexão
export const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Listener para erros inesperados na conexão (evita derrubar o servidor)
pool.on("error", (err, client) => {
  console.error("❌ Erro inesperado no cliente do banco de dados", err);
  process.exit(-1);
});
