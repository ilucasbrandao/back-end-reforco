import { verifyToken } from "../utils/jwt.js";

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

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

export default auth;
