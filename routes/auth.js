import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    console.log("--- TENTATIVA DE LOGIN ---");
    console.log("Email recebido:", email);
    console.log("Senha recebida:", senha);

    // 1. Busca usuário pelo email na tabela users (Admin, Prof ou Responsável)
    const usuario = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (usuario.rows.length === 0) {
      return res.status(401).json({ message: "Usuário ou senha incorretos" });
    }

    const user = usuario.rows[0];

    // 2. Verificar a senha
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ message: "Usuário ou senha incorretos" });
    }

    // 3. REGRA DE NEGÓCIO: Bloqueio do Plano Básico
    // Se for Responsável E o plano for 'basico', bloqueia.
    if (user.role === "responsavel" && user.plano === "basico") {
      return res.status(403).json({
        message:
          "Seu plano é o Básico. O acesso ao aplicativo é exclusivo para assinantes Premium.",
      });
    }

    // 4. Gerar Token (Incluindo a ROLE para o Front saber quem é)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role, // 'admin', 'professor' ou 'responsavel'
      },
      JWT_SECRET,
      { expiresIn: "5d" }
    );

    // 5. Retornar dados
    res.json({
      message: "Login realizado com sucesso",
      token,
      user: {
        id: user.id,
        nome: user.nome,
        role: user.role,
        plano: user.plano,
      },
    });
  } catch (err) {
    console.error("Erro no login:", err.message);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

export default router;
