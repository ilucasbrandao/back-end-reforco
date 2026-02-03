export const UploadController = {
  uploadImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ error: "Nenhum arquivo enviado ou formato inválido." });
      }

      const urls = req.files.map((file) => {
        const folder =
          file.fieldname === "fotos" ? "alunos/fotos" : "feedbacks/imagens";

        return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
      });

      res.status(201).json({
        message: "Upload realizado com sucesso!",
        urls,
      });
    } catch (error) {
      console.error("❌ Erro no upload:", error);
      res.status(500).json({ error: "Falha interna ao realizar upload." });
    }
  },
};
