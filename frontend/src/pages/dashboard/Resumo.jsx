import { useQuery } from "@tanstack/react-query";
import { dashboardAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { Users, CreditCard, TrendingUp, AlertCircle, UserPlus, UserCheck, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import CalendarioAniversariantes from "../../components/CalendarioAniversariantes";
import OnboardingChecklist from "../../components/OnboardingChecklist";

const COLORS_PIE = ["#4f6ef7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

const CARD_ACCENTS = {
    blue: "from-primary/80 to-primary-300/60",
    green: "from-emerald-400/80 to-emerald-300/60",
    yellow: "from-amber-400/80 to-amber-300/60",
    red: "from-red-400/80 to-red-300/60",
};

function StatCard({ icon: Icon, label, value, sub, color = "blue", progress }) {
    const colors = {
        blue: "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300",
        green: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        yellow: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
        red: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
    };
    return (
        <div className="card-stat flex flex-col gap-2">
            <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r ${CARD_ACCENTS[color]}`} />
            <div className="flex items-center gap-4 pt-1">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
                    {sub && progress == null && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
                </div>
            </div>
            {progress != null && (
                <div>
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                        <span>{sub}</span>
                        <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-700 ${
                                progress >= 90 ? "bg-red-500" : progress >= 75 ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Resumo() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({ queryKey: ["dashboard-resumo"], queryFn: () => dashboardAPI.resumo().then((r) => r.data) });

    if (isLoading)
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );

    const { totais = {}, por_situacao = [], por_cargo = [], cadastros_por_mes = [], faixa_etaria = [], ultimos_cadastros = [] } = data || {};

    const percente = totais.limite ? Math.round((totais.membros_ativos / totais.limite) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Painel</h1>
                <p className="page-subtitle">Bem-vindo, {usuario?.nome?.split(" ")[0]}! Aqui está um resumo da sua igreja.</p>
            </div>

            {/* Onboarding checklist */}
            <OnboardingChecklist totais={totais} />

            {/* Aviso limite */}
            {percente >= 80 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        Você está usando <strong>{percente}%</strong> do limite do seu plano ({totais.membros_ativos}/{totais.limite} membros).{" "}
                        <a href="/dashboard/planos" className="underline font-semibold">
                            Faça upgrade
                        </a>{" "}
                        para continuar crescendo.
                    </p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    label="Membros Ativos"
                    value={totais.membros_ativos || 0}
                    sub={`de ${totais.limite} no plano`}
                    color="blue"
                    progress={percente}
                />
                <StatCard icon={UserPlus} label="Cadastros este mês" value={totais.cadastros_mes || 0} color="green" />
                <StatCard icon={CreditCard} label="Carteiras geradas" value={totais.carteiras_geradas || 0} color="blue" />
                <StatCard icon={AlertCircle} label="Sem foto" value={totais.sem_foto || 0} color="yellow" />
                <div
                    className="card-stat flex flex-col gap-2 cursor-pointer hover:ring-2 hover:ring-indigo-400/50 transition-all"
                    onClick={() => navigate("/dashboard/pre-cadastros")}
                    title="Ver Pré-Cadastros pendentes"
                >
                    <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-indigo-400/80 to-indigo-300/60" />
                    <div className="flex items-center gap-4 pt-1">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{totais.pre_cadastros_pendentes || 0}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">Pré-Cadastros pendentes</p>
                            {(totais.pre_cadastros_pendentes || 0) > 0 && (
                                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5 font-medium">Clique para analisar</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Cadastros por mês */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Novos membros por mês</h3>
                    {cadastros_por_mes.length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-600 text-sm text-center py-8">Sem dados</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={cadastros_por_mes.map((d) => ({ ...d, mes: d.mes?.slice(5) || d.mes }))}>
                                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--rc-axis-text)" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: "var(--rc-axis-text)" }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--rc-tooltip-bg)",
                                        border: "1px solid var(--rc-tooltip-border)",
                                        borderRadius: "0.75rem",
                                        fontSize: "12px",
                                        color: "var(--rc-tooltip-text)",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                                    }}
                                    cursor={{ fill: "rgba(79,110,247,0.06)" }}
                                />
                                <Bar dataKey="total" fill="#4f6ef7" radius={[6, 6, 0, 0]} name="Membros" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Faixa etária */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Faixa etária</h3>
                    {faixa_etaria.length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-600 text-sm text-center py-8">Sem dados</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={faixa_etaria}
                                    dataKey="total"
                                    nameKey="faixa"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ faixa, percent }) => `${Math.round(percent * 100)}%`}
                                >
                                    {faixa_etaria.map((_, i) => (
                                        <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--rc-tooltip-bg)",
                                        border: "1px solid var(--rc-tooltip-border)",
                                        borderRadius: "0.75rem",
                                        fontSize: "12px",
                                        color: "var(--rc-tooltip-text)",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                                    }}
                                />
                                <Legend formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-300">{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Últimos cadastros + Calendário */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Últimos cadastros */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Últimos cadastros</h3>
                    {ultimos_cadastros.length === 0 ? (
                        <div className="empty-state">
                            <UserCheck className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum membro cadastrado ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {ultimos_cadastros.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    {m.foto_url ? (
                                        <img src={m.foto_url} alt={m.nome_completo} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-primary dark:text-primary-300 font-bold text-sm">{m.nome_completo?.[0]}</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{m.nome_completo}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{m.cargo || "Membro"}</p>
                                    </div>
                                    <span className={`badge ${m.situacao === "ativo" ? "badge-green" : "badge-gray"}`}>{m.situacao}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Calendário de aniversariantes */}
                <CalendarioAniversariantes />
            </div>
        </div>
    );
}
