export function validateSchema(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      console.log("Dados recebidos:", req.body);
      return res.status(400).json({
        message: "Dados inválidos",
        errors: result.error.errors.map((err) => ({
          campo: err.path.join("."),
          mensagem: err.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}
