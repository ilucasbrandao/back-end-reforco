import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "minha_chave_secreta";

const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Acesso negado" });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
    req.userId = decoded.id; // <- vem do backend de usuários
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
};

export default auth;
