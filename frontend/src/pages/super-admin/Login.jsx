import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Shield, Eye, EyeOff, Lock } from "lucide-react";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";

export default function SuperAdminLogin() {
    const { login } = useSuperAdmin();
    const navigate = useNavigate();
    const [showPass, setShowPass] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        try {
            await login(data.email, data.senha);
            navigate("/super-admin");
        } catch (err) {
            toast.error(err.response?.data?.error || "Credenciais inválidas");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-950 px-4">
            {/* Blob decorativo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-700/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Cabeçalho */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600/20 border border-violet-500/30 rounded-2xl mb-4 shadow-lg shadow-violet-900/30">
                        <Shield className="w-7 h-7 text-violet-400" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Painel Master</h1>
                    <p className="text-gray-400 text-sm mt-1">Acesso restrito — somente administradores do sistema</p>
                </div>

                {/* Card */}
                <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                        {/* E-mail */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
                            <input
                                type="email"
                                autoComplete="username"
                                placeholder="master@gestaosecretaria.com.br"
                                className="w-full h-11 px-4 bg-gray-900/70 border border-gray-600/60 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500 transition"
                                {...register("email", { required: "E-mail obrigatório" })}
                            />
                            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Senha */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="w-full h-11 px-4 pr-11 bg-gray-900/70 border border-gray-600/60 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500 transition"
                                    {...register("senha", { required: "Senha obrigatória" })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.senha && <p className="text-red-400 text-xs mt-1">{errors.senha.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-11 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-violet-900/40"
                        >
                            {isSubmitting ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    Entrar no Painel Master
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-600 text-xs mt-6">Gestão Secretaria · Acesso interno restrito</p>
            </div>
        </div>
    );
}
