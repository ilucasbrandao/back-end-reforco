import { z } from "zod";

export const avaliacaoPedagogicaSchema = z.object({
  leitura: z.string(),
  escrita: z.string(),
  foco: z.string(),
  comportamento: z.string(),
});

export const avaliacaoPsicoSchema = z.object({
  atencao_memoria: z.string().optional(),
  interacao_social: z.string().optional(),
  habilidades_cognitivas: z.string().optional(),
  coordenacao_motora: z.string().optional(),
  raciocinio_logico: z.string().optional(),
  regulacao_emocional: z.string().optional(),
});

export const feedbackCreateSchema = z.object({
  aluno_id: z.union([z.string(), z.number()]),
  bimestre: z.string().min(1),
  avaliacao_pedagogica: avaliacaoPedagogicaSchema,
  avaliacao_psico: avaliacaoPsicoSchema,
  fotos: z.array(z.string().url()).optional().default([]),
  observacao: z.string().optional(),
});

export const feedbackUpdateSchema = feedbackCreateSchema.omit({
  aluno_id: true,
});
