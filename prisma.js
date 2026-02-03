import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Forçamos o caminho para dentro da node_modules onde o Prisma DEVE estar
const clientPath = path.join(
  __dirname,
  "node_modules",
  "@prisma",
  "client",
  "index.js",
);

let PrismaClient;
try {
  // Tenta carregar do caminho padrão gerado pelo npx prisma generate
  const prismaModule = require("@prisma/client");
  PrismaClient = prismaModule.PrismaClient;
} catch (e) {
  console.log("⚠️ Tentando carregamento alternativo do motor...");
  const alternatePath = require(".prisma/client/index.js");
  PrismaClient = alternatePath.PrismaClient;
}

const prisma = new PrismaClient();
export default prisma;
