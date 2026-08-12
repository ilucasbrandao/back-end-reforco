// Arquivo para edição de senhas dos usuários caso esqueçam ou queiram alterar
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function atualizarSenhaPorData(alunoId, dataCorreta) {
  try {
    console.log(`--- Iniciando correção para Aluno ID: ${alunoId} ---`);

    // 1. Gerar nova senha baseada na data de nascimento (somente números)
    const senhaLimpa = dataCorreta.replace(/[^0-9]/g, "");
    const salt = await bcrypt.genSalt(10);
    const novaSenhaHash = await bcrypt.hash(senhaLimpa, salt);

    // 2. Localizar o responsável vinculado a esse aluno
    const vinculo = await prisma.responsaveis_alunos.findFirst({
      where: { aluno_id: alunoId },
      select: { responsavel_id: true },
    });

    if (!vinculo) {
      console.error("❌ Nenhum responsável encontrado para este aluno.");
      return;
    }

    // 3. Atualizar a senha do usuário e a data de nascimento do aluno
    await prisma.$transaction([
      prisma.alunos.update({
        where: { id: alunoId },
        data: { data_nascimento: new Date(dataCorreta) },
      }),
      prisma.users.update({
        where: { id: vinculo.responsavel_id },
        data: { senha: novaSenhaHash },
      }),
    ]);

    console.log(
      "✅ Sucesso! Data do aluno e senha do responsável atualizadas.",
    );
    console.log(`🔑 Nova senha (limpa): ${senhaLimpa}`);
  } catch (error) {
    console.error("❌ Erro ao rodar script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// EXECUÇÃO: Coloque o ID do aluno e a DATA CORRETA (AAAA-MM-DD)
atualizarSenhaPorData(33, "2016-10-27");
