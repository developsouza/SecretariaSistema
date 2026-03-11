import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Church, CheckCircle2, XCircle, Loader2, MailOpen, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";

export default function VerificarEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
    const [emailConfirmado, setEmailConfirmado] = useState("");
    const [reenvioEmail, setReenvioEmail] = useState("");
    const [reenvioLoading, setReenvioLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            return;
        }
        authAPI
            .verificarEmail(token)
            .then((res) => {
                setEmailConfirmado(res.data.email || "");
                setStatus("success");
            })
            .catch(() => setStatus("error"));
    }, [token]);

    const handleReenvio = async (e) => {
        e.preventDefault();
        if (!reenvioEmail) return;
        setReenvioLoading(true);
        try {
            await authAPI.reenviarVerificacao(reenvioEmail);
            toast.success("Novo link enviado! Verifique sua caixa de entrada.");
            setReenvioEmail("");
        } catch {
            toast.error("Não foi possível enviar o link. Tente novamente.");
        } finally {
            setReenvioLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-950 flex items-center justify-center p-4">
            <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/">
                        <div className="inline-flex w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 items-center justify-center mb-3 shadow-glow">
                            <Church className="w-7 h-7 text-white" />
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Gestão Secretaria</h1>
                    <p className="text-white/60 text-sm mt-1">Verificação de e-mail</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl text-center">
                    {/* Estado: carregando */}
                    {status === "loading" && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Verificando...</h2>
                            <p className="text-white/60 text-sm">Aguarde enquanto confirmamos seu e-mail.</p>
                        </div>
                    )}

                    {/* Estado: sucesso */}
                    {status === "success" && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-400/30">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">E-mail confirmado! 🎉</h2>
                            {emailConfirmado && (
                                <p className="text-white/70 text-sm">
                                    <span className="text-white font-medium">{emailConfirmado}</span> verificado com sucesso.
                                </p>
                            )}
                            <p className="text-white/60 text-sm">
                                Seu trial de <strong className="text-white">14 dias</strong> foi ativado. Faça login para começar a usar o sistema.
                            </p>
                            <Link
                                to="/login"
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-glow active:scale-[0.98] mt-2"
                            >
                                Fazer login
                            </Link>
                        </div>
                    )}

                    {/* Estado: erro / link expirado */}
                    {status === "error" && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-400/30">
                                <XCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Link inválido ou expirado</h2>
                            <p className="text-white/60 text-sm">
                                Este link de verificação não é válido ou já expirou (validade de 24&nbsp;horas). Solicite um novo link abaixo.
                            </p>

                            <div className="w-full mt-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <MailOpen className="w-4 h-4 text-white/50 flex-shrink-0" />
                                    <span className="text-xs text-white/50 uppercase tracking-wide font-medium">Reenviar link de verificação</span>
                                </div>
                                <form onSubmit={handleReenvio} className="space-y-3">
                                    <input
                                        type="email"
                                        value={reenvioEmail}
                                        onChange={(e) => setReenvioEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        required
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 backdrop-blur-sm transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={reenvioLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-glow active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {reenvioLoading ? (
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4" /> Enviar novo link
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>

                            <Link to="/login" className="text-sm text-primary-400 hover:text-primary-300 transition-colors mt-1">
                                Voltar ao login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
