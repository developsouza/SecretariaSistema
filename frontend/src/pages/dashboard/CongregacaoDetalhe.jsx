import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { congregacoesAPI } from "../../services/api";
import CongregacaoFormModal from "./CongregacaoFormModal";
import {
    Church,
    ArrowLeft,
    Pencil,
    MapPin,
    UserCheck,
    Phone,
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    ToggleRight,
    ToggleLeft,
    User,
} from "lucide-react";

const SITUACOES = ["", "ativo", "inativo", "transferido", "falecido", "disciplina"];
const SITUACAO_LABEL = {
    ativo: { label: "Ativo", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" },
    inativo: { label: "Inativo", cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" },
    transferido: { label: "Transferido", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
    falecido: { label: "Falecido", cls: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-500" },
    disciplina: { label: "Disciplina", cls: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
};

// ─── Card de dirigente ──────────────────────────────────────────────────────
function DirigenteCard({ nome, cargo, celular, label }) {
    if (!nome) return null;
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
            <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">{label}</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{nome}</p>
                {cargo && <p className="text-xs text-gray-500 dark:text-gray-400">{cargo}</p>}
                {celular && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {celular}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function CongregacaoDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();

    // Filtros
    const [busca, setBusca] = useState("");
    const [situacao, setSituacao] = useState("ativo");
    const [cargo, setCargo] = useState("");
    const [pagina, setPagina] = useState(1);
    const [showEditModal, setShowEditModal] = useState(false);
    const LIMITE = 20;

    // Dados da congregação
    const { data: congregacao, isLoading: loadingCongr } = useQuery({
        queryKey: ["congregacao", id],
        queryFn: () => congregacoesAPI.buscar(id).then((r) => r.data),
    });

    // Lista de membros (atualiza ao mudar filtros/página)
    const { data: membrosData, isLoading: loadingMembros } = useQuery({
        queryKey: ["congregacao-membros", id, busca, situacao, cargo, pagina],
        queryFn: () =>
            congregacoesAPI
                .membros(id, { pagina, limite: LIMITE, busca: busca || undefined, situacao: situacao || undefined, cargo: cargo || undefined })
                .then((r) => r.data),
        keepPreviousData: true,
    });

    const membros = membrosData?.membros || [];
    const total = membrosData?.total || 0;
    const totalPaginas = membrosData?.total_paginas || 1;

    const handleBusca = (v) => {
        setBusca(v);
        setPagina(1);
    };

    const handleFiltro = (key, val) => {
        if (key === "situacao") setSituacao(val);
        if (key === "cargo") setCargo(val);
        setPagina(1);
    };

    if (loadingCongr) {
        return (
            <div className="flex justify-center py-20">
                <div className="spinner" />
            </div>
        );
    }

    if (!congregacao) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">Congregação não encontrada.</p>
                <button onClick={() => navigate(-1)} className="btn btn-ghost mt-4">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
            </div>
        );
    }

    const endereco = [
        congregacao.logradouro,
        congregacao.numero,
        congregacao.bairro ? `- ${congregacao.bairro}` : null,
        congregacao.cidade,
        congregacao.estado,
    ]
        .filter(Boolean)
        .join(", ");

    return (
        <>
            <div className="space-y-6">
                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/dashboard/congregacoes")}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                            <Church className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="page-title">{congregacao.nome}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                {congregacao.ativo ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                                        <ToggleRight className="w-3 h-3" /> Ativa
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full text-xs font-semibold">
                                        <ToggleLeft className="w-3 h-3" /> Inativa
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                                    <Users className="w-3 h-3" /> {congregacao.total_membros ?? 0} membros
                                </span>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setShowEditModal(true)} className="btn btn-ghost">
                        <Pencil className="w-4 h-4" /> Editar
                    </button>
                </div>

                {/* ── Informações da congregação ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Endereço */}
                    {endereco && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-2 shadow-sm">
                            <h3 className="text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" /> Endereço
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{endereco}</p>
                            {congregacao.cep && <p className="text-xs text-gray-400">CEP: {congregacao.cep}</p>}
                        </div>
                    )}

                    {/* Dirigentes */}
                    {(congregacao.dirigente_nome || congregacao.dirigente2_nome) && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3 shadow-sm">
                            <h3 className="text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
                                <UserCheck className="w-3.5 h-3.5" /> Dirigentes
                            </h3>
                            <DirigenteCard
                                label="Dirigente 1"
                                nome={congregacao.dirigente_nome}
                                cargo={congregacao.dirigente_cargo}
                                celular={congregacao.dirigente_celular}
                            />
                            <DirigenteCard
                                label="Dirigente 2"
                                nome={congregacao.dirigente2_nome}
                                cargo={congregacao.dirigente2_cargo}
                                celular={congregacao.dirigente2_celular}
                            />
                        </div>
                    )}
                </div>

                {/* ── Lista de membros ── */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* Cabeçalho da seção */}
                    <div
                        className="flex items-center justify-between px-5 py-3"
                        style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
                    >
                        <div className="flex items-center gap-2 text-white">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-bold tracking-widest uppercase">Membros da Congregação</span>
                        </div>
                        <span className="text-white/80 text-xs font-semibold">
                            {total} encontrado{total !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Filtros */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                        <div className="flex flex-wrap gap-3">
                            {/* Busca */}
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    className="input pl-9 text-sm"
                                    placeholder="Buscar por nome, CPF..."
                                    value={busca}
                                    onChange={(e) => handleBusca(e.target.value)}
                                />
                            </div>

                            {/* Situação */}
                            <select className="input text-sm w-auto" value={situacao} onChange={(e) => handleFiltro("situacao", e.target.value)}>
                                <option value="">Todas situações</option>
                                {SITUACOES.filter(Boolean).map((s) => (
                                    <option key={s} value={s}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </option>
                                ))}
                            </select>

                            {/* Cargo */}
                            <input
                                className="input text-sm w-auto min-w-[140px]"
                                placeholder="Filtrar por cargo..."
                                value={cargo}
                                onChange={(e) => handleFiltro("cargo", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tabela de membros */}
                    {loadingMembros ? (
                        <div className="flex justify-center py-12">
                            <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : membros.length === 0 ? (
                        <div className="py-14 text-center">
                            <User className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum membro encontrado</p>
                            <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                                        <th className="text-left px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                                            Nome
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                                            Contato
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                                            Cargo / Função
                                        </th>
                                        <th className="text-center px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                                            Situação
                                        </th>
                                        <th className="px-5 py-3 hidden md:table-cell" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {membros.map((m) => {
                                        const sit = SITUACAO_LABEL[m.situacao] || { label: m.situacao, cls: "bg-gray-100 text-gray-600" };
                                        return (
                                            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                {/* Nome + foto */}
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                                                            {m.foto_url ? (
                                                                <img src={m.foto_url} alt={m.nome_completo} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <User className="w-4 h-4 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                                                                {m.nome_completo}
                                                            </p>
                                                            {m.numero_membro && <p className="text-xs text-gray-400">Nº {m.numero_membro}</p>}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Contato */}
                                                <td className="px-5 py-3 hidden sm:table-cell">
                                                    <p className="text-gray-700 dark:text-gray-300 text-xs">{m.celular}</p>
                                                    {m.email && <p className="text-gray-400 text-xs">{m.email}</p>}
                                                </td>

                                                {/* Cargo */}
                                                <td className="px-5 py-3 hidden md:table-cell">
                                                    {m.cargo ? (
                                                        <span className="inline-block bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                                                            {m.cargo}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">—</span>
                                                    )}
                                                </td>

                                                {/* Situação */}
                                                <td className="px-5 py-3 text-center">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${sit.cls}`}
                                                    >
                                                        {sit.label}
                                                    </span>
                                                </td>

                                                {/* Ação */}
                                                <td className="px-5 py-3 hidden md:table-cell">
                                                    <Link
                                                        to={`/dashboard/membros/${m.id}`}
                                                        className="text-xs text-primary hover:underline font-medium"
                                                    >
                                                        Ver perfil
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginação */}
                    {totalPaginas > 1 && (
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/30">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Página {pagina} de {totalPaginas}
                            </p>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                    disabled={pagina === 1}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                                    disabled={pagina === totalPaginas}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de edição */}
            {showEditModal && congregacao && (
                <CongregacaoFormModal
                    editData={{ ...congregacao, ativo: !!congregacao.ativo }}
                    onClose={() => setShowEditModal(false)}
                    onSuccessExtra={() => qc.invalidateQueries({ queryKey: ["congregacao", id] })}
                />
            )}
        </>
    );
}
