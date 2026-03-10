import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { planosAPI } from "../../services/api";
import { CheckCircle2, Zap, ExternalLink, CreditCard, RefreshCw, AlertTriangle, Calendar } from "lucide-react";
import clsx from "clsx";

export default function PlanosPage() {
    const [periodo, setPeriodo] = useState("mensal");
    const [checkingOutId, setCheckingOutId] = useState(null); // rastreia qual plano está em checkout

    const { data: planos = [] } = useQuery({ queryKey: ["planos"], queryFn: () => planosAPI.listar().then((r) => r.data) });
    const { data: assinatura, isLoading: loadingAssin } = useQuery({
        queryKey: ["assinatura"],
        queryFn: () => planosAPI.assinatura().then((r) => r.data),
    });

    const checkoutMut = useMutation({
        mutationFn: ({ plano_id }) => {
            setCheckingOutId(plano_id);
            return planosAPI.checkout({ plano_id, periodo }).then((r) => r.data);
        },
        onSuccess: (data) => {
            setCheckingOutId(null);
            if (data.checkout_url) window.location.href = data.checkout_url;
        },
        onError: (e) => {
            setCheckingOutId(null);
            toast.error(e.response?.data?.error || "Erro ao iniciar pagamento");
        },
    });

    const portalMut = useMutation({
        mutationFn: () => planosAPI.portal().then((r) => r.data),
        onSuccess: (data) => {
            if (data.portal_url) window.location.href = data.portal_url;
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao acessar portal"),
    });

    const statusColors = { active: "badge-green", trialing: "badge-blue", canceled: "badge-red", past_due: "badge-yellow", inactive: "badge-gray" };
    const statusLabel = { active: "Ativa", trialing: "Trial", canceled: "Cancelada", past_due: "Pagamento pendente", inactive: "Inativa" };
    const periodoLabel = { mensal: "Mensal", anual: "Anual" };

    // Verifica se algum plano tem price_id anual configurado
    const anualDisponivel = planos.some((p) => p.stripe_price_id_anual);
    const anualNaoConfigurado = periodo === "anual" && !anualDisponivel;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="page-title">Plano e Cobrança</h1>
                <p className="page-subtitle">Gerencie sua assinatura</p>
            </div>

            {/* Assinatura atual */}
            {!loadingAssin && assinatura && (
                <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Assinatura atual</h3>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{assinatura.plano_nome || "Sem plano"}</p>
                                <span className={`badge ${statusColors[assinatura.stripe_status] || "badge-gray"}`}>
                                    {statusLabel[assinatura.stripe_status] || assinatura.stripe_status}
                                </span>
                                {assinatura.plano_periodo && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                        <Calendar className="w-3 h-3" />
                                        {periodoLabel[assinatura.plano_periodo] || assinatura.plano_periodo}
                                    </span>
                                )}
                            </div>
                            {assinatura.plano_vencimento && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Próximo pagamento: {new Date(assinatura.plano_vencimento).toLocaleDateString("pt-BR")}
                                </p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {assinatura.limite_membros >= 999999 ? "Membros ilimitados" : `Até ${assinatura.limite_membros} membros`}
                            </p>
                        </div>
                        {assinatura.stripe_status !== "inactive" && (
                            <button onClick={() => portalMut.mutate()} disabled={portalMut.isPending} className="btn btn-secondary">
                                {portalMut.isPending ? (
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <ExternalLink className="w-4 h-4" />
                                )}
                                Gerenciar cobrança
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Toggle mensal/anual */}
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    <span
                        className={clsx(
                            "text-sm font-medium",
                            periodo === "mensal" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600",
                        )}
                    >
                        Mensal
                    </span>
                    <button
                        onClick={() => setPeriodo((p) => (p === "mensal" ? "anual" : "mensal"))}
                        className={clsx(
                            "relative w-12 h-6 rounded-full transition-colors duration-200",
                            periodo === "anual" ? "bg-primary" : "bg-gray-300",
                        )}
                    >
                        <span
                            className={clsx(
                                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200",
                                periodo === "anual" ? "left-[26px]" : "left-0.5",
                            )}
                        />
                    </button>
                    <span
                        className={clsx(
                            "text-sm font-medium",
                            periodo === "anual" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600",
                        )}
                    >
                        Anual <span className="text-green-600 text-xs font-bold ml-1">-20%</span>
                    </span>
                </div>
                {/* Aviso quando price_id anual não está configurado no Stripe */}
                {anualNaoConfigurado && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Planos anuais ainda não configurados no Stripe. Configure os{" "}
                        <code className="font-mono bg-amber-100 dark:bg-amber-500/20 px-1 rounded">stripe_price_id_anual</code> para habilitar esta
                        opção.
                    </div>
                )}
            </div>

            {/* Cards de planosl */}
            <div className="grid md:grid-cols-3 gap-5">
                {planos.map((plano, i) => {
                    const isAtual = plano.id === assinatura?.plano_id;
                    const isDestaque = i === 1;
                    const preco = periodo === "anual" ? plano.preco_anual / 12 : plano.preco_mensal;
                    return (
                        <div
                            key={plano.id}
                            className={clsx(
                                "rounded-2xl p-6 border-2 flex flex-col relative",
                                isDestaque
                                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                                    : isAtual
                                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                            )}
                        >
                            {isAtual && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                                    PLANO ATUAL
                                </span>
                            )}
                            {isDestaque && !isAtual && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-0.5 rounded-full">
                                    MAIS POPULAR
                                </span>
                            )}
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{plano.nome}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{plano.descricao}</p>
                            <div className="mt-4 mb-4">
                                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">R$ {preco.toFixed(2).replace(".", ",")}</span>
                                <span className="text-gray-400 dark:text-gray-500 text-sm">/mês</span>
                                {periodo === "anual" && (
                                    <>
                                        <p className="text-xs text-green-600 dark:text-emerald-400 font-medium">
                                            R$ {plano.preco_anual.toFixed(2).replace(".", ",")} por ano
                                        </p>
                                        {plano.preco_mensal > 0 && (
                                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                                                💰 Economize R$ {(plano.preco_mensal * 12 - plano.preco_anual).toFixed(2).replace(".", ",")} por ano
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                            <ul className="space-y-2 flex-1 mb-5">
                                <PlanFeature text={plano.limite_membros >= 999999 ? "Membros ilimitados" : `Até ${plano.limite_membros} membros`} />
                                {plano.recursos?.carteiras && <PlanFeature text="Carteiras em PDF" />}
                                {plano.recursos?.qrcode && <PlanFeature text="QR Code de validação" />}
                                {plano.recursos?.email && <PlanFeature text="Notificações por e-mail" />}
                                {plano.recursos?.relatorios_avancados && <PlanFeature text="Relatórios avançados" />}
                                {plano.recursos?.suporte_prioritario && <PlanFeature text="Suporte prioritário" />}
                            </ul>
                            {!isAtual && (
                                <button
                                    onClick={() => checkoutMut.mutate({ plano_id: plano.id })}
                                    disabled={checkingOutId !== null || anualNaoConfigurado}
                                    className={clsx("btn w-full justify-center", isDestaque ? "btn-primary" : "btn-secondary")}
                                    title={anualNaoConfigurado ? "Configure o price_id anual no Stripe antes de assinar" : undefined}
                                >
                                    {checkingOutId === plano.id ? (
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CreditCard className="w-4 h-4" />
                                    )}
                                    Assinar agora
                                </button>
                            )}
                            {isAtual && (
                                <div className="flex items-center justify-center gap-2 py-2 text-green-700 dark:text-emerald-400 font-medium text-sm">
                                    <CheckCircle2 className="w-4 h-4" /> Plano ativo
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PlanFeature({ text }) {
    return (
        <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            {text}
        </li>
    );
}
