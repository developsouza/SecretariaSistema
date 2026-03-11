const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Verificação de magic bytes sem dependência do file-type (ESM-only v19+)
function detectMimeFromBuffer(buf) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
    if (
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf[8] === 0x57 &&
        buf[9] === 0x45 &&
        buf[10] === 0x42 &&
        buf[11] === 0x50
    )
        return "image/webp";
    return null;
}

async function fileTypeFromFile(filePath) {
    return new Promise((resolve) => {
        const fd = fs.openSync(filePath, "r");
        const buf = Buffer.alloc(12);
        fs.readSync(fd, buf, 0, 12, 0);
        fs.closeSync(fd);
        const mime = detectMimeFromBuffer(buf);
        resolve(mime ? { mime } : null);
    });
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const subdir = file.fieldname === "logo" || file.fieldname === "assinatura" || file.fieldname === "marca_dagua" ? "logos" : "fotos";
        const dest = path.join(UPLOAD_DIR, subdir);
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
    },
});

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error("Formato de imagem não suportado. Use JPG, PNG ou WebP."));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
});

/**
 * Middleware que valida o MIME type real do arquivo pelos bytes mágicos
 * após o multer salvar o arquivo temporariamente no disco.
 * Deve ser aplicado DEPOIS do upload.single() ou upload.fields().
 */
async function validarMimeReal(req, res, next) {
    const files = req.file ? [req.file] : Object.values(req.files || {}).flat();
    for (const file of files) {
        try {
            const tipo = await fileTypeFromFile(file.path);
            if (!tipo || !ALLOWED_MIME_TYPES.has(tipo.mime)) {
                fs.unlinkSync(file.path);
                return res.status(400).json({ error: "Tipo de arquivo não permitido. Envie uma imagem JPG, PNG ou WebP válida." });
            }
        } catch {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ error: "Não foi possível validar o arquivo enviado." });
        }
    }
    next();
}

module.exports = upload;
module.exports.validarMimeReal = validarMimeReal;
