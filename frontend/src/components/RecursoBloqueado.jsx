import { Lock, Rocket, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Card exibido quando o usuário tenta acessar um recurso indisponível no plano atual.
 *
 * Props:
 *   titulo      {string}   — Título do recurso bloqueado
 *   descricao   {string}   — Breve descrição do que está disponível ao fazer upgrade
 *   recursos    {string[]} — Lista de funcionalidades incluídas nos planos superiores
 *   planos      {string[]} — Nomes dos planos que incluem o recurso
 *   gradiente   {string}   — Classes Tailwind do gradiente do cabeçalho
 */
export default function RecursoBloqueado({
    titulo,
    descricao,
    recursos = [],
    planos = ["Profissional", "Premium"],
    gradiente = "from-purple-600 to-indigo-600",
}) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
                {/* Cabeçalho com gradiente */}
                <div className={`bg-gradient-to-br ${gradiente} px-8 py-8 text-white`}>
                    <div className="flex items-start justify-between mb-5">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Lock className="w-7 h-7" />
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                            {planos.map((p) => (
                                <span key={p} className="px-3 py-1 bg-white/15 text-white text-xs font-semibold rounded-full border border-white/25">
                                    {p}
                                </span>
                            ))}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold leading-tight">{titulo}</h2>
                    {descricao && <p className="text-sm text-white/80 mt-2 leading-relaxed">{descricao}</p>}
                </div>

                {/* Corpo */}
                <div className="bg-white dark:bg-gray-800 px-8 py-6">
                    {recursos.length > 0 && (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                                O que você terá acesso
                            </p>
                            <ul className="space-y-3 mb-6">
                                {recursos.map((r, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        </span>
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <button
                        onClick={() => navigate("/dashboard/planos")}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-700 text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        <Rocket className="w-4 h-4" />
                        Ver planos e fazer upgrade
                    </button>

                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
                        Faça upgrade agora e desbloqueie este e outros recursos exclusivos
                    </p>
                </div>
            </div>
        </div>
    );
}
