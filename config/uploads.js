import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOADS_ROOT = path.join(__dirname, "../uploads");

export const ALUNOS_FOTOS_DIR = path.join(UPLOADS_ROOT, "alunos/fotos");
export const FEEDBACKS_DIR = path.join(UPLOADS_ROOT, "feedbacks");
