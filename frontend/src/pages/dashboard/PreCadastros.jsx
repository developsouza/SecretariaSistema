import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import {
    ClipboardList,
    CheckCircle2,
    XCircle,
    Eye,
    User,
    Phone,
    Mail,
    MapPin,
    Flame,
    Search,
    Filter,
    RefreshCw,
    MessageSquare,
    ExternalLink,
    Copy,
    ChevronDown,
    Clock,
    CircleCheck,
    CircleX,
    X,
    Send,
    AlertTriangle,
} from "lucide-react";

// ── API helpers ────────────────────────────────────────────────────────────────
const preCadastrosAPI = {
    listar: (params) => api.get("/pre-cadastros", { params }),
    buscar: (id) => api.get(`/pre-cadastros/${id}`),
    aprovar: (id) => api.post(`/pre-cadastros/${id}/aprovar`),
    rejeitar: (id, motivo) => api.post(`/pre-cadastros/${id}/rejeitar`, { motivo }),
};

// ── Utilitários ────────────────────────────────────────────────────────────────
function fmt(date) {
    if (!date) return "—";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
        new Date(date),
    );
}
function fmtDate(date) {
    if (!date) return "—";
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date + "T00:00:00"));
}
function calcIdade(data_nascimento) {
    if (!data_nascimento) return null;
    const dob = new Date(data_nascimento + "T00:00:00");
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

const STATUS_CONFIG = {
    pendente: { label: "Pendente", icon: Clock, cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    aprovado: { label: "Aprovado", icon: CircleCheck, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    rejeitado: { label: "Rejeitado", icon: CircleX, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
            <Icon className="w-3 h-3" /> {cfg.label}
        </span>
    );
}

// ── Modal: Ver Detalhes ────────────────────────────────────────────────────────
function ModalDetalhe({ registro, onClose, onAprovar, onRejeitar, aprovando, rejeitando }) {
    const [mostrarRejeicao, setMostrarRejeicao] = useState(false);
    const [motivo, setMotivo] = useState("");
    const { usuario } = useAuth();

    if (!registro) return null;

    const linkPreCadastro = `${window.location.origin}/pre-cadastro/${usuario?.igreja?.slug || ""}`;
    const whatsappMsg = encodeURIComponent(
        `Olá ${registro.nome_completo}! Seu pré-cadastro na ${usuario?.igreja?.nome_curto || "nossa igreja"} foi analisado e precisamos de alguns ajustes. Motivo: ${motivo || "[preencha o motivo]"}. Por favor, acesse o link para refazer: ${linkPreCadastro}`,
    );

    const isPendente = registro.status === "pendente";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        {registro.foto_url ? (
                            <img src={registro.foto_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{registro.nome_completo}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <StatusBadge status={registro.status} />
                                <span className="text-xs text-gray-400">{fmt(registro.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">
                    {/* Dados Pessoais */}
                    <section>
                        <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Dados Pessoais
                        </h3>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <dt className="text-gray-400 text-xs">Nascimento</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">
                                    {fmtDate(registro.data_nascimento)}
                                    {calcIdade(registro.data_nascimento) ? ` (${calcIdade(registro.data_nascimento)} anos)` : ""}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">Sexo</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200 capitalize">{registro.sexo || "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">Estado Civil</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200 capitalize">{registro.estado_civil || "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">CPF</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{registro.cpf || "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">RG</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">
                                    {registro.rg || "—"}
                                    {registro.rg_orgao ? ` / ${registro.rg_orgao}` : ""}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* Contato */}
                    <section>
                        <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> Contato
                        </h3>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <dt className="text-gray-400 text-xs">Celular</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{registro.celular || "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">WhatsApp</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{registro.whatsapp || "—"}</dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-gray-400 text-xs flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> E-mail
                                </dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{registro.email || "—"}</dd>
                            </div>
                        </dl>
                    </section>

                    {/* Endereço */}
                    {(registro.logradouro || registro.cidade) && (
                        <section>
                            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" /> Endereço
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {[
                                    registro.logradouro,
                                    registro.numero,
                                    registro.complemento,
                                    registro.bairro,
                                    registro.cidade,
                                    registro.estado,
                                    registro.cep,
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        </section>
                    )}

                    {/* Dados Eclesiásticos */}
                    <section>
                        <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5" /> Dados Eclesiásticos
                        </h3>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <dt className="text-gray-400 text-xs">Forma de Entrada</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200 capitalize">{registro.forma_entrada || "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">Cargo</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{registro.cargo || "—"}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">Batismo nas Águas</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{fmtDate(registro.data_batismo_agua)}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-400 text-xs">Conversão</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{fmtDate(registro.data_conversao)}</dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-gray-400 text-xs">Denominação de Origem</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{registro.denominacao_origem || "—"}</dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-gray-400 text-xs">Congregação Preferida</dt>
                                <dd className="font-medium text-gray-800 dark:text-gray-200">{registro.congregacao_preferida || "—"}</dd>
                            </div>
                        </dl>
                    </section>

                    {/* Observações */}
                    {registro.observacoes && (
                        <section>
                            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Observações</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                {registro.observacoes}
                            </p>
                        </section>
                    )}

                    {/* Motivo de rejeição (se já rejeitado) */}
                    {registro.status === "rejeitado" && registro.motivo_rejeicao && (
                        <section className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                            <h3 className="text-xs font-bold tracking-widest text-red-500 uppercase mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> Motivo da Rejeição
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300">{registro.motivo_rejeicao}</p>
                        </section>
                    )}

                    {/* Aprovado */}
                    {registro.status === "aprovado" && registro.membro_id && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">Membro cadastrado com sucesso!</p>
                                <p className="text-xs text-gray-500 mt-0.5">Aprovado em {fmt(registro.aprovado_em)}</p>
                            </div>
                            <Link
                                to={`/dashboard/membros/${registro.membro_id}`}
                                onClick={onClose}
                                className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                            >
                                Ver membro <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* Formulário de rejeição */}
                    {isPendente && mostrarRejeicao && (
                        <section className="bg-orange-50 dark:bg-gray-700/50 border border-orange-200 dark:border-gray-600 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Informar Motivo da Rejeição
                            </h3>
                            <textarea
                                rows={3}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Descreva quais dados estão faltando ou incorretos..."
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-gray-800 dark:text-gray-100 resize-none"
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Rejeitar + enviar e-mail */}
                                <button
                                    onClick={() => {
                                        if (!motivo.trim()) {
                                            toast.error("Informe o motivo");
                                            return;
                                        }
                                        onRejeitar(motivo);
                                    }}
                                    disabled={rejeitando || !motivo.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {rejeitando ? "Rejeitando..." : "Rejeitar e enviar e-mail"}
                                </button>
                                {/* WhatsApp */}
                                {(registro.whatsapp || registro.celular) && (
                                    <a
                                        href={`https://wa.me/55${(registro.whatsapp || registro.celular).replace(/\D/g, "")}?text=${whatsappMsg}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                                    </a>
                                )}
                                <button onClick={() => setMostrarRejeicao(false)} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">
                                    Cancelar
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                {/* Ações */}
                {isPendente && !mostrarRejeicao && (
                    <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                        <button
                            onClick={onAprovar}
                            disabled={aprovando}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {aprovando ? "Aprovando..." : "Aprovar e Cadastrar"}
                        </button>
                        <button
                            onClick={() => setMostrarRejeicao(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-300 text-red-600 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                            <XCircle className="w-4 h-4" /> Rejeitar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Página principal ────────────────────────────────────────────────────────────
export default function PreCadastros() {
    const qc = useQueryClient();
    const { usuario } = useAuth();

    const [statusFiltro, setStatusFiltro] = useState("pendente");
    const [busca, setBusca] = useState("");
    const [pagina, setPagina] = useState(1);
    const [selecionado, setSelecionado] = useState(null);
    const [copiado, setCopiado] = useState(false);

    const linkPublico = `${window.location.origin}/pre-cadastro/${usuario?.igreja?.slug || ""}`;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["pre-cadastros", statusFiltro, busca, pagina],
        queryFn: () => preCadastrosAPI.listar({ status: statusFiltro, busca, pagina, limite: 20 }).then((r) => r.data),
        staleTime: 30_000,
    });

    const { data: detalhe, isLoading: loadingDetalhe } = useQuery({
        queryKey: ["pre-cadastro", selecionado],
        queryFn: () => preCadastrosAPI.buscar(selecionado).then((r) => r.data),
        enabled: !!selecionado,
    });

    const aprovarMut = useMutation({
        mutationFn: (id) => preCadastrosAPI.aprovar(id),
        onSuccess: (res) => {
            toast.success(`Membro cadastrado! Nº ${res.data.numero_membro}`);
            qc.invalidateQueries({ queryKey: ["pre-cadastros"] });
            qc.invalidateQueries({ queryKey: ["membros"] });
            setSelecionado(null);
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao aprovar"),
    });

    const rejeitarMut = useMutation({
        mutationFn: ({ id, motivo }) => preCadastrosAPI.rejeitar(id, motivo),
        onSuccess: (res) => {
            const { email_enviado } = res.data;
            toast.success(email_enviado ? "Rejeitado. E-mail enviado ao solicitante." : "Rejeitado. (E-mail não enviado — SMTP não configurado)");
            qc.invalidateQueries({ queryKey: ["pre-cadastros"] });
            setSelecionado(null);
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao rejeitar"),
    });

    const copiarLink = () => {
        navigator.clipboard.writeText(linkPublico).then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        });
    };

    const registros = data?.registros ?? [];
    const total = data?.total ?? 0;
    const totalPaginas = data?.total_paginas ?? 1;

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-primary" /> Pré-Cadastros
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Solicitações de cadastro enviadas pelo link público</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 transition self-start sm:self-auto"
                    title="Atualizar lista"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Link público */}
            <div className="bg-gradient-to-r from-primary/10 to-indigo-50 dark:from-primary/20 dark:to-indigo-900/20 border border-primary/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                    <ExternalLink className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Link Público de Pré-Cadastro</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Compartilhe este link para que pessoas possam enviar uma solicitação de cadastro.
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-primary font-mono truncate max-w-xs">
                                {linkPublico}
                            </code>
                            <button
                                onClick={copiarLink}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-700 transition"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                {copiado ? "Copiado!" : "Copiar"}
                            </button>
                            <a
                                href={linkPublico}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Abrir
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Busca */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, celular, e-mail ou CPF..."
                        value={busca}
                        onChange={(e) => {
                            setBusca(e.target.value);
                            setPagina(1);
                        }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:text-gray-100 placeholder:text-gray-400"
                    />
                </div>
                {/* Status filter */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                    {[
                        { v: "pendente", label: "Pendentes", icon: Clock },
                        { v: "aprovado", label: "Aprovados", icon: CircleCheck },
                        { v: "rejeitado", label: "Rejeitados", icon: CircleX },
                        { v: "", label: "Todos", icon: Filter },
                    ].map(({ v, label, icon: Icon }) => (
                        <button
                            key={v}
                            onClick={() => {
                                setStatusFiltro(v);
                                setPagina(1);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition
                                ${
                                    statusFiltro === v
                                        ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabela / Lista */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : registros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <ClipboardList className="w-12 h-12 mb-3 opacity-40" />
                        <p className="font-medium">Nenhum pré-cadastro {statusFiltro === "pendente" ? "pendente" : "encontrado"}</p>
                        <p className="text-xs mt-1">Compartilhe o link público para receber solicitações</p>
                    </div>
                ) : (
                    <>
                        {/* Cabeçalho da tabela — desktop */}
                        <div className="hidden sm:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,120px] gap-4 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <span>Nome</span>
                            <span>Contato</span>
                            <span>Cidade/UF</span>
                            <span>Entrada</span>
                            <span>Status</span>
                            <span />
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {registros.map((r) => (
                                <div
                                    key={r.id}
                                    className="px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer sm:grid sm:grid-cols-[2fr,1fr,1fr,1fr,1fr,120px] sm:gap-4 sm:items-center flex flex-col gap-2"
                                    onClick={() => setSelecionado(r.id)}
                                >
                                    {/* Nome + data */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                                            {r.foto_url ? (
                                                <img src={r.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <User className="w-4 h-4 text-primary" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.nome_completo}</p>
                                            <p className="text-xs text-gray-400">{fmt(r.created_at)}</p>
                                        </div>
                                    </div>

                                    {/* Contato */}
                                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        <p className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {r.celular || "—"}
                                        </p>
                                        {r.email && (
                                            <p className="flex items-center gap-1 mt-0.5">
                                                <Mail className="w-3 h-3" /> {r.email}
                                            </p>
                                        )}
                                    </div>

                                    {/* Cidade */}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {r.cidade && r.estado ? `${r.cidade}/${r.estado}` : r.cidade || r.estado || "—"}
                                    </p>

                                    {/* Forma entrada */}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{r.forma_entrada || "—"}</p>

                                    {/* Status */}
                                    <div>
                                        <StatusBadge status={r.status} />
                                    </div>

                                    {/* Ação rápida */}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelecionado(r.id);
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Ver
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 text-xs">{total} registros</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                            disabled={pagina === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            ← Anterior
                        </button>
                        <span className="text-xs text-gray-500">
                            {pagina} / {totalPaginas}
                        </span>
                        <button
                            onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                            disabled={pagina === totalPaginas}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Próximo →
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de detalhes */}
            {selecionado && (
                <ModalDetalhe
                    registro={loadingDetalhe ? null : detalhe}
                    onClose={() => setSelecionado(null)}
                    onAprovar={() => aprovarMut.mutate(selecionado)}
                    onRejeitar={(motivo) => rejeitarMut.mutate({ id: selecionado, motivo })}
                    aprovando={aprovarMut.isPending}
                    rejeitando={rejeitarMut.isPending}
                />
            )}
        </div>
    );
}
