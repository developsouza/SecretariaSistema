import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { membrosAPI, dashboardAPI } from "../../../services/api";
import { congregacoesAPI } from "../../../services/api";
import {
    User,
    MapPin,
    Flame,
    Shield,
    Briefcase,
    Camera,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    Home,
    Phone,
    BadgeCheck,
    Users,
    Mail,
    MessageSquare,
    AlertCircle,
    ChevronDown,
} from "lucide-react";
import MaskedInput from "../../../components/MaskedInput";
import UpgradeModal from "../../../components/UpgradeModal";

// ─── Constantes ────────────────────────────────────────────────────────────────
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
const SITUACOES = ["ativo", "inativo", "transferido", "falecido", "disciplina"];
const ESTADOS_CIVIS = ["solteiro(a)", "casado(a)", "divorciado(a)", "viúvo(a)", "união estável"];
const FORMAS_ENTRADA = ["conversão", "batismo", "transferência", "reingresso", "aclamação"];
const ESCOLARIDADES = [
    "Fundamental Incompleto",
    "Fundamental Completo",
    "Médio Incompleto",
    "Médio Completo",
    "Superior Incompleto",
    "Superior Completo",
    "Pós-graduação",
    "Mestrado",
    "Doutorado",
];
const TIPOS_SANGUE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const TIPOS_CADASTRO = ["Novo", "Batismo", "Transferência", "Aclamação", "Reingresso", "Apresentação"];
const CARGOS_SELECT = [
    "Membro",
    "Diácono",
    "Presbítero",
    "Evangelista",
    "Pastor",
    "Missionário",
    "Obreiro",
    "Líder de Célula",
    "Dirigente de Departamento",
];

const CAMPOS_IMPORTANTES = [
    { campo: "cpf", label: "CPF", step: 0 },
    { campo: "data_nascimento", label: "Data de nascimento", step: 0 },
    { campo: "sexo", label: "Sexo", step: 0 },
    { campo: "celular", label: "Celular", step: 1 },
    { campo: "email", label: "E-mail", step: 1 },
    { campo: "whatsapp", label: "WhatsApp", step: 1 },
    { campo: "logradouro", label: "Endereço", step: 1 },
    { campo: "cidade", label: "Cidade de residência", step: 1 },
    { campo: "data_entrada_igreja", label: "Data de entrada na Igreja", step: 2 },
    { campo: "data_batismo_agua", label: "Batismo nas águas", step: 2 },
    { campo: "cargo", label: "Cargo", step: 3 },
    { campo: "estado_civil", label: "Estado civil", step: 4 },
    { campo: "profissao", label: "Profissão", step: 4 },
    { campo: "rg", label: "RG", step: 4 },
];

function gerarLinkWhatsapp(valores, camposFaltando) {
    const nr = (valores.whatsapp || valores.celular || "").replace(/\D/g, "");
    const nome = valores.nome_completo || "membro";
    const lista = camposFaltando.map(({ label }) => `• ${label}`).join("\n");
    const msg = encodeURIComponent(
        `Olá, ${nome}! Estamos atualizando seu cadastro e precisamos de algumas informações:\n\n${lista}\n\nPor favor, nos informe esses dados. Obrigado!`,
    );
    return `https://wa.me/55${nr}?text=${msg}`;
}

function gerarLinkEmail(valores, camposFaltando) {
    const nome = valores.nome_completo || "membro";
    const lista = camposFaltando.map(({ label }) => `• ${label}`).join("\n");
    const subject = encodeURIComponent("Atualização de cadastro");
    const body = encodeURIComponent(
        `Olá, ${nome}!\n\nEstamos atualizando seu cadastro e precisamos das seguintes informações:\n\n${lista}\n\nPor favor, responda a este e-mail com esses dados. Obrigado!`,
    );
    return `mailto:${valores.email}?subject=${subject}&body=${body}`;
}

