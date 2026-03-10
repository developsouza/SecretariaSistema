import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Church, Eye, EyeOff, LogIn, Sun, Moon, MailOpen, RefreshCw, Users, CreditCard, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { authAPI } from "../services/api";

const FEATURES = [
    { icon: Users, text: "Cadastro completo de membros e familiares" },
    { icon: CreditCard, text: "Carteirinhas digitais em PDF com QR Code" },
    { icon: BarChart3, text: "Relatórios e estatísticas em tempo real" },
    { icon: ShieldCheck, text: "Dados seguros com acesso por perfil" },
];

export default function LoginPage() {
    const { login } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [showPass, setShowPass] = useState(false);
    const [emailNaoVerificado, setEmailNaoVerificado] = useState("");
    const [reenvioLoading, setReenvioLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        setEmailNaoVerificado("");
        try {
            await login(data.email, data.senha);
            navigate("/dashboard");
        } catch (err) {
            if (err.response?.data?.code === "EMAIL_NOT_VERIFIED") {
                setEmailNaoVerificado(err.response.data.email || data.email);
            } else {
                toast.error(err.response?.data?.error || "Erro ao fazer login");
            }
        }
    };

    const handleReenvio = async () => {
        if (!emailNaoVerificado) return;
        setReenvioLoading(true);
        try {
            await authAPI.reenviarVerificacao(emailNaoVerificado);
            toast.success("Novo link enviado! Verifique sua caixa de entrada.");
        } catch {
            toast.error("Não foi possível enviar o link. Tente novamente.");
        } finally {
            setReenvioLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Painel esquerdo (branding) ── */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-950 flex-col justify-between p-12 overflow-hidden">
                {/* Blobs decorativos */}
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/25 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-20 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                {/* Grade sutil */}
                <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                        backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                />

                {/* Logo topo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center shadow-glow-sm">
                        <Church className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-white text-lg tracking-tight">SecretariaSistema</span>
                </div>

                {/* Texto central */}
                <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
                    <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/70 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 w-fit">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        Plataforma de gestão eclesiástica
                    </span>
                    <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                        Gerencie sua igreja
                        <br />
                        <span className="bg-gradient-to-r from-primary-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                            com eficiência e cuidado
                        </span>
                    </h2>
                    <p className="text-white/55 text-base leading-relaxed mb-10 max-w-sm">
                        Tudo que sua secretaria precisa em um só lugar — simples, rápido e seguro.
                    </p>

                    <ul className="space-y-4">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-4 h-4 text-primary-300" />
                                </div>
                                <span className="text-white/70 text-sm">{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Rodapé do painel */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex gap-5 text-xs text-white/30">
                        {[
                            ["500+", "Igrejas"],
                            ["50k+", "Membros"],
                            ["99.9%", "Uptime"],
                        ].map(([v, l]) => (
                            <div key={l}>
                                <p className="text-white/80 font-bold text-sm">{v}</p>
                                <p>{l}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Painel direito (formulário) ── */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark-900 relative overflow-hidden">
                {/* Blob sutil no fundo branco */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />

                {/* Barra superior */}
                <div className="flex items-center justify-between px-6 py-4 relative z-10">
                    {/* Logo mobile */}
                    <div className="flex items-center gap-2 lg:hidden">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center shadow-glow-sm">
                            <Church className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">SecretariaSistema</span>
                    </div>
                    <div className="hidden lg:block" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                        >
                            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                        </button>
                        <Link
                            to="/registro"
                            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary dark:text-primary-400 hover:underline"
                        >
                            Criar conta <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Formulário centralizado */}
                <div className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
                    <div className="w-full max-w-sm animate-slide-up">
                        {/* Cabeçalho do form */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Bem-vindo de volta 👋</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5">Entre na sua conta para continuar</p>
                        </div>

                        {/* Card do formulário */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-7 shadow-card">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                                        placeholder="seu@email.com"
                                        {...register("email", {
                                            required: "E-mail obrigatório",
                                            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" },
                                        })}
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Senha</label>
                                        <Link to="/esqueci-senha" className="text-xs text-primary dark:text-primary-400 hover:underline">
                                            Esqueceu a senha?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPass ? "text" : "password"}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all pr-11"
                                            placeholder="••••••••"
                                            {...register("senha", { required: "Senha obrigatória" })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        >
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.senha && <p className="text-red-500 text-xs mt-1.5">{errors.senha.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-glow hover:shadow-glow active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <LogIn className="w-4 h-4" /> Entrar
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Banner: e-mail não verificado */}
                            {emailNaoVerificado && (
                                <div className="mt-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <MailOpen className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-amber-700 dark:text-amber-200 text-sm font-medium">E-mail não verificado</p>
                                            <p className="text-amber-600/80 dark:text-amber-300/70 text-xs mt-0.5">
                                                Confirme seu e-mail para ativar o trial. Verifique sua caixa de entrada.
                                            </p>
                                            <button
                                                onClick={handleReenvio}
                                                disabled={reenvioLoading}
                                                className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-100 transition-colors disabled:opacity-50"
                                            >
                                                {reenvioLoading ? (
                                                    <span className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-3 h-3" />
                                                )}
                                                Reenviar link de verificação
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                            Não tem conta?{" "}
                            <Link to="/registro" className="text-primary dark:text-primary-400 font-semibold hover:underline">
                                Criar conta grátis
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Rodapé */}
                <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-4 relative z-10">
                    &copy; {new Date().getFullYear()} SecretariaSistema · Todos os direitos reservados
                </p>
            </div>
        </div>
    );
}
