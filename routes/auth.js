import express from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma.ts";
import { signToken } from "../utils/jwt.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Log para confirmar que a requisição CHEGOU no controller
    console.log("--> Requisição de login recebida para:", email);

    if (!email || !senha || email.trim() === "" || senha.trim() === "") {
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios" });
    }

    // 1. Padronizando e Buscando usuário usando Prisma
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.users.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      console.warn(`[LOGIN FAIL] Usuário não encontrado: ${email}`);
      return res.status(401).json({ message: "Usuário ou senha incorretos" });
    }

    // 2. Verifica senha
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      console.warn(`[LOGIN FAIL] Senha incorreta para o e-mail: ${email}`);
      return res.status(401).json({ message: "Usuário ou senha incorretos" });
    }

    // 3. Regra de plano (Bloqueia pais no plano básico)
    if (user.role === "responsavel" && user.plano === "basico") {
      console.warn(`[LOGIN BLOCKED] Plano básico tentando acessar: ${email}`);
      return res.status(403).json({
        message:
          "Seu plano é o Básico. O acesso ao aplicativo é exclusivo para assinantes Premium.",
      });
    }

    // 4. Gera token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      nome: user.nome,
    });

    console.log(`[LOGIN SUCCESS] Usuário autenticado: ${email}`);

    // 5. Retorno
    return res.json({
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
    // CORREÇÃO CRÍTICA: Imprime o objeto de erro completo, não apenas .message!
    console.error("❌ ERRO FATAL NO LOGIN:", err);

    return res.status(500).json({
      message: "Erro interno no servidor",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

export default router;
