import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Church, ArrowRight, ArrowLeft, CheckCircle2, Sun, Moon, MailOpen } from "lucide-react";
import { authAPI } from "../services/api";
import { useTheme } from "../hooks/useTheme";

const ESTADOS = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
];
const DENOMINACOES = [
    "Assembleia de Deus",
    "Igreja Batista",
    "Igreja Presbiteriana",
    "Igreja Metodista",
    "Igreja Evangelica Luterana",
    "Igreja Universal",
    "Igreja Internacional da Graca",
    "Igreja do Evangelho Quadrangular",
    "Igreja Adventista do Setimo Dia",
    "Congregacao Crista no Brasil",
    "Outra",
];

function GlassInput({ className = "", ...props }) {
    return (
        <input
            className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 backdrop-blur-sm transition-all ${className}`}
            {...props}
        />
    );
}

function GlassSelect({ className = "", children, ...props }) {
    return (
        <select
            className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 backdrop-blur-sm transition-all ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

export default function RegistroPage() {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const [step, setStep] = useState(1);
    const [sucesso, setSucesso] = useState(false);
    const {
        register,
        handleSubmit,
        watch,
        trigger,
        formState: { errors, isSubmitting },
    } = useForm({ defaultValues: { estado: "", denominacao: "" } });

    const STEP1_FIELDS = ["nome_igreja", "cidade", "estado"];

    const onSubmit = async (data) => {
        try {
            // eslint-disable-next-line no-unused-vars
            const { confirm_senha, ...payload } = data;
            await authAPI.registrar(payload);
            setSucesso(true);
        } catch (err) {
            const erroData = err.response?.data;
            if (erroData?.errors?.length > 0) {
                toast.error(erroData.errors[0].msg || "Erro de validação");
            } else {
                toast.error(erroData?.error || "Erro ao cadastrar. Tente novamente.");
            }
        }
    };

    const onError = (fieldErrors) => {
        const hasStep1Errors = STEP1_FIELDS.some((f) => fieldErrors[f]);
        if (hasStep1Errors) setStep(1);
    };

    if (sucesso)
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-950 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10 max-w-md w-full text-center shadow-2xl animate-slide-up">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
                        <MailOpen className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Verifique seu e-mail</h2>
                    <p className="text-white/60 mb-3">Enviamos um link de confirmação para o seu e-mail.</p>
                    <p className="text-white/50 text-sm mb-6">
                        Clique no link para ativar seus <strong className="text-white">14 dias de teste gratuito</strong>. O link expira em{" "}
                        <strong className="text-white">24 horas</strong>.
                    </p>
                    <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-6 text-left space-y-2">
                        <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Não recebeu o e-mail?</p>
                        <ul className="text-white/60 text-sm space-y-1 list-disc list-inside">
                            <li>Verifique a pasta de spam/lixo eletrônico</li>
                            <li>Aguarde alguns minutos e atualize</li>
                            <li>
                                <button
                                    className="text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors"
                                    onClick={() => navigate("/verificar-email?token=expirado")}
                                >
                                    solicitar novo link
                                </button>
                            </li>
                        </ul>
                    </div>
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-glow active:scale-[0.98]"
                    >
                        Ir para o login <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-950 dark:from-gray-950 dark:via-dark-900 dark:to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-sm"
            >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="w-full max-w-lg animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 items-center justify-center mb-3 shadow-glow">
                        <Church className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Criar sua conta gratis</h1>
                    <p className="text-white/50 text-sm mt-1">14 dias de teste · Sem cartao de credito</p>
                </div>

                <div className="flex items-center justify-center gap-3 mb-6">
                    {[1, 2].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    step === s
                                        ? "bg-primary text-white shadow-glow"
                                        : step > s
                                          ? "bg-emerald-500 text-white"
                                          : "bg-white/10 text-white/40"
                                }`}
                            >
                                {step > s ? "✓" : s}
                            </div>
                            <span className={`text-sm font-medium ${step === s ? "text-white" : "text-white/40"}`}>
                                {s === 1 ? "Dados da Igreja" : "Seu Acesso"}
                            </span>
                            {s < 2 && <div className="w-8 h-px bg-white/20 mx-1" />}
                        </div>
                    ))}
                </div>

                <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                    <form onSubmit={handleSubmit(onSubmit, onError)}>
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-white mb-4">Dados da Igreja</h3>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Nome da Igreja *</label>
                                    <GlassInput
                                        placeholder="Igreja Evangelica Graca e Verdade"
                                        {...register("nome_igreja", {
                                            required: "Obrigatorio",
                                            minLength: { value: 3, message: "Minimo 3 caracteres" },
                                        })}
                                    />
                                    {errors.nome_igreja && <p className="text-red-400 text-xs mt-1.5">{errors.nome_igreja.message}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-1.5">Cidade *</label>
                                        <GlassInput placeholder="Sao Paulo" {...register("cidade", { required: "Obrigatorio" })} />
                                        {errors.cidade && <p className="text-red-400 text-xs mt-1.5">{errors.cidade.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-1.5">Estado *</label>
                                        <GlassSelect {...register("estado", { required: "Obrigatorio" })}>
                                            <option value="" style={{ backgroundColor: "#1e293b" }}>
                                                Selecione
                                            </option>
                                            {ESTADOS.map((e) => (
                                                <option key={e} value={e} style={{ backgroundColor: "#1e293b" }}>
                                                    {e}
                                                </option>
                                            ))}
                                        </GlassSelect>
                                        {errors.estado && <p className="text-red-400 text-xs mt-1.5">{errors.estado.message}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Denominacao</label>
                                    <GlassSelect {...register("denominacao")}>
                                        <option value="" style={{ backgroundColor: "#1e293b" }}>
                                            Selecione (opcional)
                                        </option>
                                        {DENOMINACOES.map((d) => (
                                            <option key={d} value={d} style={{ backgroundColor: "#1e293b" }}>
                                                {d}
                                            </option>
                                        ))}
                                    </GlassSelect>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Nome do Pastor</label>
                                    <GlassInput placeholder="Pastor Joao Silva" {...register("pastor_nome")} />
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const valid = await trigger(["nome_igreja", "cidade", "estado"]);
                                        if (valid) setStep(2);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-glow active:scale-[0.98] mt-2"
                                >
                                    Proximo <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h3 className="font-bold text-lg text-white">Seu Acesso</h3>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Seu nome completo *</label>
                                    <GlassInput
                                        placeholder="Maria Santos"
                                        {...register("nome_admin", {
                                            required: "Obrigatorio",
                                            minLength: { value: 3, message: "Minimo 3 caracteres" },
                                        })}
                                    />
                                    {errors.nome_admin && <p className="text-red-400 text-xs mt-1.5">{errors.nome_admin.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">E-mail *</label>
                                    <GlassInput
                                        type="email"
                                        placeholder="seu@email.com"
                                        {...register("email", {
                                            required: "Obrigatorio",
                                            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail invalido" },
                                        })}
                                    />
                                    {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Senha *</label>
                                    <GlassInput
                                        type="password"
                                        placeholder="Minimo 8 caracteres"
                                        {...register("senha", { required: "Obrigatorio", minLength: { value: 8, message: "Minimo 8 caracteres" } })}
                                    />
                                    {errors.senha && <p className="text-red-400 text-xs mt-1.5">{errors.senha.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">Confirmar senha *</label>
                                    <GlassInput
                                        type="password"
                                        placeholder="Repita a senha"
                                        {...register("confirm_senha", {
                                            required: "Obrigatorio",
                                            validate: (v) => v === watch("senha") || "Senhas nao conferem",
                                        })}
                                    />
                                    {errors.confirm_senha && <p className="text-red-400 text-xs mt-1.5">{errors.confirm_senha.message}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-glow active:scale-[0.98] mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Criar conta gratis <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs text-white/30 mt-2">Ao criar a conta, voce concorda com nossos Termos de Uso.</p>
                            </div>
                        )}
                    </form>
                    <p className="text-center text-sm text-white/50 mt-6">
                        Ja tem conta?{" "}
                        <Link to="/login" className="text-primary-300 font-semibold hover:text-white transition-colors">
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
