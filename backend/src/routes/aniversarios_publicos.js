const router = require("express").Router();
const { getDb } = require("../database/db");
const { authMiddleware, assinaturaAtiva } = require("../middlewares/auth");

router.use(authMiddleware);
router.use(assinaturaAtiva);

// ─── GET /api/aniversarios-publicos ───────────────────────────────────────
// Lista cadastros feitos na página pública (busca + paginação)
router.get("/", (req, res, next) => {
    try {
        const db = getDb();
        const { busca = "", page = 1, limit = 50 } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let where = "WHERE igreja_id = ? AND ativo = 1";
        const params = [req.igreja.id];

        if (busca.trim()) {
            where += " AND (nome_completo LIKE ? OR celular LIKE ? OR email LIKE ?)";
            const like = `%${busca.trim()}%`;
            params.push(like, like, like);
        }

        const total = db.prepare(`SELECT COUNT(*) as n FROM aniversarios_publicos ${where}`).get(...params).n;

        const registros = db
            .prepare(
                `SELECT id, nome_completo, data_nascimento, celular, email, cargo,
                        departamento, congregacao, created_at
                 FROM aniversarios_publicos
                 ${where}
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
            )
            .all(...params, parseInt(limit), offset);

        res.json({ registros, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/aniversarios-publicos/:id ────────────────────────────────
// Remove (soft-delete: ativo = 0) um cadastro público
router.delete("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const { id } = req.params;

        // Garante que o registro pertence à igreja do usuário logado
        const registro = db.prepare("SELECT id FROM aniversarios_publicos WHERE id = ? AND igreja_id = ? AND ativo = 1").get(id, req.igreja.id);

        if (!registro) {
            return res.status(404).json({ message: "Cadastro não encontrado." });
        }

        db.prepare("UPDATE aniversarios_publicos SET ativo = 0, updated_at = datetime('now', '-3 hours') WHERE id = ?").run(id);

        res.json({ message: "Cadastro removido com sucesso." });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
