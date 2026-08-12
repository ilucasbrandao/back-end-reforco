import bcrypt from "bcrypt";

/**
 * Gera a senha padrão a partir da data de nascimento (Formato AAAAMMDD).
 * Exemplo: '2015-08-20' -> '20150820'
 */

export function generateDefaultPassword(dataNascimento) {
  if (!dataNascimento) return "123456";

  const dataApenas = String(dataNascimento).split("T")[0];
  const senhaLimpa = dataApenas.replace(/[^0-9]/g, "");

  return senhaLimpa || "123456";
}

/**
 * Gera o Hash da senha utilizando o bcrypt
 */

export async function hashPassword(senha) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(senha, salt);
}
