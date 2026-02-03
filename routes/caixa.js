// routes/caixa.js
import { Router } from "express";
import prisma from "../prisma.js"; // Importando a instância centralizada
import auth from "../middleware/auth.js";

const router = Router();

// Fechar caixa do mês atual
router.post("/", auth, async (req, res) => {
  try {
    // Pegando o nome do usuário do token (middleware auth)
    const usuarioNome = req.user?.nome || "juliannekelly630";

    const { mes, ano } = req.body;
    const now = new Date();
    const mesFinal = mes || now.getMonth() + 1;
    const anoFinal = ano || now.getFullYear();

    // 1. Definir o intervalo de data para o Prisma (Início e Fim do Mês)
    const dataInicio = new Date(anoFinal, mesFinal - 1, 1);
    const dataFim = new Date(anoFinal, mesFinal, 1);

    // 2. Calcular o Saldo usando Prisma Aggregations
    // Buscamos todos os lançamentos do mês
    const lancamentos = await prisma.lancamentos.findMany({
      where: {
        data: {
          gte: dataInicio,
          lt: dataFim,
        },
      },
      select: {
        tipo: true,
        valor: true,
      },
    });

    // Calcula o saldo (Receita - Despesa)
    const saldoFinal = lancamentos.reduce((acc, curr) => {
      const valorNumerico = Number(curr.valor);
      return curr.tipo === "receita"
        ? acc + valorNumerico
        : acc - valorNumerico;
    }, 0);

    // 3. Salvar no Banco (Fechamento Mensal) usando UPSERT
    // O Prisma usa o campo único definido no schema (provavelmente a combinação ano_mes)
    const fechamento = await prisma.fechamento_mensal.upsert({
      where: {
        // Certifique-se de que no seu schema.prisma existe um @@unique([ano, mes])
        ano_mes: {
          ano: anoFinal,
          mes: mesFinal,
        },
      },
      update: {
        saldo_final: saldoFinal,
        usuario: usuarioNome,
        data_fechamento: new Date(),
      },
      create: {
        ano: anoFinal,
        mes: mesFinal,
        saldo_final: saldoFinal,
        usuario: usuarioNome,
      },
    });

    res.json({ sucesso: true, fechamento });
  } catch (err) {
    console.error("Erro ao fechar caixa mensal:", err);
    res.status(500).json({
      sucesso: false,
      erro: "Erro ao fechar caixa mensal",
      detalhe: err.message,
    });
  }
});

export default router;
