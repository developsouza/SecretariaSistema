import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Church,
    Users,
    CreditCard,
    MapPin,
    Mail,
    Phone,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Activity,
    Save,
    ToggleLeft,
    ToggleRight,
    Trash2,
} from "lucide-react";
import { superadminAPI } from "../../services/api";

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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
        </span>
    );
}

function InfoRow({ label, value }) {
    if (!value) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-2 border-b border-gray-700/40 last:border-0">
            <span className="text-gray-500 text-xs w-36 flex-shrink-0">{label}</span>
            <span className="text-gray-200 text-sm">{value}</span>
        </div>
    );
}

const STATUS_OPTS = ["active", "trialing", "canceled", "inactive", "pending_verification", "past_due"];

export default function SuperAdminIgrejaDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Campos editáveis
    const [planoId, setPlanoId] = useState("");
    const [stripeStatus, setStripeStatus] = useState("");
    const [planoPeriodo, setPlanoPeriodo] = useState("mensal");

    const carregar = async () => {
        setLoading(true);
        try {
            const { data } = await superadminAPI.buscarIgreja(id);
            setDados(data);
            setPlanoId(data.igreja.plano_id || "");
            setStripeStatus(data.igreja.stripe_status || "inactive");
            setPlanoPeriodo(data.igreja.plano_periodo || "mensal");
        } catch {
            toast.error("Erro ao carregar igreja");
            navigate("/super-admin/igrejas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregar();
    }, [id]);

    const salvar = async () => {
        setSaving(true);
        try {
            await superadminAPI.atualizarIgreja(id, {
                plano_id: planoId || undefined,
                stripe_status: stripeStatus,
                plano_periodo: planoPeriodo,
            });
            toast.success("Dados atualizados com sucesso");
            carregar();
        } catch {
            toast.error("Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const toggleAtivo = async () => {
        try {
            await superadminAPI.atualizarIgreja(id, { ativo: !dados.igreja.ativo });
            toast.success(dados.igreja.ativo ? "Igreja desativada" : "Igreja reativada");
            carregar();
        } catch {
            toast.error("Erro ao alterar status");
        }
    };

    const excluir = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 5000);
            return;
        }
        try {
            await superadminAPI.excluirIgreja(id);
            toast.success(`"${dados.igreja.nome}" excluída permanentemente`);
            navigate("/super-admin/igrejas");
        } catch {
            toast.error("Erro ao excluir igreja");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        );
    }

    const ig = dados?.igreja;

    return (
        <div className="space-y-6 w-full">
            {/* Voltar */}
            <div className="flex items-center gap-3">
                <Link to="/super-admin/igrejas" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </Link>
            </div>

            {/* Header da igreja */}
            <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-700/60 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {ig?.logo_url ? (
                                <img src={ig.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Church className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-extrabold text-white">{ig?.nome}</h1>
                                <StatusBadge status={ig?.stripe_status} />
                                {!ig?.ativo && (
                                    <span className="text-xs bg-red-500/10 text-red-400 font-semibold px-2 py-0.5 rounded-full border border-red-500/20">
                                        DESATIVADA
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm mt-0.5">
                                {ig?.email} · {ig?.slug}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleAtivo}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            ig?.ativo
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                        }`}
                    >
                        {ig?.ativo ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                        {ig?.ativo ? "Desativar" : "Reativar"}
                    </button>
                    <button
                        onClick={excluir}
                        title={confirmDelete ? "Clique novamente para confirmar a exclusão" : "Excluir permanentemente"}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                            confirmDelete
                                ? "bg-red-600 text-white hover:bg-red-700 border-red-600 animate-pulse"
                                : "bg-gray-700/40 text-gray-400 hover:text-red-400 hover:border-red-500/40 border-gray-600/40"
                        }`}
                    >
                        <Trash2 className="w-4 h-4" />
                        {confirmDelete ? "Confirmar exclusão" : "Excluir"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Informações gerais */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Dados da igreja */}
                    <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                            <Church className="w-4 h-4 text-violet-400" /> Dados da Igreja
                        </h2>
                        <div>
                            <InfoRow label="Nome completo" value={ig?.nome} />
                            <InfoRow label="Nome Curto" value={ig?.nome_curto} />
                            <InfoRow label="Denominação" value={ig?.denominacao} />
                            <InfoRow label="Pastor" value={ig?.pastor_nome} />
                            <InfoRow label="CNPJ" value={ig?.cnpj} />
                            <InfoRow label="E-mail" value={ig?.email} />
                            <InfoRow label="Telefone" value={ig?.telefone || ig?.celular} />
                            <InfoRow label="Endereço" value={ig?.logradouro ? `${ig.logradouro}, ${ig.numero} — ${ig.bairro}` : ""} />
                            <InfoRow label="Cidade/Estado" value={ig?.cidade ? `${ig.cidade}/${ig.estado}` : ""} />
                            <InfoRow label="CEP" value={ig?.cep} />
                        </div>
                    </div>

                    {/* Usuários da igreja */}
                    <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-violet-400" /> Usuários ({dados?.usuarios?.length || 0})
                        </h2>
                        <div className="space-y-2">
                            {(dados?.usuarios || []).map((u) => (
                                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-700/40 last:border-0">
                                    <div>
                                        <p className="text-white text-sm font-medium">{u.nome}</p>
                                        <p className="text-gray-500 text-xs">{u.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                u.perfil === "admin"
                                                    ? "bg-violet-500/15 text-violet-400"
                                                    : u.perfil === "secretario"
                                                      ? "bg-blue-500/15 text-blue-400"
                                                      : "bg-gray-700 text-gray-400"
                                            }`}
                                        >
                                            {u.perfil}
                                        </span>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                                        >
                                            {u.ativo ? "ativo" : "inativo"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!dados?.usuarios || dados.usuarios.length === 0) && <p className="text-gray-500 text-sm">Sem usuários cadastrados</p>}
                        </div>
                    </div>
                </div>

                {/* Painel lateral */}
                <div className="space-y-6">
                    {/* Estatísticas rápidas */}
                    <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-white mb-4">Estatísticas</h2>
                        <div className="space-y-3">
                            {[
                                { label: "Membros ativos", value: ig?.total_membros ?? 0, icon: Users },
                                { label: "Total de membros", value: ig?.total_membros_todos ?? 0, icon: Users },
                                { label: "Congregações", value: ig?.total_congregacoes ?? 0, icon: Church },
                                { label: "Carteiras geradas", value: ig?.total_carteiras ?? 0, icon: CreditCard },
                                { label: "Usuários", value: dados?.usuarios?.length ?? 0, icon: Users },
                            ].map(({ label, value, icon: Icon }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <Icon className="w-3.5 h-3.5" /> {label}
                                    </div>
                                    <span className="text-white font-bold text-sm">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gerenciar plano/status */}
                    <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-violet-400" /> Plano & Status
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-1.5 block">Plano</label>
                                <select
                                    value={planoId}
                                    onChange={(e) => setPlanoId(e.target.value)}
                                    className="w-full h-9 px-3 bg-gray-900/70 border border-gray-600/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                                >
                                    <option value="">Sem plano</option>
                                    {(dados?.planos || []).map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1.5 block">Status Stripe</label>
                                <select
                                    value={stripeStatus}
                                    onChange={(e) => setStripeStatus(e.target.value)}
                                    className="w-full h-9 px-3 bg-gray-900/70 border border-gray-600/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                                >
                                    {STATUS_OPTS.map((s) => (
                                        <option key={s} value={s}>
                                            {STATUS_MAP[s]?.label || s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1.5 block">Período</label>
                                <select
                                    value={planoPeriodo}
                                    onChange={(e) => setPlanoPeriodo(e.target.value)}
                                    className="w-full h-9 px-3 bg-gray-900/70 border border-gray-600/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                                >
                                    <option value="mensal">Mensal</option>
                                    <option value="anual">Anual</option>
                                </select>
                            </div>
                            <button
                                onClick={salvar}
                                disabled={saving}
                                className="w-full h-9 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5" /> Salvar alterações
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Stripe IDs */}
                        {(ig?.stripe_customer_id || ig?.stripe_subscription_id) && (
                            <div className="mt-4 pt-4 border-t border-gray-700/40">
                                <p className="text-gray-500 text-xs mb-2">IDs Stripe</p>
                                {ig?.stripe_customer_id && <p className="text-gray-400 text-xs font-mono break-all">{ig.stripe_customer_id}</p>}
                                {ig?.stripe_subscription_id && (
                                    <p className="text-gray-400 text-xs font-mono break-all mt-1">{ig.stripe_subscription_id}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Datas */}
                    <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-white mb-3">Datas</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Cadastro</span>
                                <span className="text-gray-300">{ig?.created_at ? new Date(ig.created_at).toLocaleDateString("pt-BR") : "—"}</span>
                            </div>
                            {ig?.trial_end && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Trial até</span>
                                    <span className="text-gray-300">{new Date(ig.trial_end).toLocaleDateString("pt-BR")}</span>
                                </div>
                            )}
                            {ig?.plano_vencimento && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Vencimento</span>
                                    <span className="text-gray-300">{new Date(ig.plano_vencimento).toLocaleDateString("pt-BR")}</span>
                                </div>
                            )}
                            {ig?.cancelado_em && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Cancelado em</span>
                                    <span className="text-rose-400">{new Date(ig.cancelado_em).toLocaleDateString("pt-BR")}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
