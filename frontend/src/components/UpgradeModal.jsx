import { useNavigate } from "react-router-dom";
import { X, Zap, Users, ArrowRight } from "lucide-react";

/**
 * Modal exibido quando o limite de membros do plano é atingido.
 *
 * Props:
 *   isOpen        {boolean}  — controla visibilidade
 *   onClose       {function} — callback para fechar
 *   limiteMembros {number}   — limite atual do plano (ex: 50)
 *   totalAtivos   {number}   — membros ativos atuais (opcional, para exibição)
 */
export default function UpgradeModal({ isOpen, onClose, limiteMembros, totalAtivos }) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUpgrade = () => {
        onClose();
        navigate("/dashboard/planos");
    };

    return (
        /* Overlay */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Card */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Faixa superior âmbar */}
                <div className="bg-amber-500 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Users className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold">Limite de membros atingido</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" aria-label="Fechar">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Corpo */}
                <div className="px-6 py-6 space-y-4">
                    {/* Resumo numérico */}
                    <div className="flex items-center justify-center gap-4 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                        <div className="text-center">
                            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{totalAtivos ?? limiteMembros}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Membros ativos</p>
                        </div>
                        <div className="text-2xl text-gray-300 dark:text-gray-600">/</div>
                        <div className="text-center">
                            <p className="text-2xl font-extrabold text-gray-700 dark:text-gray-200">{limiteMembros}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Limite do plano</p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                        Seu plano atual permite até <strong>{limiteMembros} membros ativos</strong>. Para continuar cadastrando, faça upgrade para um
                        plano maior.
                    </p>

                    {/* Benefícios rápidos */}
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        {["Mais membros cadastrados", "Carteirinhas ilimitadas", "Relatórios avançados"].map((item) => (
                            <li key={item} className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Rodapé */}
                <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
                    <button onClick={onClose} className="btn btn-secondary flex-1">
                        Agora não
                    </button>
                    <button onClick={handleUpgrade} className="btn btn-primary flex-1 gap-2">
                        Ver planos
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
