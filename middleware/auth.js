import { verifyToken } from "../utils/jwt.js";
import prisma from "../prisma.js"; // 1. NÃO ESQUEÇA DE IMPORTAR O PRISMA AQUI

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token mal formatado" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = verifyToken(token);

    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    if (req.userId) {
      prisma.users
        .update({
          where: { id: req.userId },
          data: { ultimo_acesso: new Date() },
        })
        .catch((err) =>
          console.error("Erro silencioso ao atualizar acesso:", err.message),
        );
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

export default auth;
