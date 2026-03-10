import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Church, Users, TrendingUp, DollarSign, Activity, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight } from "lucide-react";
import { superadminAPI } from "../../services/api";

function StatCard({ icon: Icon, label, value, sub, color = "violet", trend }) {
    const colors = {
        violet: "bg-violet-600/15 text-violet-400 border-violet-600/20",
        emerald: "bg-emerald-600/15 text-emerald-400 border-emerald-600/20",
        blue: "bg-blue-600/15 text-blue-400 border-blue-600/20",
        amber: "bg-amber-600/15 text-amber-400 border-amber-600/20",
        rose: "bg-rose-600/15 text-rose-400 border-rose-600/20",
    };
    return (
        <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend != null && (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">+{trend} hoje</span>
                )}
            </div>
            <div>
                <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
                <p className="text-gray-400 text-sm mt-0.5">{label}</p>
                {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

const STATUS_LABELS = {
    active: { label: "Ativo", icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-400/10" },
    trialing: { label: "Trial", icon: Clock, cls: "text-blue-400 bg-blue-400/10" },
    canceled: { label: "Cancelado", icon: XCircle, cls: "text-rose-400 bg-rose-400/10" },
    inactive: { label: "Inativo", icon: AlertTriangle, cls: "text-amber-400 bg-amber-400/10" },
    pending_verification: { label: "Aguard. Verificação", icon: AlertTriangle, cls: "text-amber-400 bg-amber-400/10" },
    past_due: { label: "Em atraso", icon: AlertTriangle, cls: "text-orange-400 bg-orange-400/10" },
};

function StatusBadge({ status }) {
    const s = STATUS_LABELS[status] || { label: status, icon: Activity, cls: "text-gray-400 bg-gray-700" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
            <s.icon className="w-3 h-3" />
            {s.label}
        </span>
    );
}

function fmt(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        superadminAPI
            .stats()
            .then(({ data }) => setStats(data))
            .catch(() => toast.error("Erro ao carregar estatísticas"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        );
    }

    const receitaTotal = (stats?.receitaMensal || 0) + (stats?.receitaAnual || 0) / 12;

    return (
        <div className="space-y-8">
            {/* Cabeçalho */}
            <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Visão Geral</h1>
                <p className="text-gray-400 text-sm mt-1">Resumo da plataforma em {new Date().toLocaleDateString("pt-BR", { dateStyle: "long" })}</p>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Church}
                    label="Igrejas Ativas"
                    value={stats?.igrejasAtivas ?? 0}
                    sub={`${stats?.igrejasInativas ?? 0} inativas`}
                    color="violet"
                    trend={stats?.igrejasHoje}
                />
                <StatCard
                    icon={Users}
                    label="Membros Ativos"
                    value={(stats?.totalMembros ?? 0).toLocaleString("pt-BR")}
                    sub={`+${stats?.membrosHoje ?? 0} hoje`}
                    color="blue"
                />
                <StatCard icon={DollarSign} label="Receita Mensal Est." value={fmt(receitaTotal)} sub="mensal + anual/12" color="emerald" />
                <StatCard icon={TrendingUp} label="Total de Usuários" value={stats?.totalUsuarios ?? 0} sub="em todas as igrejas" color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribuição por status */}
                <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                    <h2 className="text-base font-bold text-white mb-4">Status das Assinaturas</h2>
                    <div className="space-y-3">
                        {(stats?.porStatus || []).map((s) => {
                            const cfg = STATUS_LABELS[s.stripe_status] || {
                                label: s.stripe_status,
                                cls: "text-gray-400 bg-gray-700",
                                icon: Activity,
                            };
                            const pct = stats?.igrejasAtivas ? Math.round((s.n / stats.totalIgrejas) * 100) : 0;
                            return (
                                <div key={s.stripe_status} className="flex items-center gap-3">
                                    <StatusBadge status={s.stripe_status} />
                                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-white font-bold text-sm w-8 text-right">{s.n}</span>
                                </div>
                            );
                        })}
                        {(!stats?.porStatus || stats.porStatus.length === 0) && <p className="text-gray-500 text-sm">Nenhum dado disponível</p>}
                    </div>
                </div>

                {/* Distribuição por plano */}
                <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                    <h2 className="text-base font-bold text-white mb-4">Distribuição por Plano</h2>
                    <div className="space-y-3">
                        {(stats?.porPlano || []).map((p) => {
                            const pct = stats?.totalIgrejas ? Math.round((p.n / stats.totalIgrejas) * 100) : 0;
                            return (
                                <div key={p.plano || "sem"} className="flex items-center gap-3">
                                    <span className="text-sm text-gray-300 w-28 truncate">{p.plano || "Sem plano"}</span>
                                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-white font-bold text-sm w-8 text-right">{p.n}</span>
                                </div>
                            );
                        })}
                        {(!stats?.porPlano || stats.porPlano.length === 0) && <p className="text-gray-500 text-sm">Nenhum dado disponível</p>}
                    </div>
                </div>
            </div>

            {/* Últimas igrejas cadastradas */}
            <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-white">Últimas Igrejas Cadastradas</h2>
                    <Link to="/super-admin/igrejas" className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1 transition">
                        Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 border-b border-gray-700/60">
                                <th className="text-left pb-3 font-medium">Igreja</th>
                                <th className="text-left pb-3 font-medium hidden sm:table-cell">Cidade/Estado</th>
                                <th className="text-left pb-3 font-medium hidden md:table-cell">Plano</th>
                                <th className="text-left pb-3 font-medium">Status</th>
                                <th className="text-left pb-3 font-medium hidden lg:table-cell">Cadastro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/40">
                            {(stats?.ultimasIgrejas || []).map((ig) => (
                                <tr key={ig.id} className="hover:bg-gray-700/20 transition">
                                    <td className="py-3 pr-4">
                                        <Link
                                            to={`/super-admin/igrejas/${ig.id}`}
                                            className="text-white hover:text-violet-300 font-medium transition"
                                        >
                                            {ig.nome}
                                        </Link>
                                    </td>
                                    <td className="py-3 pr-4 text-gray-400 hidden sm:table-cell">
                                        {ig.cidade}, {ig.estado}
                                    </td>
                                    <td className="py-3 pr-4 text-gray-400 hidden md:table-cell">{ig.plano_nome || "—"}</td>
                                    <td className="py-3 pr-4">
                                        <StatusBadge status={ig.stripe_status} />
                                    </td>
                                    <td className="py-3 text-gray-500 hidden lg:table-cell">{new Date(ig.created_at).toLocaleDateString("pt-BR")}</td>
                                </tr>
                            ))}
                            {(!stats?.ultimasIgrejas || stats.ultimasIgrejas.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-gray-500">
                                        Nenhuma igreja cadastrada ainda
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
