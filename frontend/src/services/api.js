import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    timeout: 30000,
    withCredentials: true, // envia o cookie httpOnly automaticamente em toda requisição
});

// Trata erros de autenticação globalmente
// Exclui /auth/me e /superadmin/* para evitar loop: verificarSessao trata o 401 no próprio catch
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const url = err.config?.url ?? "";
        const isSuperadmin = url.includes("/superadmin/");
        const isAuthMe = url.includes("/auth/me");
        if (err.response?.status === 401 && !isAuthMe && !isSuperadmin) {
            window.location.href = "/login";
        }
        return Promise.reject(err);
    },
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (data) => api.post("/auth/login", data),
    logout: () => api.post("/auth/logout"),
    registrar: (data) => api.post("/auth/registrar", data),
    me: () => api.get("/auth/me"),
    alterarSenha: (data) => api.post("/auth/alterar-senha", data),
    // ─ Recuperação de senha ─
    esqueciSenha: (email) => api.post("/auth/esqueci-senha", { email }),
    validarToken: (token) => api.get(`/auth/validar-token/${token}`),
    redefinirSenha: (data) => api.post("/auth/redefinir-senha", data),
    // ─ Verificação de e-mail ─
    verificarEmail: (token) => api.get(`/auth/verificar-email/${token}`),
    reenviarVerificacao: (email) => api.post("/auth/reenviar-verificacao", { email }),
};

// ─── Membros ──────────────────────────────────────────────────────────────
export const membrosAPI = {
    listar: (params) => api.get("/membros", { params }),
    buscar: (id) => api.get(`/membros/${id}`),
    criar: (data) => api.post("/membros", data),
    atualizar: (id, data) => api.put(`/membros/${id}`, data),
    atualizarSituacao: (id, data) => api.patch(`/membros/${id}/situacao`, data),
    deletar: (id) => api.delete(`/membros/${id}`),
    uploadFoto: (id, file) => {
        const fd = new FormData();
        fd.append("foto", file);
        return api.post(`/membros/${id}/foto`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
};

// ─── Carteiras ────────────────────────────────────────────────────────────
export const carteirasAPI = {
    gerar: (membroId) => api.post(`/carteiras/${membroId}/gerar`),
    gerarLote: (ids) => api.post("/carteiras/lote", { ids }),
    gerarLotePdf: (ids) => api.post("/carteiras/lote/pdf", { ids }, { responseType: "blob" }),
    download: (membroId) => api.get(`/carteiras/${membroId}/download`, { responseType: "blob" }),
    registrarEntrega: (membroId, data) => api.post(`/carteiras/${membroId}/entregar`, data),
};

// ─── Igrejas ─────────────────────────────────────────────────────────────
export const igrejasAPI = {
    minha: () => api.get("/igrejas/minha"),
    atualizar: (data) => api.put("/igrejas/minha", data),
    uploadLogo: (file) => {
        const fd = new FormData();
        fd.append("logo", file);
        return api.post("/igrejas/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    uploadAssinatura: (file) => {
        const fd = new FormData();
        fd.append("assinatura", file);
        return api.post("/igrejas/assinatura", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    uploadMarcaDagua: (file) => {
        const fd = new FormData();
        fd.append("marca_dagua", file);
        return api.post("/igrejas/marca-dagua", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    removerMarcaDagua: () => api.delete("/igrejas/marca-dagua"),
    salvarCoresFuncoes: (cores_funcoes) => api.put("/igrejas/cores-funcoes", { cores_funcoes }),
    usuarios: () => api.get("/igrejas/usuarios"),
    criarUsuario: (data) => api.post("/igrejas/usuarios", data),
    departamentos: () => api.get("/igrejas/departamentos"),
    criarDepartamento: (data) => api.post("/igrejas/departamentos", data),
    marcarOnboarding: (steps) => api.patch("/igrejas/onboarding", steps),
};

// ─── Dashboard ───────────────────────────────────────────────────────────
export const dashboardAPI = {
    resumo: () => api.get("/dashboard/resumo"),
    relatorio: (params) => api.get("/dashboard/relatorio-membros", { params }),
    aniversariantes: (mes) => api.get("/dashboard/aniversariantes", { params: mes ? { mes } : {} }),
    aniversariantesSemana: () => api.get("/dashboard/aniversariantes/semana"),
};

// ─── Notificações ─────────────────────────────────────────────────────────
export const notificacoesAPI = {
    listar: (params) => api.get("/notificacoes", { params }),
    marcarLida: (id) => api.patch(`/notificacoes/${id}/lida`),
    marcarTodasLidas: () => api.patch("/notificacoes/marcar-todas-lidas"),
    deletar: (id) => api.delete(`/notificacoes/${id}`),
    limparLidas: () => api.delete("/notificacoes"),
};

// ─── Congregações ─────────────────────────────────────────────────────────
export const congregacoesAPI = {
    listar: () => api.get("/congregacoes"),
    buscar: (id) => api.get(`/congregacoes/${id}`),
    membros: (id, params) => api.get(`/congregacoes/${id}/membros`, { params }),
    criar: (data) => api.post("/congregacoes", data),
    atualizar: (id, data) => api.put(`/congregacoes/${id}`, data),
    deletar: (id) => api.delete(`/congregacoes/${id}`),
};

// ─── Planos ──────────────────────────────────────────────────────────────
export const planosAPI = {
    listar: () => api.get("/planos"),
    assinatura: () => api.get("/planos/assinatura"),
    checkout: (data) => api.post("/planos/checkout", data),
    portal: () => api.post("/planos/portal"),
};

// ─── Pré-Cadastros ───────────────────────────────────────────────────────
export const preCadastrosAPI = {
    listar: (params) => api.get("/pre-cadastros", { params }),
    buscar: (id) => api.get(`/pre-cadastros/${id}`),
    aprovar: (id) => api.post(`/pre-cadastros/${id}/aprovar`),
    rejeitar: (id, motivo) => api.post(`/pre-cadastros/${id}/rejeitar`, { motivo }),
};

// ─── Público ─────────────────────────────────────────────────────────────
export const publicoAPI = {
    planos: () => api.get("/publico/planos"),
    igreja: (slug) => api.get(`/publico/igrejas/${slug}`),
    verificarMembro: (slug, membroId) => api.get(`/publico/verificar-membro/${slug}/${membroId}`),
    aniversarios: (slug, mes) => api.get(`/publico/aniversarios/${slug}`, { params: mes ? { mes } : {} }),
    registrarAniversario: (slug, data) => api.post(`/publico/aniversarios/${slug}`, data),
};

// ─── Superadmin (Master) ──────────────────────────────────────────────────
export const superadminAPI = {
    login: (data) => api.post("/superadmin/login", data),
    logout: () => api.post("/superadmin/logout"),
    me: () => api.get("/superadmin/me"),
    stats: () => api.get("/superadmin/stats"),
    listarIgrejas: (params) => api.get("/superadmin/igrejas", { params }),
    buscarIgreja: (id) => api.get(`/superadmin/igrejas/${id}`),
    atualizarIgreja: (id, data) => api.patch(`/superadmin/igrejas/${id}`, data),
    excluirIgreja: (id) => api.delete(`/superadmin/igrejas/${id}`),
    listarPlanos: () => api.get("/superadmin/planos"),
    criarPlano: (data) => api.post("/superadmin/planos", data),
    atualizarPlano: (id, data) => api.put(`/superadmin/planos/${id}`, data),
    listarUsuarios: (params) => api.get("/superadmin/usuarios", { params }),
    alterarSenha: (nova_senha) => api.patch("/superadmin/senha", { nova_senha }),
};
