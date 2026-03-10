import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Church, Eye, EyeOff, KeyRound, ArrowLeft, Sun, Moon, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { authAPI } from "../services/api";
import { useTheme } from "../hooks/useTheme";

export default function RedefinirSenhaPage() {
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [tokenStatus, setTokenStatus] = useState("validando"); // 'validando' | 'valido' | 'invalido'
    const [emailMascarado, setEmailMascarado] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm();

    // ─── Valida o token ao carregar ────────────────────────────────────────
    useEffect(() => {
        if (!token) {
            setTokenStatus("invalido");
            return;
        }
        authAPI
            .validarToken(token)
            .then((res) => {
                const email = res.data.email || "";
                // Mascara o e-mail: jo***@gmail.com
                const partes = email.split("@");
                const usuario = partes[0];
                const dominio = partes[1] || "";
                const mascarado = usuario.length <= 2 ? "***" : usuario.slice(0, 2) + "***";
                setEmailMascarado(`${mascarado}@${dominio}`);
                setTokenStatus("valido");
            })
            .catch(() => setTokenStatus("invalido"));
    }, [token]);

    const onSubmit = async (data) => {
        if (data.nova_senha !== data.confirmar_senha) {
            toast.error("As senhas não coincidem");
            return;
        }
        try {
            await authAPI.redefinirSenha({ token, nova_senha: data.nova_senha });
            setSucesso(true);
            setTimeout(() => navigate("/login"), 3500);
        } catch (err) {
            toast.error(err.response?.data?.error || "Erro ao redefinir senha. Tente novamente.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-950 dark:from-gray-950 dark:via-dark-900 dark:to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-sm"
            >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 items-center justify-center mb-4 shadow-glow">
                        <Church className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">SecretariaSistema</h1>
                    <p className="text-white/60 text-sm mt-1">Plataforma de gestão de membros</p>
                </div>

                <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                    {/* ─── Validando token ── */}
                    {tokenStatus === "validando" && (
                        <div className="text-center py-6 space-y-3">
                            <Loader2 className="w-10 h-10 text-primary-300 animate-spin mx-auto" />
                            <p className="text-white/60 text-sm">Validando link de redefinição…</p>
                        </div>
                    )}

                    {/* ─── Token inválido ── */}
                    {tokenStatus === "invalido" && (
                        <div className="text-center space-y-4">
                            <div className="inline-flex w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-2xl items-center justify-center mx-auto">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Link inválido ou expirado</h2>
                            <p className="text-white/50 text-sm leading-relaxed">
                                Este link de redefinição de senha não é mais válido.
                                <br />
                                Links expiram após 2 horas.
                            </p>
                            <Link
                                to="/esqueci-senha"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all text-sm"
                            >
                                Solicitar novo link
                            </Link>
                            <p className="mt-2">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                                </Link>
                            </p>
                        </div>
                    )}

                    {/* ─── Sucesso ── */}
                    {tokenStatus === "valido" && sucesso && (
                        <div className="text-center space-y-4">
                            <div className="inline-flex w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-2xl items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Senha redefinida!</h2>
                            <p className="text-white/60 text-sm">
                                Sua senha foi atualizada com sucesso.
                                <br />
                                Redirecionando para o login…
                            </p>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-primary rounded-full animate-spin inline-block" />
                        </div>
                    )}

                    {/* ─── Formulário ── */}
                    {tokenStatus === "valido" && !sucesso && (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-white">Criar nova senha</h2>
                                {emailMascarado && (
                                    <p className="text-white/50 text-sm mt-1">
                                        Conta: <span className="text-white/70 font-medium">{emailMascarado}</span>
                                    </p>
                                )}
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {/* Nova senha */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1.5">Nova senha</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                                        <input
                                            type={showPass ? "text" : "password"}
                                            className="w-full pl-10 pr-11 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 backdrop-blur-sm transition-all"
                                            placeholder="Mínimo 8 caracteres"
                                            {...register("nova_senha", {
                                                required: "Nova senha obrigatória",
                                                minLength: { value: 8, message: "Mínimo 8 caracteres" },
                                            })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                        >
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.nova_senha && <p className="text-red-400 text-xs mt-1.5">{errors.nova_senha.message}</p>}
                                </div>

                                {/* Confirmar senha */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1.5">Confirmar nova senha</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            className="w-full pl-10 pr-11 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 backdrop-blur-sm transition-all"
                                            placeholder="Repita a nova senha"
                                            {...register("confirmar_senha", {
                                                required: "Confirmação obrigatória",
                                                validate: (v) => v === watch("nova_senha") || "As senhas não coincidem",
                                            })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                        >
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.confirmar_senha && <p className="text-red-400 text-xs mt-1.5">{errors.confirmar_senha.message}</p>}
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
                                            <KeyRound className="w-4 h-4" /> Salvar nova senha
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
