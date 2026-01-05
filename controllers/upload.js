export const UploadController = {
  uploadImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      const urls = req.files.map(file => {
        return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
      });

      res.status(201).json({ urls });
    } catch (error) {
      console.error("Erro no upload:", error);
      res.status(500).json({ error: "Falha ao realizar upload." });
    }
  },
};
