import jwt from "jsonwebtoken";

export function signToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não definido (signToken)");
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "5d",
  });
}

export function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não definido (verifyToken)");
  }

  return jwt.verify(token, process.env.JWT_SECRET);
}
