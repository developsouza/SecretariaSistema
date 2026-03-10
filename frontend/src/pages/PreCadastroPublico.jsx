import { useEffect, useState, forwardRef } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from "axios";
import MaskedInput from "../components/MaskedInput";
import { User, Phone, MapPin, Flame, CheckCircle2, ChevronRight, ChevronLeft, Church, AlertCircle, Loader2 } from "lucide-react";

const api = axios.create({ baseURL: "/api", timeout: 30000 });

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
const ESTADOS_CIVIS = ["solteiro(a)", "casado(a)", "divorciado(a)", "viúvo(a)", "união estável"];
const FORMAS_ENTRADA = ["conversão", "batismo", "transferência", "reingresso", "aclamação"];
const CARGOS = [
    "Membro",
    "Diácono",
    "Diaconisa",
    "Presbítero",
    "Evangelista",
    "Pastor",
    "Missionário",
    "Obreiro",
    "Líder de Célula",
    "Líder de Departamento",
];

const STEPS = [
    { id: 0, label: "Dados Pessoais", icon: User },
    { id: 1, label: "Contato & Endereço", icon: Phone },
    { id: 2, label: "Dados Eclesiásticos", icon: Flame },
];

function Field({ label, error, required, children, className = "col-span-2" }) {
    return (
        <div className={className}>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error.message}</p>}
        </div>
    );
}

