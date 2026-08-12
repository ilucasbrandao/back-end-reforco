export function validate(schema) {
  return (req, res, next) => {
    try {
      // Substitui o req.body pelos dados já sanitizados pelo Zod
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error.name === "ZodError") {
        // Retorna o primeiro erro amigável de validação
        const message = error.errors[0]?.message || "Dados inválidos";
        return res.status(400).json({ error: message, details: error.errors });
      }
      next(error);
    }
  };
}
