import { Router } from "express";
import prisma from "../prisma.js"; // Import centralizado e com .js
import auth from "../middleware/auth.js";

const router = Router();

// Protegendo a rota com o middleware de autenticação
router.get("/notificacao", auth, async (req, res) => {
  const { mes, ano } = req.query;

  // Validação básica
  const mesNum = parseInt(mes);
  const anoNum = parseInt(ano);

  if (!mes || !ano || isNaN(mesNum) || isNaN(anoNum)) {
    return res.status(400).json({ error: "Mês ou ano inválido" });
  }

  try {
    // Criamos a data limite (primeiro dia do mês analisado) para comparar com a matrícula
    const dataLimiteMatricula = new Date(anoNum, mesNum - 1, 1);

    const inadimplentes = await prisma.alunos.findMany({
      where: {
        status: "ativo",
        // Só alunos matriculados antes ou no mês analisado
        data_matricula: {
          lte: dataLimiteMatricula,
        },
        // Filtro poderoso: "Traga alunos que NÃO possuem nenhuma receita que..."
        NOT: {
          receitas: {
            some: {
              mes_referencia: mesNum, // Usando os campos de referência que o seu banco já tem
              ano_referencia: anoNum,
            },
          },
        },
      },
      select: {
        id: true,
        nome: true,
        valor_mensalidade: true,
        telefone: true, // Adicionado telefone, útil para notificações
      },
      orderBy: {
        nome: "asc",
      },
    });

    res.json({ inadimplentes });
  } catch (err) {
    console.error("❌ Erro ao buscar inadimplentes:", err.message);
    res.status(500).json({ error: "Erro ao buscar inadimplentes" });
  }
});

export default router;