const InputCss = forwardRef(function InputCss({ error, ...props }, ref) {
    return (
        <input
            ref={ref}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition
                text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-primary/30 focus:border-primary
                ${error ? "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-500" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
            {...props}
        />
    );
});

const SelectCss = forwardRef(function SelectCss({ error, children, ...props }, ref) {
    return (
        <select
            ref={ref}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition
                text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-primary/30 focus:border-primary
                ${error ? "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-500" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
            {...props}
        >
            {children}
        </select>
    );
});

export default function PreCadastroPublico() {
    const { slug } = useParams();
    const [step, setStep] = useState(0);
    const [concluido, setConcluido] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erroGeral, setErroGeral] = useState(null);
    const [igreja, setIgreja] = useState(null);
    const [carregandoIgreja, setCarregandoIgreja] = useState(true);
    const [erroIgreja, setErroIgreja] = useState(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        trigger,
        clearErrors,
        formState: { errors },
    } = useForm({ mode: "onTouched" });

    // ── Buscar dados da igreja pelo slug ───────────────────────────────────
    useEffect(() => {
        if (!slug) return;
        api.get(`/publico/igrejas/${slug}`)
            .then((r) => setIgreja(r.data))
            .catch(() => setErroIgreja("Igreja não encontrada ou link inválido."))
            .finally(() => setCarregandoIgreja(false));
    }, [slug]);

    // ── Buscar CEP automaticamente ─────────────────────────────────────────
    const cep = watch("cep");
    useEffect(() => {
        const raw = (cep || "").replace(/\D/g, "");
        if (raw.length !== 8) return;
        fetch(`https://viacep.com.br/ws/${raw}/json/`)
            .then((r) => r.json())
            .then((d) => {
                if (!d.erro) {
                    setValue("logradouro", d.logradouro || "");
                    setValue("bairro", d.bairro || "");
                    setValue("cidade", d.localidade || "");
                    setValue("estado", d.uf || "");
                }
            })
            .catch(() => {});
    }, [cep, setValue]);

    const avancar = async () => {
        const campos =
            [
                ["nome_completo", "data_nascimento", "sexo", "estado_civil", "cpf", "rg", "cidade_nascimento", "estado_nascimento"], // step 0
                ["celular"], // step 1
                [], // step 2
            ][step] ?? [];
        const valido = await trigger(campos);
        if (valido) {
            clearErrors();
            setStep((s) => Math.min(s + 1, STEPS.length - 1));
        }
    };

    const onSubmit = async (data) => {
        setEnviando(true);
        setErroGeral(null);
        try {
            // Limpar máscaras
            const payload = { ...data };
            ["celular", "whatsapp", "telefone", "cpf", "cep"].forEach((f) => {
                if (payload[f]) payload[f] = payload[f].replace(/\D/g, "");
            });
            await api.post(`/publico/pre-cadastro/${slug}`, payload);
            setConcluido(true);
        } catch (e) {
            const msg = e.response?.data?.errors?.[0]?.msg || e.response?.data?.error || "Erro ao enviar o cadastro. Tente novamente.";
            setErroGeral(msg);
        } finally {
            setEnviando(false);
        }
    };

    // ── Tela de carregamento ───────────────────────────────────────────────
    if (carregandoIgreja) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // ── Igreja não encontrada ─────────────────────────────────────────────
    if (erroIgreja) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Link Inválido</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{erroIgreja}</p>
                </div>
            </div>
        );
    }

    // ── Tela de conclusão ─────────────────────────────────────────────────
    if (concluido) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    {igreja?.logo_url && <img src={igreja.logo_url} alt={igreja.nome} className="h-16 mx-auto mb-4 object-contain" />}
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-9 h-9 text-green-500 dark:text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">Pré-cadastro enviado!</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                        Seus dados foram recebidos pela <span className="font-semibold text-gray-700 dark:text-gray-300">{igreja?.nome}</span>.
                        Aguarde a aprovação da secretaria. Caso necessário, você receberá um e-mail com orientações.
                    </p>
                </div>
            </div>
        );
    }

    const corPrimaria = igreja?.cor_primaria || "#1a56db";

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
            <div className="max-w-xl mx-auto">
                {/* Cabeçalho da Igreja */}
                <div
                    className="rounded-2xl p-6 text-white text-center mb-6 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${corPrimaria}, #6366f1)` }}
                >
                    {igreja?.logo_url && <img src={igreja.logo_url} alt={igreja.nome} className="h-14 mx-auto mb-3 object-contain" />}
                    {!igreja?.logo_url && <Church className="w-10 h-10 mx-auto mb-2 opacity-80" />}
                    <h1 className="text-xl font-bold">{igreja?.nome}</h1>
                    <p className="text-sm opacity-80 mt-1">Pré-Cadastro de Membros</p>
                </div>

                {/* Indicador de passos */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                                    ${i === step ? "text-white shadow-md" : i < step ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500"}`}
                                style={i === step ? { background: corPrimaria } : {}}
                            >
                                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{s.label}</span>
                                <span className="sm:hidden">{i + 1}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div
                                    className={`w-6 h-0.5 rounded ${i < step ? "bg-green-400 dark:bg-green-600" : "bg-gray-200 dark:bg-gray-600"}`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-4">
                        {/* ── PASSO 0: Dados Pessoais ── */}
                        {step === 0 && (
                            <>
                                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <User className="w-5 h-5 text-primary" /> Dados Pessoais
                                </h2>
                                {/* Aviso sobre foto */}
                                <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
                                    <span className="text-lg leading-none">📷</span>
                                    <p>
                                        <strong>Foto não é necessária agora.</strong> Ela será tirada presencialmente na secretaria da igreja no
                                        momento do seu credenciamento.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Nome Completo" required error={errors.nome_completo} className="col-span-2">
                                        <InputCss
                                            error={errors.nome_completo}
                                            placeholder="Seu nome completo"
                                            {...register("nome_completo", { required: "Nome completo é obrigatório" })}
                                        />
                                    </Field>
                                    <Field label="Data de Nascimento" required error={errors.data_nascimento}>
                                        <InputCss
                                            type="date"
                                            error={errors.data_nascimento}
                                            {...register("data_nascimento", { required: "Data de nascimento é obrigatória" })}
                                        />
                                    </Field>
                                    <Field label="Sexo" required error={errors.sexo}>
                                        <SelectCss error={errors.sexo} {...register("sexo", { required: "Sexo é obrigatório" })}>
                                            <option value="">Selecione</option>
                                            <option value="masculino">Masculino</option>
                                            <option value="feminino">Feminino</option>
                                        </SelectCss>
                                    </Field>
                                    <Field label="Estado Civil" required error={errors.estado_civil}>
                                        <SelectCss
                                            error={errors.estado_civil}
                                            {...register("estado_civil", { required: "Estado civil é obrigatório" })}
                                        >
                                            <option value="">Selecione</option>
                                            {ESTADOS_CIVIS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </SelectCss>
                                    </Field>
                                    <Field label="CPF" required error={errors.cpf}>
                                        <MaskedInput
                                            mask="cpf"
                                            placeholder="000.000.000-00"
                                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.cpf ? "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-500" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
                                            {...register("cpf", { required: "CPF é obrigatório" })}
                                        />
                                    </Field>
                                    <Field label="RG" required error={errors.rg}>
                                        <InputCss
                                            placeholder="Número do RG"
                                            error={errors.rg}
                                            {...register("rg", { required: "RG é obrigatório" })}
                                        />
                                    </Field>
                                    <Field label="Órgão Emissor" error={errors.rg_orgao}>
                                        <InputCss placeholder="Ex: SSP/SP" error={errors.rg_orgao} {...register("rg_orgao")} />
                                    </Field>
                                    <Field label="Cidade de Nascimento" required error={errors.cidade_nascimento}>
                                        <InputCss
                                            placeholder="Cidade onde nasceu"
                                            error={errors.cidade_nascimento}
                                            {...register("cidade_nascimento", { required: "Cidade de nascimento é obrigatória" })}
                                        />
                                    </Field>
                                    <Field label="Estado de Nascimento" required error={errors.estado_nascimento}>
                                        <SelectCss
                                            error={errors.estado_nascimento}
                                            {...register("estado_nascimento", { required: "Estado de nascimento é obrigatório" })}
                                        >
                                            <option value="">UF</option>
                                            {ESTADOS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </SelectCss>
                                    </Field>
                                </div>
                            </>
                        )}

                        {/* ── PASSO 1: Contato e Endereço ── */}
                        {step === 1 && (
                            <>
                                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <Phone className="w-5 h-5 text-primary" /> Contato & Endereço
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Celular" required error={errors.celular}>
                                        <MaskedInput
                                            mask="phone"
                                            placeholder="(00) 00000-0000"
                                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.celular ? "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-500" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
                                            {...register("celular", { required: "Celular é obrigatório" })}
                                        />
                                    </Field>
                                    <Field label="WhatsApp" error={errors.whatsapp}>
                                        <MaskedInput
                                            mask="phone"
                                            placeholder="(00) 00000-0000"
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                            {...register("whatsapp")}
                                        />
                                    </Field>
                                    <Field label="E-mail" error={errors.email} className="col-span-2">
                                        <InputCss
                                            type="email"
                                            placeholder="seu@email.com"
                                            error={errors.email}
                                            {...register("email", {
                                                validate: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "E-mail inválido",
                                            })}
                                        />
                                    </Field>
                                    <div className="col-span-2 border-t dark:border-gray-700 pt-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" /> Endereço (opcional)
                                        </p>
                                    </div>
                                    <Field label="CEP" error={errors.cep}>
                                        <MaskedInput
                                            mask="cep"
                                            placeholder="00000-000"
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                            {...register("cep")}
                                        />
                                    </Field>
                                    <Field label="Logradouro" error={errors.logradouro} className="col-span-2">
                                        <InputCss placeholder="Rua, Avenida..." {...register("logradouro")} />
                                    </Field>
                                    <Field label="Número" error={errors.numero}>
                                        <InputCss placeholder="Nº" {...register("numero")} />
                                    </Field>
                                    <Field label="Complemento" error={errors.complemento}>
                                        <InputCss placeholder="Apto, Bloco..." {...register("complemento")} />
                                    </Field>
                                    <Field label="Bairro" error={errors.bairro}>
                                        <InputCss placeholder="Bairro" {...register("bairro")} />
                                    </Field>
                                    <Field label="Cidade" error={errors.cidade}>
                                        <InputCss placeholder="Cidade" {...register("cidade")} />
                                    </Field>
                                    <Field label="Estado" error={errors.estado}>
                                        <SelectCss {...register("estado")}>
                                            <option value="">UF</option>
                                            {ESTADOS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </SelectCss>
                                    </Field>
                                </div>
                            </>
                        )}

                        {/* ── PASSO 2: Dados Eclesiásticos ── */}
                        {step === 2 && (
                            <>
                                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-primary" /> Dados Eclesiásticos
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Forma de Entrada" required error={errors.forma_entrada}>
                                        <SelectCss
                                            error={errors.forma_entrada}
                                            {...register("forma_entrada", { required: "Forma de entrada é obrigatória" })}
                                        >
                                            <option value="">Selecione</option>
                                            {FORMAS_ENTRADA.map((e) => (
                                                <option key={e} value={e}>
                                                    {e.charAt(0).toUpperCase() + e.slice(1)}
                                                </option>
                                            ))}
                                        </SelectCss>
                                    </Field>
                                    <Field label="Cargo / Função" required error={errors.cargo}>
                                        <SelectCss error={errors.cargo} {...register("cargo", { required: "Cargo é obrigatório" })}>
                                            <option value="">Selecione</option>
                                            {CARGOS.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </SelectCss>
                                    </Field>
                                    <Field label="Data de Batismo nas Águas" required error={errors.data_batismo_agua}>
                                        <InputCss
                                            type="date"
                                            error={errors.data_batismo_agua}
                                            {...register("data_batismo_agua", { required: "Data de batismo é obrigatória" })}
                                        />
                                    </Field>
                                    <Field label="Data de Conversão" error={errors.data_conversao}>
                                        <InputCss type="date" {...register("data_conversao")} />
                                    </Field>
                                    <Field label="Igreja / Denominação de Origem" error={errors.denominacao_origem} className="col-span-2">
                                        <InputCss placeholder="Ex: Assembleia de Deus..." {...register("denominacao_origem")} />
                                    </Field>
                                    <Field label="Congregação de Preferência" error={errors.congregacao_preferida} className="col-span-2">
                                        <InputCss placeholder="Nome da congregação que deseja frequentar" {...register("congregacao_preferida")} />
                                    </Field>
                                    <Field label="Observações" error={errors.observacoes} className="col-span-2">
                                        <textarea
                                            rows={3}
                                            placeholder="Informações adicionais que queira nos informar..."
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                                            {...register("observacoes")}
                                        />
                                    </Field>
                                </div>
                            </>
                        )}

                        {/* Erro geral */}
                        {erroGeral && (
                            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-red-600 dark:text-red-400 text-sm">{erroGeral}</p>
                            </div>
                        )}
                    </div>

                    {/* Botões de navegação */}
                    <div className="flex items-center justify-between mt-4">
                        <button
                            type="button"
                            onClick={() => setStep((s) => Math.max(s - 1, 0))}
                            disabled={step === 0}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                        >
                            <ChevronLeft className="w-4 h-4" /> Anterior
                        </button>

                        {step < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={avancar}
                                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition"
                                style={{ background: corPrimaria }}
                            >
                                Próximo <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={enviando}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition disabled:opacity-60"
                                style={{ background: corPrimaria }}
                            >
                                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {enviando ? "Enviando..." : "Enviar Pré-Cadastro"}
                            </button>
                        )}
                    </div>
                </form>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
                    Seus dados serão revisados pela secretaria da igreja antes da aprovação.
                </p>
            </div>
        </div>
    );
}
