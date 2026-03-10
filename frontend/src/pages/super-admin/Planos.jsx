import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Edit2, Save, X, CheckCircle, XCircle, Users } from "lucide-react";
import { superadminAPI } from "../../services/api";

const EMPTY_FORM = {
    nome: "",
    descricao: "",
    limite_membros: 100,
    preco_mensal: 0,
    preco_anual: 0,
    stripe_price_id_mensal: "",
    stripe_price_id_anual: "",
    ativo: true,
};

function fmt(v) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export default function SuperAdminPlanos() {
    const [planos, setPlanos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editando, setEditando] = useState(null); // id do plano sendo editado
    const [criando, setCriando] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const carregar = async () => {
        setLoading(true);
        try {
            const { data } = await superadminAPI.listarPlanos();
            setPlanos(data.planos);
        } catch {
            toast.error("Erro ao carregar planos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregar();
    }, []);

    const abrirEdicao = (p) => {
        setEditando(p.id);
        setCriando(false);
        setForm({
            nome: p.nome,
            descricao: p.descricao || "",
            limite_membros: p.limite_membros,
            preco_mensal: p.preco_mensal,
            preco_anual: p.preco_anual,
            stripe_price_id_mensal: p.stripe_price_id_mensal || "",
            stripe_price_id_anual: p.stripe_price_id_anual || "",
            ativo: !!p.ativo,
        });
    };

    const cancelar = () => {
        setEditando(null);
        setCriando(false);
        setForm(EMPTY_FORM);
    };

    const salvar = async () => {
        if (!form.nome) return toast.error("Informe o nome do plano");
        setSaving(true);
        try {
            if (criando) {
                await superadminAPI.criarPlano(form);
                toast.success("Plano criado!");
            } else {
                await superadminAPI.atualizarPlano(editando, form);
                toast.success("Plano atualizado!");
            }
            cancelar();
            carregar();
        } catch (err) {
            toast.error(err.response?.data?.error || "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const F = ({ label, name, type = "text", ...rest }) => (
        <div>
            <label className="text-gray-400 text-xs mb-1 block">{label}</label>
            <input
                type={type}
                value={form[name]}
                onChange={(e) => setForm((f) => ({ ...f, [name]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                className="w-full h-9 px-3 bg-gray-900/70 border border-gray-600/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                {...rest}
            />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Planos SaaS</h1>
                    <p className="text-gray-400 text-sm mt-1">Gerenciar planos de assinatura da plataforma</p>
                </div>
                {!criando && !editando && (
                    <button
                        onClick={() => {
                            setCriando(true);
                            setEditando(null);
                            setForm(EMPTY_FORM);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition"
                    >
                        <Plus className="w-4 h-4" /> Novo Plano
                    </button>
                )}
            </div>

            {/* Formulário de criação/edição inline */}
            {(criando || editando) && (
                <div className="bg-gray-800/60 border border-violet-700/40 rounded-2xl p-6">
                    <h2 className="text-base font-bold text-white mb-5">{criando ? "Criar novo plano" : "Editar plano"}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <F label="Nome do plano *" name="nome" placeholder="Ex: Básico" />
                        <F label="Nº máximo de membros *" name="limite_membros" type="number" min={1} />
                        <F label="Descrição" name="descricao" placeholder="Descrição breve" />
                        <F label="Preço mensal (R$)" name="preco_mensal" type="number" min={0} step={0.01} />
                        <F label="Preço anual (R$)" name="preco_anual" type="number" min={0} step={0.01} />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Ativo</label>
                            <select
                                value={form.ativo ? "1" : "0"}
                                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.value === "1" }))}
                                className="w-full h-9 px-3 bg-gray-900/70 border border-gray-600/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                            >
                                <option value="1">Sim</option>
                                <option value="0">Não</option>
                            </select>
                        </div>
                        <F label="Stripe Price ID Mensal" name="stripe_price_id_mensal" placeholder="price_…" />
                        <F label="Stripe Price ID Anual" name="stripe_price_id_anual" placeholder="price_…" />
                    </div>
                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={salvar}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                        >
                            {saving ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Salvar
                                </>
                            )}
                        </button>
                        <button
                            onClick={cancelar}
                            className="flex items-center gap-2 px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-xl text-sm transition"
                        >
                            <X className="w-4 h-4" /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de planos */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {planos.map((p) => (
                        <div
                            key={p.id}
                            className={`bg-gray-800/50 border rounded-2xl p-5 flex flex-col gap-4 transition ${editando === p.id ? "border-violet-500/50" : "border-gray-700/60"}`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-bold">{p.nome}</h3>
                                        {p.ativo ? (
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                                        )}
                                    </div>
                                    {p.descricao && <p className="text-gray-500 text-xs mt-0.5">{p.descricao}</p>}
                                </div>
                                <button onClick={() => abrirEdicao(p)} className="text-gray-500 hover:text-violet-400 transition flex-shrink-0">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-900/50 rounded-xl p-3">
                                    <p className="text-gray-500 text-xs">Mensal</p>
                                    <p className="text-white font-bold text-lg">{fmt(p.preco_mensal)}</p>
                                </div>
                                <div className="bg-gray-900/50 rounded-xl p-3">
                                    <p className="text-gray-500 text-xs">Anual</p>
                                    <p className="text-white font-bold text-lg">{fmt(p.preco_anual)}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm border-t border-gray-700/40 pt-3">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Até {p.limite_membros.toLocaleString("pt-BR")} membros</span>
                                </div>
                                <span className="text-violet-400 font-semibold">
                                    {p.total_igrejas} {p.total_igrejas === 1 ? "igreja" : "igrejas"}
                                </span>
                            </div>
                        </div>
                    ))}
                    {planos.length === 0 && (
                        <div className="col-span-full text-center py-16 text-gray-500">
                            Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
