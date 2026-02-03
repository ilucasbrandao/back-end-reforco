import dotenv from "dotenv";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET não definido no arquivo .env");
}

export const env = process.env;
