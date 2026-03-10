import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ChevronRight, X, Rocket } from "lucide-react";
import { igrejasAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";

/**
 * Exibe checklist de primeiros passos enquanto houver passos incompletos e o usuário
 * não tiver dispensado o card.
 *
 * Props:
 *   totais { membros_ativos, carteiras_geradas } — vindos do resumo do dashboard
 */
export default function OnboardingChecklist({ totais = {} }) {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [dispensando, setDispensando] = useState(false);

    const igreja = usuario?.igreja || {};
    const onboardingSteps = igreja.onboarding_steps || {};

    // ── Detectar se cada passo está concluído ────────────────────────────
    // Verifica pelo flag explícito do backend (mais confiável) OU pela cor salva diferente do padrão
    const corPersonalizada =
        !!onboardingSteps.cores_configuradas ||
        (igreja.cor_primaria && igreja.cor_primaria !== "#1a56db") ||
        (igreja.cor_secundaria && igreja.cor_secundaria !== "#6366f1");

    const steps = [
        {
            id: "conta_criada",
            label: "Conta criada",
            done: true,
            link: null,
        },
        {
            id: "logo",
            label: "Adicione o logo da sua igreja",
            done: !!igreja.logo_url,
            link: "/dashboard/configuracoes#visual",
        },
        {
            id: "cores",
            label: "Configure as cores da sua marca",
            done: !!corPersonalizada,
            link: "/dashboard/configuracoes#visual",
        },
        {
            id: "primeiro_membro",
            label: "Cadastre o primeiro membro",
            done: (totais.membros_ativos ?? 0) > 0,
            link: "/dashboard/membros/novo",
        },
        {
            id: "primeira_carteirinha",
            label: "Gere a primeira carteirinha",
            done: (totais.carteiras_geradas ?? 0) > 0,
            link: "/dashboard/carteiras",
        },
        {
            id: "plano",
            label: "Escolha um plano",
            done: igreja.stripe_status === "active",
            link: "/dashboard/planos",
        },
    ];

    const totalSteps = steps.length;
    const doneCount = steps.filter((s) => s.done).length;
    const allDone = doneCount === totalSteps;
    const dispensado = !!onboardingSteps.dispensado;

    // ── Mutation para dispensar ──────────────────────────────────────────
    const dispensarMutation = useMutation({
        mutationFn: () => igrejasAPI.marcarOnboarding({ dispensado: true }),
        onMutate: () => setDispensando(true),
        onSuccess: () => {
            // Atualiza o cache do /auth/me para refletir dispensado = true sem refresh
            queryClient.invalidateQueries({ queryKey: ["auth-me"] });
        },
        onError: () => setDispensando(false),
    });

    // Não exibe se dispensado ou tudo concluído
    if (dispensado || allDone) return null;

    const percente = Math.round((doneCount / totalSteps) * 100);

    return (
        <div className="card border-primary/20 dark:border-primary/25 bg-gradient-to-br from-primary/5 via-white to-white dark:from-primary/10 dark:via-gray-800 dark:to-gray-800 overflow-hidden relative">
            {/* Acento top */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-primary/70 to-primary-300/50" />

            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Rocket className="w-5 h-5 text-primary dark:text-primary-300" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            Primeiros passos — {doneCount}/{totalSteps} concluídos
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Complete a configuração inicial da sua igreja</p>
                    </div>
                </div>
                <button
                    onClick={() => dispensarMutation.mutate()}
                    disabled={dispensando}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 mt-0.5"
                    title="Dispensar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div
                    className="bg-gradient-to-r from-primary to-primary-400 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${percente}%` }}
                />
            </div>

            {/* Lista de passos */}
            <ul className="space-y-1">
                {steps.map((step) => (
                    <li key={step.id}>
                        {step.link && !step.done ? (
                            <button
                                onClick={() => navigate(step.link)}
                                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group text-left"
                            >
                                <Circle className="w-4.5 h-4.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-primary-300 transition-colors">
                                    {step.label}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary dark:group-hover:text-primary-300 transition-colors flex-shrink-0" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 px-2 py-2">
                                <CheckCircle2
                                    className={`w-4.5 h-4.5 flex-shrink-0 ${
                                        step.done ? "text-emerald-500 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"
                                    }`}
                                />
                                <span
                                    className={`text-sm ${
                                        step.done ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-700 dark:text-gray-300"
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
