import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Church, Mail, ArrowLeft, Sun, Moon, CheckCircle2 } from "lucide-react";
import { authAPI } from "../services/api";
import { useTheme } from "../hooks/useTheme";

export default function EsqueciSenhaPage() {
    const { isDark, toggleTheme } = useTheme();
    const [enviado, setEnviado] = useState(false);
    const [emailEnviado, setEmailEnviado] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        try {
            await authAPI.esqueciSenha(data.email);
            setEmailEnviado(data.email);
            setEnviado(true);
        } catch (err) {
            // Mesmo em caso de erro técnico, não revelar se e-mail existe
            toast.error("Erro ao processar sua solicitação. Tente novamente.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-950 dark:from-gray-950 dark:via-dark-900 dark:to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Theme toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-sm"
            >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 items-center justify-center mb-4 shadow-glow">
                        <Church className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">SecretariaSistema</h1>
                    <p className="text-white/60 text-sm mt-1">Plataforma de gestão de membros</p>
                </div>

                <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                    {enviado ? (
                        /* ─── Tela de sucesso ── */
                        <div className="text-center space-y-4">
                            <div className="inline-flex w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-2xl items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Verifique seu e-mail</h2>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Se o endereço <span className="text-white font-medium">{emailEnviado}</span> estiver cadastrado, você receberá um link
                                de redefinição em breve.
                                <br />
                                <span className="text-white/40 text-xs mt-1 block">O link expira em 2 horas.</span>
                            </p>
                            <p className="text-white/40 text-xs">
                                Não recebeu? Verifique a pasta de spam ou{" "}
                                <button
                                    className="text-primary-300 hover:text-white transition-colors underline underline-offset-2"
                                    onClick={() => setEnviado(false)}
                                >
                                    tente novamente
                                </button>
                                .
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 mt-4 text-sm text-white/50 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Voltar ao login
                            </Link>
                        </div>
                    ) : (
                        /* ─── Formulário ── */
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-white">Esqueceu a senha?</h2>
                                <p className="text-white/50 text-sm mt-1">Informe seu e-mail e enviaremos as instruções de redefinição.</p>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1.5">E-mail cadastrado</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                                        <input
                                            type="email"
                                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 backdrop-blur-sm transition-all"
                                            placeholder="seu@email.com"
                                            {...register("email", {
                                                required: "E-mail obrigatório",
                                                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" },
                                            })}
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-glow hover:shadow-glow mt-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4" /> Enviar instruções
                                        </>
                                    )}
                                </button>
                            </form>
                            <p className="text-center text-sm text-white/50 mt-6">
                                <Link to="/login" className="inline-flex items-center gap-1.5 text-primary-300 hover:text-white transition-colors">
                                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
