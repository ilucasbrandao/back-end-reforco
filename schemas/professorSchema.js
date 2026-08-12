import { z } from "zod";

export const createProfessorSchema = z.object({
  nome: z
    .string({ required_error: "Nome do professor é obrigatório." })
    .min(2, "Nome deve ter pelo menos 2 caracteres"),

  email: z
    .string({ required_error: "E-mail é obrigatório." })
    .trim()
    .toLowerCase()
    .email("Formato de e-mail inválido"),

  data_nascimento: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  data_contratacao: z.string().optional().nullable(),
  nivel_ensino: z.string().optional().nullable(),
  turno: z.string().optional().nullable(),
  salario: z.coerce.number().optional().nullable(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
  alunos_ids: z.array(z.coerce.number()).optional().default([]),
});

export const updateProfessorSchema = createProfessorSchema
  .partial()
  .omit({ email: true });
