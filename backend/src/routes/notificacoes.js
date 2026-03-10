const router = require("express").Router();
const { getDb } = require("../database/db");
const { authMiddleware } = require("../middlewares/auth");

router.use(authMiddleware);

// ─── GET /api/notificacoes ────────────────────────────────────────────────
// Lista notificações da igreja (mais recentes primeiro, não lidas no topo)
router.get("/", (req, res, next) => {
    try {
        const db = getDb();
        const limite = parseInt(req.query.limite) || 30;
        const apenasNaoLidas = req.query.nao_lidas === "true";

        let where = "WHERE igreja_id = ?";
        if (apenasNaoLidas) where += " AND lida = 0";

        const notificacoes = db
            .prepare(
                `SELECT id, tipo, titulo, mensagem, lida, dados, created_at
         FROM notificacoes
         ${where}
         ORDER BY lida ASC, created_at DESC
         LIMIT ?`,
            )
            .all(req.igreja.id, limite);

        const totalNaoLidas = db.prepare("SELECT COUNT(*) AS c FROM notificacoes WHERE igreja_id = ? AND lida = 0").get(req.igreja.id)?.c || 0;

        res.json({ notificacoes, total_nao_lidas: totalNaoLidas });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/notificacoes/:id/lida ────────────────────────────────────
router.patch("/:id/lida", (req, res, next) => {
    try {
        const db = getDb();
        db.prepare("UPDATE notificacoes SET lida = 1 WHERE id = ? AND igreja_id = ?").run(req.params.id, req.igreja.id);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/notificacoes/marcar-todas-lidas ───────────────────────────
router.patch("/marcar-todas-lidas", (req, res, next) => {
    try {
        const db = getDb();
        db.prepare("UPDATE notificacoes SET lida = 1 WHERE igreja_id = ? AND lida = 0").run(req.igreja.id);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/notificacoes/:id ────────────────────────────────────────
router.delete("/:id", (req, res, next) => {
    try {
        const db = getDb();
        db.prepare("DELETE FROM notificacoes WHERE id = ? AND igreja_id = ?").run(req.params.id, req.igreja.id);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/notificacoes ────────────────────────────────────────────
// Limpa todas as notificações lidas
router.delete("/", (req, res, next) => {
    try {
        const db = getDb();
        db.prepare("DELETE FROM notificacoes WHERE igreja_id = ? AND lida = 1").run(req.igreja.id);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
