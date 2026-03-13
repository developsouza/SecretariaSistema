import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { membrosAPI, carteirasAPI, dashboardAPI } from "../../../services/api";
import { Search, UserPlus, Filter, CreditCard, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, User, Building2, ArrowUpDown } from "lucide-react";
import clsx from "clsx";
import UpgradeModal from "../../../components/UpgradeModal";
import { congregacoesAPI } from "../../../services/api";

const SITUACOES = [
    { value: "", label: "Todos" },
    { value: "ativo", label: "Ativos" },
    { value: "inativo", label: "Inativos" },
    { value: "transferido", label: "Transferidos" },
    { value: "falecido", label: "Falecidos" },
    { value: "disciplina", label: "Em disciplina" },
];

const BADGE = { ativo: "badge-green", inativo: "badge-gray", transferido: "badge-blue", falecido: "badge-gray", disciplina: "badge-red" };

export default function MembrosLista() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { usuario } = useAuth();
    const gracePeriod = usuario?.igreja?.grace_period ?? false;
    const [pagina, setPagina] = useState(1);
    const [busca, setBusca] = useState("");
    const [situacao, setSituacao] = useState("");
    const [congregacaoId, setCongregacaoId] = useState("");
    const [ordenar, setOrdenar] = useState("numero_membro");
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const params = {
        pagina,
        limite: 20,
        busca: busca || undefined,
        situacao: situacao || undefined,
        congregacao_id: congregacaoId || undefined,
        ordenar,
    };

    const { data: dataCongregacoes } = useQuery({
        queryKey: ["congregacoes"],
        queryFn: () => congregacoesAPI.listar().then((r) => r.data),
        staleTime: 300_000,
    });
    const congregacoes = dataCongregacoes?.congregacoes || dataCongregacoes || [];

    const { data, isLoading } = useQuery({
        queryKey: ["membros", params],
        queryFn: () => membrosAPI.listar(params).then((r) => r.data),
        keepPreviousData: true,
    });

    const { data: resumo } = useQuery({
        queryKey: ["dashboard-resumo"],
        queryFn: () => dashboardAPI.resumo().then((r) => r.data),
        staleTime: 60_000,
    });

    const handleNovoMembro = () => {
        const totalAtivos = resumo?.membros_ativos ?? 0;
        const limite = resumo?.limite ?? Infinity;
        if (totalAtivos >= limite) {
            setShowUpgradeModal(true);
        } else {
            navigate("/dashboard/membros/novo");
        }
    };

    const deletarMut = useMutation({
        mutationFn: (id) => membrosAPI.deletar(id),
        onSuccess: () => {
            toast.success("Membro removido");
            qc.invalidateQueries({ queryKey: ["membros"] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao remover"),
    });

    const gerarCarteiraMut = useMutation({
        mutationFn: (id) => carteirasAPI.gerar(id),
        onSuccess: (res) => toast.success("Carteira gerada! " + (res.data.carteira_url ? "" : "")),
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao gerar carteira"),
    });

    const handleBusca = useCallback((e) => {
        setBusca(e.target.value);
        setPagina(1);
    }, []);

    return (
        <>
            <div className="space-y-5">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Membros</h1>
                        <p className="page-subtitle">{data?.total || 0} membro(s) encontrado(s)</p>
                    </div>
                    <button
                        onClick={handleNovoMembro}
                        disabled={gracePeriod}
                        title={gracePeriod ? "Acesso somente leitura durante o período de carência" : undefined}
                        className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-sm hover:shadow-glow"
                    >
                        <UserPlus className="w-4 h-4" /> Novo Membro
                    </button>
                </div>

                {/* Filtros — linha 1: busca + congregação */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input className="input pl-9" placeholder="Buscar por nome, CPF, celular, e-mail..." value={busca} onChange={handleBusca} />
                    </div>
                    {congregacoes.length > 0 && (
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                className="input pl-9 pr-8 min-w-[200px]"
                                value={congregacaoId}
                                onChange={(e) => {
                                    setCongregacaoId(e.target.value);
                                    setPagina(1);
                                }}
                            >
                                <option value="">Todas as congregações</option>
                                <option value="sede">Igreja Sede</option>
                                {congregacoes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* Ordenação */}
                    <div className="relative">
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            className="input pl-9 pr-8 min-w-[210px]"
                            value={ordenar}
                            onChange={(e) => {
                                setOrdenar(e.target.value);
                                setPagina(1);
                            }}
                        >
                            <option value="numero_membro">Nº Rol (menor → maior)</option>
                            <option value="nome">Nome (A → Z)</option>
                            <option value="data_entrada_igreja">Data de entrada</option>
                            <option value="data_nascimento">Data de nascimento</option>
                            <option value="created_at">Mais recente</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {SITUACOES.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => {
                                setSituacao(s.value);
                                setPagina(1);
                            }}
                            className={clsx(situacao === s.value ? "chip-active" : "chip-default")}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Tabela */}
                <div className="card p-0 overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <div className="spinner" />
                        </div>
                    ) : data?.membros?.length === 0 ? (
                        <div className="empty-state">
                            <User className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                            <div>
                                <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum membro encontrado</p>
                                {!busca && !situacao && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Comece cadastrando o primeiro membro</p>
                                )}
                            </div>
                            {!busca && !situacao && (
                                <Link to="/dashboard/membros/novo" className="btn btn-primary mt-2">
                                    Cadastrar primeiro membro
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="table-header">
                                    <tr>
                                        {["Membro", "Nº Rol", "Situação", "Cargo", "Celular", "Cadastro", "Ações"].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {data.membros.map((m) => (
                                        <tr key={m.id} className="table-row">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {m.foto_url ? (
                                                        <img
                                                            src={m.foto_url}
                                                            alt={m.nome_completo}
                                                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-primary dark:text-primary-300 font-bold text-sm">
                                                                {m.nome_completo?.[0]}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                                                            {m.nome_completo}
                                                        </p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.email || "–"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="table-cell whitespace-nowrap">{m.numero_membro || "–"}</td>
                                            <td className="px-4 py-3">
                                                <span className={`badge ${BADGE[m.situacao] || "badge-gray"}`}>{m.situacao}</span>
                                            </td>
                                            <td className="table-cell whitespace-nowrap">{m.cargo || "–"}</td>
                                            <td className="table-cell whitespace-nowrap">{m.celular}</td>
                                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap text-xs">
                                                {m.data_entrada_igreja
                                                    ? new Date(m.data_entrada_igreja + "T12:00:00").toLocaleDateString("pt-BR")
                                                    : "–"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        title="Ver detalhes"
                                                        onClick={() => navigate(`/dashboard/membros/${m.id}`)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        title={gracePeriod ? "Acesso somente leitura" : "Editar"}
                                                        disabled={gracePeriod}
                                                        onClick={() => !gracePeriod && navigate(`/dashboard/membros/${m.id}/editar`)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        title="Gerar carteira"
                                                        onClick={() => gerarCarteiraMut.mutate(m.id)}
                                                        disabled={gerarCarteiraMut.isPending}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                                                    >
                                                        <CreditCard className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        title={gracePeriod ? "Acesso somente leitura" : "Remover membro"}
                                                        disabled={gracePeriod}
                                                        onClick={() => {
                                                            if (!gracePeriod && confirm("Remover este membro?")) deletarMut.mutate(m.id);
                                                        }}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginação */}
                    {data?.total_paginas > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/50">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Página <span className="font-semibold text-gray-600 dark:text-gray-300">{data.pagina}</span> de{" "}
                                <span className="font-semibold text-gray-600 dark:text-gray-300">{data.total_paginas}</span>
                            </p>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                    disabled={pagina === 1}
                                    className="btn btn-secondary py-1.5 px-2.5 text-xs"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setPagina((p) => Math.min(data.total_paginas, p + 1))}
                                    disabled={pagina === data.total_paginas}
                                    className="btn btn-secondary py-1.5 px-2.5 text-xs"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                limiteMembros={resumo?.limite ?? 0}
                totalAtivos={resumo?.membros_ativos ?? 0}
            />
        </>
    );
}
