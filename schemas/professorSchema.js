import { z } from "zod";

export const createProfessorSchema = z.object({
  nome: z
    .string({ required_error: "Nome do professor é obrigatório." })
    .min(2, "Nome deve ter pelo menos 2 caracteres"),

  // E-mail obrigatório para gerar o acesso (login)
  email: z
    .string({
      required_error:
        "E-mail é obrigatório para cadastro de acesso do professor.",
    })
    .trim()
    .toLowerCase()
    .email("E-mail inválido"),

  data_nascimento: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  data_contratacao: z.string().optional().nullable(),
  nivel_ensino: z.string().optional().nullable(),
  turno: z.string().optional().nullable(),
  salario: z.union([z.number(), z.string()]).optional().nullable(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),

  // Opcional: Lista de IDs dos alunos que serão alocados logo no cadastro ex: [1, 5, 12]
  alunos_ids: z.array(z.number()).optional().default([]),
});

export const updateProfessorSchema = createProfessorSchema
  .partial()
  .omit({ email: true });
