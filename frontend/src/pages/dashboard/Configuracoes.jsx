import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { igrejasAPI, authAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { Save, Upload, Palette, Lock, Church, PenLine, Trash2, Droplets } from "lucide-react";
import MaskedInput from "../../components/MaskedInput";

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

const CARGOS_CORES_PADRAO = {
    Membro: { cor_primaria: "#1e3a8a", cor_secundaria: "#3b82f6", cor_texto: "#ffffff" },
    "Membro (Feminino)": { cor_primaria: "#831843", cor_secundaria: "#f472b6", cor_texto: "#ffffff" },
    Diácono: { cor_primaria: "#5b21b6", cor_secundaria: "#8b5cf6", cor_texto: "#ffffff" },
    Presbítero: { cor_primaria: "#0f4c5c", cor_secundaria: "#0e9aa7", cor_texto: "#ffffff" },
    Evangelista: { cor_primaria: "#92400e", cor_secundaria: "#f59e0b", cor_texto: "#ffffff" },
    Pastor: { cor_primaria: "#7f1d1d", cor_secundaria: "#ef4444", cor_texto: "#ffffff" },
    Missionário: { cor_primaria: "#064e3b", cor_secundaria: "#10b981", cor_texto: "#ffffff" },
    Obreiro: { cor_primaria: "#374151", cor_secundaria: "#6b7280", cor_texto: "#ffffff" },
    Líder: { cor_primaria: "#0c4a6e", cor_secundaria: "#0ea5e9", cor_texto: "#ffffff" },
    "Líder de Célula": { cor_primaria: "#0c4a6e", cor_secundaria: "#0ea5e9", cor_texto: "#ffffff" },
    "Dirigente de Departamento": { cor_primaria: "#312e81", cor_secundaria: "#818cf8", cor_texto: "#ffffff" },
    Auxiliar: { cor_primaria: "#374151", cor_secundaria: "#6b7280", cor_texto: "#ffffff" },
    Secretário: { cor_primaria: "#1a4731", cor_secundaria: "#16a34a", cor_texto: "#ffffff" },
    Tesoureiro: { cor_primaria: "#78350f", cor_secundaria: "#d97706", cor_texto: "#ffffff" },
};

export default function ConfigPage() {
    const qc = useQueryClient();
    const { verificarSessao } = useAuth();
    const [logoPreview, setLogoPreview] = useState(null);
    const [sigPreview, setSigPreview] = useState(null);
    const [marcaDaguaPreview, setMarcaDaguaPreview] = useState(null);
    const [tab, setTab] = useState("geral");
    const [coresFuncoes, setCoresFuncoes] = useState(() => {
        const base = {};
        Object.keys(CARGOS_CORES_PADRAO).forEach((k) => {
            base[k] = { ...CARGOS_CORES_PADRAO[k] };
        });
        return base;
    });

    const { data: igreja, isLoading } = useQuery({ queryKey: ["minha-igreja"], queryFn: () => igrejasAPI.minha().then((r) => r.data) });
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm();
    const {
        register: regSenha,
        handleSubmit: handleSenha,
        reset: resetSenha,
        formState: { errors: errSenha, isSubmitting: submSenha },
    } = useForm();

    useEffect(() => {
        if (igreja) {
            reset(igreja);
            if (igreja.logo_url) setLogoPreview(igreja.logo_url);
            if (igreja.assinatura_pastor_url) setSigPreview(igreja.assinatura_pastor_url);
            if (igreja.marca_dagua_url) setMarcaDaguaPreview(igreja.marca_dagua_url);
            // Mescla cores salvas sobre os padrões
            if (igreja.cores_funcoes && typeof igreja.cores_funcoes === "object") {
                setCoresFuncoes((prev) => {
                    const merged = { ...prev };
                    Object.keys(igreja.cores_funcoes).forEach((k) => {
                        merged[k] = { ...CARGOS_CORES_PADRAO[k], ...igreja.cores_funcoes[k] };
                    });
                    return merged;
                });
            }
        }
    }, [igreja, reset]);

    const salvarMut = useMutation({
        mutationFn: (data) => igrejasAPI.atualizar(data),
        onSuccess: () => {
            toast.success("Dados atualizados!");
            qc.invalidateQueries({ queryKey: ["minha-igreja"] });
            verificarSessao();
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao salvar"),
    });

    // Mutation dedicada para a aba Visual: salva os dados E marca o passo de onboarding
    // em sequência, garantindo que verificarSessao() receba os dados já atualizados.
    const salvarVisualMut = useMutation({
        mutationFn: async (data) => {
            await igrejasAPI.atualizar(data);
            const corAlterada = (data.cor_primaria && data.cor_primaria !== "#1a56db") || (data.cor_secundaria && data.cor_secundaria !== "#6366f1");
            if (corAlterada) {
                await igrejasAPI.marcarOnboarding({ cores_configuradas: true });
            }
        },
        onSuccess: () => {
            toast.success("Dados atualizados!");
            qc.invalidateQueries({ queryKey: ["minha-igreja"] });
            verificarSessao(); // dispara após ambas as escritas no DB estarem concluídas
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao salvar"),
    });

    const salvarCoresFuncoesMut = useMutation({
        mutationFn: () => igrejasAPI.salvarCoresFuncoes(coresFuncoes),
        onSuccess: () => {
            toast.success("Cores por cargo salvas! Regenere as carteiras para aplicar.");
            qc.invalidateQueries({ queryKey: ["minha-igreja"] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao salvar cores"),
    });

    const logoMut = useMutation({
        mutationFn: (file) => igrejasAPI.uploadLogo(file),
        onSuccess: (res) => {
            setLogoPreview(res.data.logo_url);
            toast.success("Logo atualizada!");
            qc.invalidateQueries({ queryKey: ["minha-igreja"] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao enviar logo"),
    });

    const sigMut = useMutation({
        mutationFn: (file) => igrejasAPI.uploadAssinatura(file),
        onSuccess: (res) => {
            setSigPreview(res.data.assinatura_pastor_url);
            toast.success("Assinatura atualizada!");
            qc.invalidateQueries({ queryKey: ["minha-igreja"] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao enviar assinatura"),
    });

    const marcaDaguaMut = useMutation({
        mutationFn: (file) => igrejasAPI.uploadMarcaDagua(file),
        onSuccess: (res) => {
            setMarcaDaguaPreview(res.data.marca_dagua_url);
            toast.success("Marca d'água atualizada!");
            qc.invalidateQueries({ queryKey: ["minha-igreja"] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao enviar marca d'água"),
    });

    const removerMarcaDaguaMut = useMutation({
        mutationFn: () => igrejasAPI.removerMarcaDagua(),
        onSuccess: () => {
            setMarcaDaguaPreview(null);
            toast.success("Marca d'água removida!");
            qc.invalidateQueries({ queryKey: ["minha-igreja"] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao remover marca d'água"),
    });

    const senhaMut = useMutation({
        mutationFn: (data) => authAPI.alterarSenha(data),
        onSuccess: () => {
            toast.success("Senha alterada!");
            resetSenha();
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao alterar senha"),
    });

    if (isLoading)
        return (
            <div className="flex justify-center py-20">
                <div className="spinner" />
            </div>
        );

    const TABS = [
        { id: "geral", label: "Geral", icon: Church },
        { id: "visual", label: "Visual", icon: Palette },
        { id: "carteira", label: "Carteira", icon: PenLine },
        { id: "senha", label: "Segurança", icon: Lock },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h1 className="page-title">Configurações</h1>
                <p className="page-subtitle">Personalize sua igreja no sistema</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-fit border border-gray-200 dark:border-gray-700/50">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            tab === t.id
                                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
                        }`}
                    >
                        <t.icon className={`w-4 h-4 ${tab === t.id ? "text-primary dark:text-primary-300" : ""}`} />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "geral" && (
                <form onSubmit={handleSubmit(salvarMut.mutate)} className="space-y-5">
                    <div className="card space-y-4">
                        <h3 className="section-title">Dados da Igreja</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="col-span-full">
                                <label className="label">Nome da Igreja *</label>
                                <input className="input" {...register("nome", { required: "Obrigatório" })} />
                                {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                            </div>
                            <div>
                                <label className="label">Nome curto / sigla</label>
                                <input className="input" placeholder="Ex: IEGV" {...register("nome_curto")} />
                            </div>
                            <div>
                                <label className="label">CNPJ</label>
                                <MaskedInput mask="cnpj" className="input" placeholder="00.000.000/0001-00" {...register("cnpj")} />
                            </div>
                            <div>
                                <label className="label">E-mail *</label>
                                <input type="email" className="input" {...register("email", { required: "Obrigatório" })} />
                            </div>
                            <div>
                                <label className="label">Telefone</label>
                                <MaskedInput mask="tel" className="input" placeholder="(00) 0000-0000" {...register("telefone")} />
                            </div>
                            <div>
                                <label className="label">Celular</label>
                                <MaskedInput mask="celular" className="input" placeholder="(00) 9 0000-0000" {...register("celular")} />
                            </div>
                            <div>
                                <label className="label">Site</label>
                                <input className="input" placeholder="https://" {...register("site")} />
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-4">
                        <h3 className="section-title">Endereço</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">CEP</label>
                                <MaskedInput mask="cep" className="input" placeholder="00000-000" {...register("cep")} />
                            </div>
                            <div>
                                <label className="label">Logradouro</label>
                                <input className="input" {...register("logradouro")} />
                            </div>
                            <div>
                                <label className="label">Número</label>
                                <input className="input" {...register("numero")} />
                            </div>
                            <div>
                                <label className="label">Complemento</label>
                                <input className="input" {...register("complemento")} />
                            </div>
                            <div>
                                <label className="label">Bairro</label>
                                <input className="input" {...register("bairro")} />
                            </div>
                            <div>
                                <label className="label">Cidade *</label>
                                <input className="input" {...register("cidade", { required: "Obrigatório" })} />
                            </div>
                            <div>
                                <label className="label">Estado *</label>
                                <select className="input" {...register("estado", { required: "Obrigatório" })}>
                                    <option value="">Selecione</option>
                                    {ESTADOS.map((e) => (
                                        <option key={e} value={e}>
                                            {e}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-4">
                        <h3 className="section-title">Denominação</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Denominação</label>
                                <input className="input" placeholder="Assembleia de Deus..." {...register("denominacao")} />
                            </div>
                            <div>
                                <label className="label">Nome do pastor</label>
                                <input className="input" {...register("pastor_nome")} />
                            </div>
                            <div>
                                <label className="label">Título do pastor</label>
                                <input className="input" placeholder="Pastor, Pr., Bispo..." {...register("pastor_titulo")} />
                            </div>
                            <div>
                                <label className="label">Ano de fundação</label>
                                <input type="number" className="input" placeholder="1990" {...register("fundacao_ano")} />
                            </div>
                            <div>
                                <label className="label">WhatsApp do pastor</label>
                                <MaskedInput mask="phone" className="input" placeholder="(11) 99999-9999" {...register("pastor_whatsapp")} />
                            </div>
                            <div>
                                <label className="label">E-mail do pastor</label>
                                <input type="email" className="input" placeholder="pastor@igreja.com" {...register("pastor_email")} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={salvarMut.isPending} className="btn btn-primary px-6">
                            {salvarMut.isPending ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Salvar dados
                        </button>
                    </div>
                </form>
            )}

            {tab === "visual" && (
                <div className="space-y-5">
                    <div className="card space-y-5">
                        <h3 className="section-title">Identidade Visual</h3>
                        {/* Logo */}
                        <div>
                            <label className="label">Logo da Igreja</label>
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Church className="w-8 h-8 text-gray-300" />
                                    )}
                                </div>
                                <label className="btn btn-secondary cursor-pointer">
                                    <Upload className="w-4 h-4" /> {logoMut.isPending ? "Enviando..." : "Enviar logo"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) logoMut.mutate(f);
                                        }}
                                        disabled={logoMut.isPending}
                                    />
                                </label>
                            </div>
                        </div>
                        {/* Cores */}
                        <form onSubmit={handleSubmit(salvarVisualMut.mutate)}>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Cor primária</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            className="w-10 h-10 rounded-lg border border-gray-200 p-0.5 cursor-pointer"
                                            value={watch("cor_primaria") || "#1a56db"}
                                            onChange={(e) => setValue("cor_primaria", e.target.value, { shouldDirty: true })}
                                        />
                                        <input className="input flex-1" {...register("cor_primaria")} placeholder="#1a56db" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Cor secundária</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            className="w-10 h-10 rounded-lg border border-gray-200 p-0.5 cursor-pointer"
                                            value={watch("cor_secundaria") || "#6366f1"}
                                            onChange={(e) => setValue("cor_secundaria", e.target.value, { shouldDirty: true })}
                                        />
                                        <input className="input flex-1" {...register("cor_secundaria")} placeholder="#6366f1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Cor do texto</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            className="w-10 h-10 rounded-lg border border-gray-200 p-0.5 cursor-pointer"
                                            value={watch("cor_texto") || "#ffffff"}
                                            onChange={(e) => setValue("cor_texto", e.target.value, { shouldDirty: true })}
                                        />
                                        <input className="input flex-1" {...register("cor_texto")} placeholder="#ffffff" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button type="submit" disabled={salvarVisualMut.isPending} className="btn btn-primary px-6">
                                    <Save className="w-4 h-4" /> Salvar cores
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {tab === "carteira" && (
                <div className="space-y-5">
                    {/* Assinatura do Pastor */}
                    <div className="card space-y-5">
                        <h3 className="section-title">Assinatura do Pastor</h3>
                        <p className="text-sm text-gray-500">
                            Envie uma imagem da assinatura do pastor para aparecer na carteirinha de membro (fundo transparente recomendado).
                        </p>
                        <div className="flex items-start gap-5">
                            <div className="w-48 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
                                {sigPreview ? (
                                    <img src={sigPreview} alt="Assinatura" className="h-full object-contain" />
                                ) : (
                                    <PenLine className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="btn btn-secondary cursor-pointer">
                                    <Upload className="w-4 h-4" /> {sigMut.isPending ? "Enviando..." : "Enviar assinatura"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) sigMut.mutate(f);
                                        }}
                                        disabled={sigMut.isPending}
                                    />
                                </label>
                                <p className="text-xs text-gray-400">PNG com fundo transparente (.png, .webp) para melhor resultado</p>
                            </div>
                        </div>
                    </div>

                    {/* Marca d'água */}
                    <div className="card space-y-5">
                        <h3 className="section-title">Marca D'água da Carteira</h3>
                        <p className="text-sm text-gray-500">
                            Imagem exibida com transparência no fundo da face frontal da carteirinha. Ideal para logo ou símbolo da Igreja.
                        </p>
                        <div className="flex items-start gap-5">
                            {/* Preview */}
                            <div className="relative w-48 h-36 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
                                {marcaDaguaPreview ? (
                                    <img src={marcaDaguaPreview} alt="Marca d'água" className="w-full h-full object-contain opacity-30" />
                                ) : (
                                    <Droplets className="w-10 h-10 text-gray-300" />
                                )}
                                {marcaDaguaPreview && (
                                    <span className="absolute bottom-1 right-1 text-[9px] text-gray-400 bg-white/80 px-1 rounded">10% opacidade</span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="btn btn-secondary cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    {marcaDaguaMut.isPending ? "Enviando..." : marcaDaguaPreview ? "Trocar imagem" : "Enviar imagem"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) marcaDaguaMut.mutate(f);
                                        }}
                                        disabled={marcaDaguaMut.isPending}
                                    />
                                </label>

                                {marcaDaguaPreview && (
                                    <button
                                        type="button"
                                        onClick={() => removerMarcaDaguaMut.mutate()}
                                        disabled={removerMarcaDaguaMut.isPending}
                                        className="btn btn-secondary text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {removerMarcaDaguaMut.isPending ? "Removendo..." : "Remover"}
                                    </button>
                                )}

                                <p className="text-xs text-gray-400">PNG com fundo transparente (.png, .webp) para melhor resultado.</p>
                                <p className="text-xs text-gray-400">A imagem será centralizada na frente da carteira com 10% de opacidade.</p>
                            </div>
                        </div>
                    </div>

                    {/* Cores por Cargo */}
                    <div className="card space-y-5">
                        <div>
                            <h3 className="section-title flex items-center gap-2">
                                <Palette className="w-4 h-4" /> Cores por Cargo
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Defina cores únicas para cada cargo. Cada carteirinha será gerada com as cores do cargo do membro.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {Object.keys(CARGOS_CORES_PADRAO).map((cargo) => {
                                const cores = coresFuncoes[cargo] || CARGOS_CORES_PADRAO[cargo];
                                const updateCor = (campo, valor) =>
                                    setCoresFuncoes((prev) => ({ ...prev, [cargo]: { ...prev[cargo], [campo]: valor } }));
                                return (
                                    <div key={cargo} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ background: `linear-gradient(135deg, ${cores.cor_primaria}, ${cores.cor_secundaria})` }}
                                                />
                                                <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{cargo}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCoresFuncoes((prev) => ({ ...prev, [cargo]: { ...CARGOS_CORES_PADRAO[cargo] } }))}
                                                className="text-xs text-gray-400 hover:text-primary transition-colors"
                                            >
                                                Restaurar padrão
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { campo: "cor_primaria", label: "Cor primária" },
                                                { campo: "cor_secundaria", label: "Cor secundária" },
                                                { campo: "cor_texto", label: "Texto / ícone" },
                                            ].map(({ campo, label }) => (
                                                <div key={campo}>
                                                    <label className="label text-xs">{label}</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            type="color"
                                                            value={cores[campo] || "#000000"}
                                                            onChange={(e) => updateCor(campo, e.target.value)}
                                                            className="w-9 h-9 rounded-lg border border-gray-200 p-0.5 cursor-pointer shrink-0"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={cores[campo] || ""}
                                                            onChange={(e) => updateCor(campo, e.target.value)}
                                                            placeholder="#000000"
                                                            maxLength={7}
                                                            className="input flex-1 font-mono text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* mini preview */}
                                        <div
                                            className="h-5 rounded-md w-full"
                                            style={{ background: `linear-gradient(to right, ${cores.cor_primaria}, ${cores.cor_secundaria})` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => salvarCoresFuncoesMut.mutate()}
                                disabled={salvarCoresFuncoesMut.isPending}
                                className="btn btn-primary px-6"
                            >
                                {salvarCoresFuncoesMut.isPending ? (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Salvar cores por cargo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tab === "senha" && (
                <div className="card max-w-md">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b dark:border-gray-700 mb-4">Alterar Senha</h3>
                    <form onSubmit={handleSenha(senhaMut.mutate)} className="space-y-4">
                        <div>
                            <label className="label">Senha atual</label>
                            <input type="password" className="input" {...regSenha("senha_atual", { required: "Obrigatório" })} />
                            {errSenha.senha_atual && <p className="text-red-500 text-xs mt-1">{errSenha.senha_atual.message}</p>}
                        </div>
                        <div>
                            <label className="label">Nova senha</label>
                            <input
                                type="password"
                                className="input"
                                {...regSenha("nova_senha", { required: "Obrigatório", minLength: { value: 8, message: "Mínimo 8 caracteres" } })}
                            />
                            {errSenha.nova_senha && <p className="text-red-500 text-xs mt-1">{errSenha.nova_senha.message}</p>}
                        </div>
                        <button type="submit" disabled={submSenha || senhaMut.isPending} className="btn btn-primary w-full justify-center">
                            {submSenha || senhaMut.isPending ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            Alterar senha
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
