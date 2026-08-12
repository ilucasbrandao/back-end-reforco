import { z } from "zod";

export const createAlunoSchema = z
  .object({
    nome: z
      .string({ required_error: "Nome é obrigatório" })
      .min(2, "Nome deve ter pelo menos 2 caracteres"),
    data_nascimento: z.string().optional().nullable(),
    responsavel: z.string().optional().nullable(),
    telefone: z.string().optional().nullable(),
    data_matricula: z.string().optional().nullable(),
    valor_mensalidade: z.union([z.number(), z.string()]).optional().nullable(),
    serie: z.string().optional().nullable(),
    turno: z.string().optional().nullable(),
    observacao: z.string().optional().nullable(),
    status: z.enum(["ativo", "inativo"]).default("ativo"),
    plano: z.enum(["padrao", "basico", "premium"]).default("padrao"),
    dia_vencimento: z.union([z.number(), z.string()]).optional().nullable(),
    horario_atendimento: z.string().optional().nullable(),
    professor_id: z.union([z.number(), z.string(), z.null()]).optional(),

    // SANITIZAÇÃO CRÍTICA DO E-MAIL:
    email_responsavel: z
      .string()
      .trim()
      .toLowerCase()
      .email("E-mail inválido")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      // Se o plano for premium, e-mail é obrigatório
      if (data.plano === "premium") {
        return !!data.email_responsavel && data.email_responsavel.trim() !== "";
      }
      return true;
    },
    {
      message: "E-mail do responsável é obrigatório para o plano Premium.",
      path: ["email_responsavel"],
    },
  );

// Schema de Atualização (Reaproveita as mesmas regras)
export const updateAlunoSchema = createAlunoSchema;