// ─── Passos do wizard ──────────────────────────────────────────────────────────
const STEPS = [
    { id: 0, label: "Dados Pessoais", icon: User },
    { id: 1, label: "Endereço & Contato", icon: MapPin },
    { id: 2, label: "Dados Eclesiásticos", icon: Flame },
    { id: 3, label: "Ministério & Cargos", icon: Shield },
    { id: 4, label: "Civil & Profissional", icon: Briefcase },
];

// ─── Componentes auxiliares ────────────────────────────────────────────────────
function StepHeader({ icon: Icon, title }) {
    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-primary to-primary-700">
            <Icon className="w-4 h-4 text-white opacity-90" />
            <span className="text-xs font-bold tracking-widest text-white uppercase">{title}</span>
        </div>
    );
}

function SectionCard({ headerIcon, headerTitle, children }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <StepHeader icon={headerIcon} title={headerTitle} />
            <div className="bg-white dark:bg-gray-800">{children}</div>
        </div>
    );
}

function Field({ label, error, required, children, className }) {
    return (
        <div className={className}>
            <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

function CheckField({ label, detailLabel, name, register, watchValue }) {
    return (
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-700/30 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary" {...register(name)} />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
            </label>
            {watchValue && <input className="input text-sm" placeholder={detailLabel} {...register(`${name}_detalhes`)} />}
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function MembroForm() {
    const { id } = useParams();
    const isEdit = !!id && id !== "novo";
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [step, setStep] = useState(0);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [fotoFile, setFotoFile] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [mostrarPendentes, setMostrarPendentes] = useState(true);

    const { data: resumo } = useQuery({
        queryKey: ["dashboard-resumo"],
        queryFn: () => dashboardAPI.resumo().then((r) => r.data),
        staleTime: 60_000,
        enabled: !isEdit,
    });

    const { data: membro, isLoading: loadingMembro } = useQuery({
        queryKey: ["membro", id],
        queryFn: () => membrosAPI.buscar(id).then((r) => r.data),
        enabled: isEdit,
        staleTime: 0,
    });

    const { data: congregacoes = [] } = useQuery({
        queryKey: ["congregacoes"],
        queryFn: () => congregacoesAPI.listar().then((r) => r.data),
        select: (data) => data.filter((c) => c.ativo),
        staleTime: 300_000,
    });

    const {
        register,
        getValues,
        reset,
        watch,
        formState: { errors },
    } = useForm();

    useEffect(() => {
        if (membro) {
            reset({
                ...membro,
                // Garante que campos NOT NULL não sejam nulos no formulário (dados legados)
                celular: membro.celular || "",
                departamentos: membro.departamentos?.join(", ") || "",
                celulas: membro.celulas?.join(", ") || "",
                dons_ministeriais: membro.dons_ministeriais?.join(", ") || "",
                congregacao_id: membro.congregacao_id || "",
                doador_sangue: !!membro.doador_sangue,
                veio_outra_assembleia: !!membro.veio_outra_assembleia,
                auxiliar_trabalho: !!membro.auxiliar_trabalho,
                diacono: !!membro.diacono,
                presbitero: !!membro.presbitero,
                evangelista: !!membro.evangelista,
                pastor: !!membro.pastor,
            });
            if (membro.foto_url) setFotoPreview(membro.foto_url);
        }
    }, [membro?.id, membro?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

    const salvarMut = useMutation({
        mutationFn: async (data) => {
            ["departamentos", "celulas", "dons_ministeriais"].forEach((f) => {
                if (typeof data[f] === "string")
                    data[f] = data[f]
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
            });
            // Sincroniza data_batismo (legado) com data_batismo_agua
            if (data.data_batismo_agua) data.data_batismo = data.data_batismo_agua;

            // Se campos estruturados de endereço forem usados, limpa o campo legado
            if (data.logradouro || data.bairro || data.cidade) data.endereco_completo = null;

            const res = isEdit ? await membrosAPI.atualizar(id, data) : await membrosAPI.criar(data);
            const membroId = isEdit ? id : res.data.id;
            if (fotoFile && membroId) await membrosAPI.uploadFoto(membroId, fotoFile);
            return res.data;
        },
        onSuccess: (savedData) => {
            const targetId = isEdit ? id : savedData?.id;
            toast.success(isEdit ? "Membro atualizado!" : "Membro cadastrado!");
            if (isEdit && savedData) {
                // Atualiza o cache diretamente com os dados retornados pelo servidor,
                // evitando race condition entre removeQueries + refetch do observer ativo.
                qc.setQueryData(["membro", targetId], savedData);
            } else {
                qc.removeQueries({ queryKey: ["membro", targetId] });
            }
            qc.invalidateQueries({ queryKey: ["membros"] });
            navigate(`/dashboard/membros/${targetId}`);
        },
        onError: (e) => {
            if (e.response?.data?.code === "MEMBER_LIMIT_REACHED") {
                setShowUpgradeModal(true);
                return;
            }

            const status = e.response?.status;
            const data = e.response?.data;

            // 422 — erros de validação do express-validator (array de campos)
            if (status === 422 && Array.isArray(data?.errors) && data.errors.length > 0) {
                const LABELS = {
                    nome_completo: "Nome completo",
                    celular: "Celular",
                    situacao: "Situação",
                };
                const msgs = data.errors.map((err) => {
                    const label = LABELS[err.path] || err.path;
                    if (err.path === "nome_completo") return `Nome completo deve ter pelo menos 3 caracteres`;
                    if (err.path === "celular") return `Celular é obrigatório`;
                    if (err.path === "situacao") return `Situação inválida`;
                    return `${label}: ${err.msg}`;
                });
                msgs.forEach((m) => toast.error(m, { duration: 5000 }));
                return;
            }

            // 409 — duplicidade (CPF já cadastrado)
            if (status === 409) {
                toast.error(data?.error || "CPF já cadastrado. Verifique o CPF informado.");
                return;
            }

            // 413 — foto muito grande
            if (status === 413) {
                toast.error("A foto enviada é muito grande. Use uma imagem menor que 5 MB.");
                return;
            }

            // 403 — sem permissão
            if (status === 403) {
                toast.error("Você não tem permissão para realizar esta ação.");
                return;
            }

            // Mensagem vinda do servidor ou genérica
            toast.error(data?.error || "Não foi possível salvar o membro. Verifique os dados e tente novamente.");
        },
    });

    const handleFoto = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFotoFile(file);
            setFotoPreview(URL.createObjectURL(file));
        }
    };

    const todosValores = watch();
    const veioOutra = todosValores.veio_outra_assembleia;
    const wAuxiliar = todosValores.auxiliar_trabalho;
    const wDiacono = todosValores.diacono;
    const wPresbitero = todosValores.presbitero;
    const wEvangelista = todosValores.evangelista;
    const wPastor = todosValores.pastor;
    const wEstadoCivil = todosValores.estado_civil;
    const isCasado = wEstadoCivil === "casado(a)" || wEstadoCivil === "união estável";
    const camposFaltando = CAMPOS_IMPORTANTES.filter(({ campo }) => !todosValores[campo]);

    if (isEdit && loadingMembro)
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );

    return (
        <>
            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="page-title">{isEdit ? "Editar Membro" : "Novo Membro"}</h1>
                        <p className="page-subtitle">{isEdit ? "Atualize os dados do membro" : "Preencha os dados para cadastrar um novo membro"}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => salvarMut.mutate(getValues())}
                        disabled={salvarMut.isPending}
                        className="btn btn-primary flex items-center gap-2 px-6 shadow-glow-sm hover:shadow-glow"
                    >
                        {salvarMut.isPending ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {isEdit ? "Salvar alterações" : "Salvar Membro"}
                    </button>
                </div>

                {/* Tabs de navegação */}
                <div className="flex flex-wrap gap-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 shadow-sm">
                    {STEPS.map(({ id: sid, label, icon: Icon }) => (
                        <button
                            key={sid}
                            type="button"
                            onClick={() => setStep(sid)}
                            className={[
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
                                step === sid
                                    ? "bg-primary text-white shadow-md shadow-primary/30"
                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
                            ].join(" ")}
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Dados pendentes ── */}
                {camposFaltando.length > 0 && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setMostrarPendentes((v) => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                    {camposFaltando.length} campo{camposFaltando.length !== 1 ? "s" : ""} pendente
                                    {camposFaltando.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <ChevronDown
                                className={`w-4 h-4 text-amber-500 transition-transform duration-200 ${mostrarPendentes ? "rotate-180" : ""}`}
                            />
                        </button>
                        {mostrarPendentes && (
                            <div className="px-4 pb-4 space-y-3 border-t border-amber-200 dark:border-amber-500/30 pt-3">
                                <div className="flex flex-wrap gap-2">
                                    {camposFaltando.map(({ campo, label, step: s }) => (
                                        <button
                                            key={campo}
                                            type="button"
                                            onClick={() => setStep(s)}
                                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {(todosValores.celular || todosValores.whatsapp || todosValores.email) && (
                                    <div className="pt-2 border-t border-amber-200 dark:border-amber-500/30">
                                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">Solicitar dados ao membro:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(todosValores.whatsapp || todosValores.celular) && (
                                                <a
                                                    href={gerarLinkWhatsapp(todosValores, camposFaltando)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" /> Enviar via WhatsApp
                                                </a>
                                            )}
                                            {todosValores.email && (
                                                <a
                                                    href={gerarLinkEmail(todosValores, camposFaltando)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                                                >
                                                    <Mail className="w-3.5 h-3.5" /> Enviar por E-mail
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-5">
                    {/* ══ PASSO 1 — DADOS PESSOAIS ══ */}
                    {step === 0 && (
                        <div className="space-y-5">
                            <SectionCard headerIcon={User} headerTitle="Identificação">
                                <div className="p-5 space-y-5">
                                    {/* Foto + Nome + CPF */}
                                    <div className="flex flex-col sm:flex-row gap-5">
                                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                            <label className="cursor-pointer group">
                                                <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-primary transition-colors">
                                                    {fotoPreview ? (
                                                        <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <Camera className="w-7 h-7 text-gray-300 dark:text-gray-500 group-hover:text-primary transition-colors" />
                                                            <span className="text-[10px] text-gray-400 mt-1 text-center px-2">
                                                                Clique para selecionar
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                                            </label>
                                            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Foto</span>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                                            <Field label="Nome Completo" required className="sm:col-span-2" error={errors.nome_completo?.message}>
                                                <input
                                                    className="input"
                                                    placeholder="Nome completo"
                                                    {...register("nome_completo", {
                                                        required: "Obrigatório",
                                                        minLength: { value: 3, message: "Mín. 3 caracteres" },
                                                    })}
                                                />
                                            </Field>
                                            <Field label="CPF">
                                                <MaskedInput mask="cpf" className="input" placeholder="000.000.000-00" {...register("cpf")} />
                                            </Field>
                                        </div>
                                    </div>

                                    {/* Data nasc | Sexo | Nº Rol */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <Field label="Data de Nascimento">
                                            <input type="date" className="input" {...register("data_nascimento")} />
                                        </Field>
                                        <Field label="Sexo">
                                            <select className="input" {...register("sexo")}>
                                                <option value="">Selecione...</option>
                                                <option value="masculino">Masculino</option>
                                                <option value="feminino">Feminino</option>
                                            </select>
                                        </Field>
                                        <Field label="Número do Rol">
                                            <input className="input" placeholder="Nº Rol" {...register("numero_membro")} />
                                        </Field>
                                    </div>

                                    {/* Tipo de Cadastro */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Tipo de Cadastro">
                                            <select className="input" {...register("tipo_cadastro")}>
                                                <option value="">Selecione...</option>
                                                {TIPOS_CADASTRO.map((t) => (
                                                    <option key={t} value={t}>
                                                        {t}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Nome Social">
                                            <input className="input" {...register("nome_social")} />
                                        </Field>
                                    </div>

                                    {/* Nacionalidade | Outra | Escolaridade */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Nacionalidade">
                                            <input className="input" defaultValue="Brasileiro(a)" {...register("nacionalidade")} />
                                        </Field>
                                        <Field label="Outra Nacionalidade">
                                            <input className="input" {...register("outra_nacionalidade")} />
                                        </Field>
                                        <Field label="Escolaridade">
                                            <select className="input" {...register("escolaridade")}>
                                                <option value="">Selecione...</option>
                                                {ESCOLARIDADES.map((e) => (
                                                    <option key={e} value={e}>
                                                        {e}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>

                                    {/* Graduação */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Graduação">
                                            <input className="input" placeholder="Ex: Teologia, Administração..." {...register("graduacao")} />
                                        </Field>
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard headerIcon={MapPin} headerTitle="Naturalidade">
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Cidade de Nascimento">
                                        <input className="input" {...register("cidade_nascimento")} />
                                    </Field>
                                    <Field label="Estado de Nascimento">
                                        <select className="input" {...register("estado_nascimento")}>
                                            <option value="">UF</option>
                                            {ESTADOS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Nome do Pai">
                                        <input className="input" {...register("nome_pai")} />
                                    </Field>
                                    <Field label="Nome da Mãe">
                                        <input className="input" {...register("nome_mae")} />
                                    </Field>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ══ PASSO 2 — ENDEREÇO & CONTATO ══ */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <SectionCard headerIcon={Home} headerTitle="Endereço">
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="CEP">
                                        <MaskedInput mask="cep" className="input" placeholder="00000-000" {...register("cep")} />
                                    </Field>
                                    <Field label="Logradouro">
                                        <input className="input" placeholder="Rua, Av." {...register("logradouro")} />
                                    </Field>
                                    <Field label="Número">
                                        <input className="input" placeholder="Nº" {...register("numero")} />
                                    </Field>
                                    <Field label="Complemento">
                                        <input className="input" placeholder="Apto, Bloco..." {...register("complemento")} />
                                    </Field>
                                    <Field label="Bairro">
                                        <input className="input" {...register("bairro")} />
                                    </Field>
                                    <Field label="Cidade de Residência">
                                        <input className="input" {...register("cidade")} />
                                    </Field>
                                    <Field label="Estado de Residência">
                                        <select className="input" {...register("estado")}>
                                            <option value="">UF</option>
                                            {ESTADOS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </SectionCard>

                            <SectionCard headerIcon={Phone} headerTitle="Contato">
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Telefone">
                                        <MaskedInput mask="tel" className="input" placeholder="(00) 0000-0000" {...register("telefone")} />
                                    </Field>
                                    <Field label="Celular" required>
                                        <MaskedInput mask="celular" className="input" placeholder="(00) 00000-0000" {...register("celular")} />
                                    </Field>
                                    <Field label="E-mail">
                                        <input type="email" className="input" {...register("email")} />
                                    </Field>
                                    <Field label="WhatsApp">
                                        <MaskedInput mask="whatsapp" className="input" placeholder="(00) 00000-0000" {...register("whatsapp")} />
                                    </Field>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ══ PASSO 3 — DADOS ECLESIÁSTICOS ══ */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <SectionCard headerIcon={BadgeCheck} headerTitle="Situação no Rol">
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Situação">
                                        <select className="input" {...register("situacao")}>
                                            {SITUACOES.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Data de Ingresso">
                                        <input type="date" className="input" {...register("data_ingresso")} />
                                    </Field>
                                    <Field label="Data de Entrada na Igreja">
                                        <input type="date" className="input" {...register("data_entrada_igreja")} />
                                    </Field>
                                    <Field label="Forma de Entrada">
                                        <select className="input" {...register("forma_entrada")}>
                                            <option value="">Selecione...</option>
                                            {FORMAS_ENTRADA.map((f) => (
                                                <option key={f} value={f}>
                                                    {f}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Congregação" className="sm:col-span-2">
                                        <select className="input" {...register("congregacao_id")}>
                                            <option value="">Igreja sede / Sem congregação</option>
                                            {congregacoes.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </SectionCard>

                            <SectionCard headerIcon={Flame} headerTitle="Conversão e Batismo">
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Data de Conversão">
                                        <input type="date" className="input" {...register("data_conversao")} />
                                    </Field>
                                    <Field label="Denominação de Origem" className="sm:col-span-2">
                                        <input className="input" placeholder="Ex: Assembleia de Deus" {...register("denominacao_origem")} />
                                    </Field>
                                    <Field label="Data do Batismo nas Águas">
                                        <input type="date" className="input" {...register("data_batismo_agua")} />
                                    </Field>
                                    <Field label="Cidade do Batismo">
                                        <input className="input" {...register("cidade_batismo")} />
                                    </Field>
                                    <Field label="Estado do Batismo">
                                        <select className="input" {...register("estado_batismo")}>
                                            <option value="">UF</option>
                                            {ESTADOS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Ano do Batismo no Espírito Santo">
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="Ex: 2015"
                                            min="1900"
                                            max="2099"
                                            {...register("ano_batismo_espirito_santo", { valueAsNumber: true })}
                                        />
                                    </Field>
                                </div>
                            </SectionCard>

                            <SectionCard headerIcon={MapPin} headerTitle="Transferência de Origem">
                                <div className="p-5 space-y-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded accent-primary" {...register("veio_outra_assembleia")} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Veio de outra Assembleia / Denominação
                                        </span>
                                    </label>
                                    {veioOutra && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                            <Field label="Data de Mudança">
                                                <input type="date" className="input" {...register("data_mudanca")} />
                                            </Field>
                                            <Field label="Cidade de Origem">
                                                <input className="input" {...register("cidade_origem")} />
                                            </Field>
                                            <Field label="Estado de Origem">
                                                <select className="input" {...register("estado_origem")}>
                                                    <option value="">UF</option>
                                                    {ESTADOS.map((e) => (
                                                        <option key={e} value={e}>
                                                            {e}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Data de Mudança de Denominação">
                                                <input type="date" className="input" {...register("data_mudanca_denominacao")} />
                                            </Field>
                                        </div>
                                    )}
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ══ PASSO 4 — MINISTÉRIO & CARGOS ══ */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <SectionCard headerIcon={Shield} headerTitle="Cargos Ministeriais">
                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Cargo Principal">
                                            <select className="input" {...register("cargo")}>
                                                <option value="">Selecione...</option>
                                                {CARGOS_SELECT.map((c) => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>
                                    <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                                        Marque todos os cargos que se aplicam:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <CheckField
                                            label="Auxiliar de Trabalho"
                                            detailLabel="Detalhes do ministério auxiliar..."
                                            name="auxiliar_trabalho"
                                            register={register}
                                            watchValue={wAuxiliar}
                                        />
                                        <CheckField
                                            label="Diácono"
                                            detailLabel="Detalhes do diaconato..."
                                            name="diacono"
                                            register={register}
                                            watchValue={wDiacono}
                                        />
                                        <CheckField
                                            label="Presbítero"
                                            detailLabel="Detalhes do presbiterato..."
                                            name="presbitero"
                                            register={register}
                                            watchValue={wPresbitero}
                                        />
                                        <CheckField
                                            label="Evangelista"
                                            detailLabel="Detalhes do ministério de evangelista..."
                                            name="evangelista"
                                            register={register}
                                            watchValue={wEvangelista}
                                        />
                                        <CheckField
                                            label="Pastor"
                                            detailLabel="Detalhes do pastorado..."
                                            name="pastor"
                                            register={register}
                                            watchValue={wPastor}
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard headerIcon={Users} headerTitle="Departamentos e Ministérios">
                                <div className="p-5 grid grid-cols-1 gap-4">
                                    <Field label="Departamentos (separe por vírgula)">
                                        <input className="input" placeholder="Ex: Louvor, Culto, Missões" {...register("departamentos")} />
                                    </Field>
                                    <Field label="Células / Grupos (separe por vírgula)">
                                        <input className="input" placeholder="Ex: Célula Norte, Grupo Jovens" {...register("celulas")} />
                                    </Field>
                                    <Field label="Dons Ministeriais (separe por vírgula)">
                                        <input className="input" placeholder="Ex: Profecia, Cura, Ensinamento" {...register("dons_ministeriais")} />
                                    </Field>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ══ PASSO 5 — CIVIL & PROFISSIONAL ══ */}
                    {step === 4 && (
                        <div className="space-y-5">
                            <SectionCard headerIcon={User} headerTitle="Dados Civis">
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Estado Civil">
                                        <select className="input" {...register("estado_civil")}>
                                            <option value="">Selecione...</option>
                                            {ESTADOS_CIVIS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    {isCasado && (
                                        <>
                                            <Field label="Nome do Cônjuge" className="sm:col-span-2">
                                                <input className="input" {...register("nome_conjuge")} />
                                            </Field>
                                            <Field label="Data do Casamento">
                                                <input type="date" className="input" {...register("data_casamento")} />
                                            </Field>
                                            <Field label="Certidão de Casamento">
                                                <input className="input" {...register("certidao_casamento")} />
                                            </Field>
                                            <Field label="Livro">
                                                <input className="input" {...register("livro_casamento")} />
                                            </Field>
                                            <Field label="Folha">
                                                <input className="input" {...register("folha_casamento")} />
                                            </Field>
                                        </>
                                    )}
                                    <Field label="Identidade (RG)">
                                        <input className="input" {...register("rg")} />
                                    </Field>
                                    <Field label="Órgão Expedidor">
                                        <input className="input" placeholder="SSP" {...register("rg_orgao")} />
                                    </Field>
                                    <Field label="UF do RG">
                                        <select className="input" {...register("rg_uf")}>
                                            <option value="">UF</option>
                                            {ESTADOS.map((e) => (
                                                <option key={e} value={e}>
                                                    {e}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Título de Eleitor">
                                        <input className="input" {...register("titulo_eleitor")} />
                                    </Field>
                                    <Field label="Tipo Sanguíneo">
                                        <select className="input" {...register("tipo_sangue")}>
                                            <option value="">Selecione...</option>
                                            {TIPOS_SANGUE.map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Doador de Sangue">
                                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                                            <input type="checkbox" className="w-4 h-4 rounded accent-primary" {...register("doador_sangue")} />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Sim, é doador de sangue</span>
                                        </label>
                                    </Field>
                                </div>
                            </SectionCard>

                            <SectionCard headerIcon={Briefcase} headerTitle="Profissão e Educação">
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Profissão">
                                        <input className="input" {...register("profissao")} />
                                    </Field>
                                    <Field label="Empresa / Local de Trabalho">
                                        <input className="input" {...register("empresa_trabalho")} />
                                    </Field>
                                </div>
                            </SectionCard>

                            <SectionCard headerIcon={Briefcase} headerTitle="Observações">
                                <div className="p-5">
                                    <textarea
                                        className="input min-h-[100px] resize-y w-full"
                                        placeholder="Informações adicionais..."
                                        {...register("observacoes")}
                                    />
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ─── Rodapé ───────────────────────────────────────── */}
                    <div className="flex items-center justify-between gap-3 pt-1 pb-4">
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex items-center gap-2">
                            <X className="w-4 h-4" /> Cancelar
                        </button>

                        <div className="flex items-center gap-2">
                            {step > 0 && (
                                <button type="button" onClick={() => setStep((s) => s - 1)} className="btn btn-secondary flex items-center gap-1.5">
                                    <ChevronLeft className="w-4 h-4" /> Anterior
                                </button>
                            )}
                            {step < STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep((s) => s + 1)}
                                    className="btn btn-primary flex items-center gap-1.5 px-6"
                                >
                                    Próximo <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => salvarMut.mutate(getValues())}
                                    disabled={salvarMut.isPending}
                                    className="btn btn-primary flex items-center gap-2 px-8"
                                >
                                    {salvarMut.isPending ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" /> {isEdit ? "Salvar alterações" : "Salvar Membro"}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                limiteMembros={resumo?.limite ?? 0}
                totalAtivos={resumo?.membros_ativos ?? 0}
            />
        </>
    );
}
