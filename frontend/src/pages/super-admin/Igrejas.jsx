import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Search,
    Church,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Activity,
    ChevronLeft,
    ChevronRight,
    ToggleLeft,
    ToggleRight,
    ExternalLink,
    Trash2,
} from "lucide-react";
import { superadminAPI } from "../../services/api";

const STATUS_OPTS = [
    { value: "", label: "Todos os status" },
    { value: "active", label: "Ativo" },
    { value: "trialing", label: "Trial" },
    { value: "canceled", label: "Cancelado" },
    { value: "inactive", label: "Inativo" },
    { value: "past_due", label: "Em atraso" },
    { value: "pending_verification", label: "Aguard. verificação" },
];

const STATUS_MAP = {
    active: { label: "Ativo", icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-400/10" },
    trialing: { label: "Trial", icon: Clock, cls: "text-blue-400 bg-blue-400/10" },
    canceled: { label: "Cancelado", icon: XCircle, cls: "text-rose-400 bg-rose-400/10" },
    inactive: { label: "Inativo", icon: AlertTriangle, cls: "text-amber-400 bg-amber-400/10" },
    pending_verification: { label: "Aguard. verificação", icon: AlertTriangle, cls: "text-amber-400 bg-amber-400/10" },
    past_due: { label: "Em atraso", icon: AlertTriangle, cls: "text-orange-400 bg-orange-400/10" },
};

function StatusBadge({ status }) {
    const s = STATUS_MAP[status] || { label: status, icon: Activity, cls: "text-gray-400 bg-gray-700" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
            <s.icon className="w-3 h-3" />
            {s.label}
        </span>
    );
}

export default function SuperAdminIgrejas() {
    const [igrejas, setIgrejas] = useState([]);
    const [total, setTotal] = useState(0);
    const [planos, setPlanos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [planoFilter, setPlanoFilter] = useState("");
    const [page, setPage] = useState(1);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const LIMIT = 20;

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await superadminAPI.listarIgrejas({ search, status: statusFilter, plano_id: planoFilter, page, limit: LIMIT });
            setIgrejas(data.igrejas);
            setTotal(data.total);
        } catch {
            toast.error("Erro ao carregar igrejas");
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, planoFilter, page]);

    useEffect(() => {
        superadminAPI
            .listarPlanos()
            .then(({ data }) => setPlanos(data.planos))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const t = setTimeout(carregar, 300);
        return () => clearTimeout(t);
    }, [carregar]);

    const toggleAtivo = async (ig) => {
        try {
            await superadminAPI.atualizarIgreja(ig.id, { ativo: !ig.ativo });
            toast.success(ig.ativo ? "Igreja desativada" : "Igreja reativada");
            carregar();
        } catch {
            toast.error("Erro ao alterar status");
        }
    };

    const excluir = async (ig) => {
        if (confirmDeleteId !== ig.id) {
            setConfirmDeleteId(ig.id);
            setTimeout(() => setConfirmDeleteId((cur) => (cur === ig.id ? null : cur)), 4000);
            return;
        }
        try {
            await superadminAPI.excluirIgreja(ig.id);
            toast.success(`"${ig.nome}" excluída permanentemente`);
            setConfirmDeleteId(null);
            carregar();
        } catch {
            toast.error("Erro ao excluir igreja");
        }
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Igrejas / Tenants</h1>
                <p className="text-gray-400 text-sm mt-1">
                    {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, e-mail ou cidade…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full h-10 pl-9 pr-4 bg-gray-800/70 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                    }}
                    className="h-10 px-3 bg-gray-800/70 border border-gray-700/60 rounded-xl text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                >
                    {STATUS_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <select
                    value={planoFilter}
                    onChange={(e) => {
                        setPlanoFilter(e.target.value);
                        setPage(1);
                    }}
                    className="h-10 px-3 bg-gray-800/70 border border-gray-700/60 rounded-xl text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                >
                    <option value="">Todos os planos</option>
                    {planos.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.nome}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tabela */}
            <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 border-b border-gray-700/60 text-left">
                                    <th className="px-4 py-3 font-medium">Igreja</th>
                                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Cidade</th>
                                    <th className="px-4 py-3 font-medium hidden md:table-cell">Plano</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium hidden lg:table-cell text-center">Membros</th>
                                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Cadastro</th>
                                    <th className="px-4 py-3 font-medium text-center">Ativo</th>
                                    <th className="px-4 py-3 font-medium" />
                                    <th className="px-4 py-3 font-medium" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/40">
                                {igrejas.map((ig) => (
                                    <tr key={ig.id} className="hover:bg-gray-700/20 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-700/60 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    {ig.logo_url ? (
                                                        <img src={ig.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
                                                    ) : (
                                                        <Church className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white font-medium truncate max-w-[160px]">{ig.nome}</p>
                                                    <p className="text-gray-500 text-xs truncate">{ig.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 hidden sm:table-cell whitespace-nowrap">
                                            {ig.cidade}, {ig.estado}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{ig.plano_nome || "—"}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={ig.stripe_status} />
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-300 hidden lg:table-cell">{ig.total_membros}</td>
                                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                                            {new Date(ig.created_at).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => toggleAtivo(ig)} className="transition" title={ig.ativo ? "Desativar" : "Ativar"}>
                                                {ig.ativo ? (
                                                    <ToggleRight className="w-6 h-6 text-emerald-400 hover:text-emerald-300" />
                                                ) : (
                                                    <ToggleLeft className="w-6 h-6 text-gray-600 hover:text-amber-400" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/super-admin/igrejas/${ig.id}`}
                                                className="text-violet-400 hover:text-violet-300 transition"
                                                title="Ver detalhes"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => excluir(ig)}
                                                title={confirmDeleteId === ig.id ? "Clique novamente para confirmar" : "Excluir permanentemente"}
                                                className={`transition flex items-center gap-1 text-xs font-semibold rounded-lg px-2 py-1 ${
                                                    confirmDeleteId === ig.id
                                                        ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                                        : "text-gray-600 hover:text-red-400"
                                                }`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                {confirmDeleteId === ig.id && <span>Confirmar</span>}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {igrejas.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center text-gray-500">
                                            Nenhuma igreja encontrada
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/60">
                        <p className="text-gray-500 text-sm">
                            Página {page} de {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700/60 text-gray-400 hover:bg-gray-600 disabled:opacity-30 transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700/60 text-gray-400 hover:bg-gray-600 disabled:opacity-30 transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
