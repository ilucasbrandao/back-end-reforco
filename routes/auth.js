import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { signToken } from "../utils/jwt.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios" });
    }

    // 1. Busca usuário
    const usuario = await pool.query(
      "SELECT id, nome, email, senha, role, plano FROM users WHERE email = $1",
      [email]
    );

    if (usuario.rows.length === 0) {
      return res.status(401).json({ message: "Usuário ou senha incorretos" });
    }

    const user = usuario.rows[0];

    // 2. Verifica senha
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ message: "Usuário ou senha incorretos" });
    }

    // 3. Regra de plano
    if (user.role === "responsavel" && user.plano === "basico") {
      return res.status(403).json({
        message:
          "Seu plano é o Básico. O acesso ao aplicativo é exclusivo para assinantes Premium.",
      });
    }

    // 4. Gera token (centralizado)
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. Retorno
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
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

export default router;
