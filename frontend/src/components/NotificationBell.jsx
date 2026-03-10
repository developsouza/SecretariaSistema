import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check, Trash2, X, Cake, ClipboardList } from "lucide-react";
import { notificacoesAPI } from "../services/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICONES = {
    aniversario: Cake,
    pre_cadastro: ClipboardList,
};

const CORES = {
    aniversario: "text-pink-500 bg-pink-50 dark:bg-pink-500/10",
    pre_cadastro: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const queryClient = useQueryClient();

    // Fecha ao clicar fora
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ["notificacoes"],
        queryFn: () => notificacoesAPI.listar({ limite: 30 }).then((r) => r.data),
        refetchInterval: 60_000, // re-fetch a cada 1 min
    });

    const notificacoes = data?.notificacoes || [];
    const totalNaoLidas = data?.total_nao_lidas || 0;

    const marcarLida = useMutation({
        mutationFn: (id) => notificacoesAPI.marcarLida(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] }),
    });

    const marcarTodas = useMutation({
        mutationFn: () => notificacoesAPI.marcarTodasLidas(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] }),
    });

    const deletar = useMutation({
        mutationFn: (id) => notificacoesAPI.deletar(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] }),
    });

    const limparLidas = useMutation({
        mutationFn: () => notificacoesAPI.limparLidas(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] }),
    });

    return (
        <div className="relative" ref={ref}>
            {/* Botão sino */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Notificações"
            >
                <Bell className="w-5 h-5" />
                {totalNaoLidas > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold leading-none">
                        {totalNaoLidas > 9 ? "9+" : totalNaoLidas}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/50 z-50 flex flex-col max-h-[520px]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            Notificações
                            {totalNaoLidas > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold">
                                    {totalNaoLidas}
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-1">
                            {totalNaoLidas > 0 && (
                                <button
                                    onClick={() => marcarTodas.mutate()}
                                    title="Marcar todas como lidas"
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => limparLidas.mutate()}
                                title="Limpar notificações lidas"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Lista */}
                    <div className="overflow-y-auto flex-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notificacoes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
                                <BellOff className="w-8 h-8" />
                                <p className="text-sm">Nenhuma notificação</p>
                            </div>
                        ) : (
                            notificacoes.map((n) => {
                                const Icone = ICONES[n.tipo] || Bell;
                                const cor = CORES[n.tipo] || "text-blue-500 bg-blue-50 dark:bg-blue-500/10";
                                let dados = {};
                                try {
                                    dados = JSON.parse(n.dados || "{}");
                                } catch (_) {}

                                return (
                                    <div
                                        key={n.id}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/30 transition-colors ${
                                            n.lida ? "opacity-60" : "bg-blue-50/40 dark:bg-blue-500/5"
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cor}`}>
                                            <Icone className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{n.titulo}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.mensagem}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                                {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ptBR })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-shrink-0">
                                            {!n.lida && (
                                                <button
                                                    onClick={() => marcarLida.mutate(n.id)}
                                                    title="Marcar como lida"
                                                    className="p-1 rounded-lg text-gray-300 hover:text-emerald-500 transition-colors"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deletar.mutate(n.id)}
                                                title="Remover"
                                                className="p-1 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
