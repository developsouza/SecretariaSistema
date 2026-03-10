import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { congregacoesAPI } from "../../services/api";
import CongregacaoFormModal from "./CongregacaoFormModal";
import { Church, Plus, Trash2, MapPin, Users, UserCheck, ToggleLeft, ToggleRight, Search, Eye, Pencil } from "lucide-react";

const ESTADOS_BR = [
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

// ─── Formulário de Congregação (criação / edição) ──────────────────────────
function CongregacaoModal({ onClose, editData }) {
    const qc = useQueryClient();
    const isEdit = !!editData;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: editData || { ativo: true },
    });

    const salvarMut = useMutation({
        mutationFn: (data) => (isEdit ? congregacoesAPI.atualizar(editData.id, data) : congregacoesAPI.criar(data)),
        onSuccess: () => {
            toast.success(isEdit ? "Congregação atualizada!" : "Congregação cadastrada!");
            qc.invalidateQueries({ queryKey: ["congregacoes"] });
            onClose();
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao salvar congregação"),
    });

    return (
        /* Overlay */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700"
                    style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
                >
                    <div className="flex items-center gap-3 text-white">
                        <Church className="w-5 h-5" />
                        <h2 className="font-bold text-base">{isEdit ? "Editar Congregação" : "Nova Congregação"}</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Corpo */}
                <form onSubmit={handleSubmit((d) => salvarMut.mutate(d))} className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Identificação */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">Identificação</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    Nome da Congregação <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="input"
                                    placeholder="Ex: Congregação Bairro Novo"
                                    {...register("nome", {
                                        required: "Nome obrigatório",
                                        minLength: { value: 2, message: "Mín. 2 caracteres" },
                                    })}
                                />
                                {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    Status
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded accent-primary"
                                        defaultChecked={editData ? editData.ativo : true}
                                        {...register("ativo")}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Ativa</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Endereço */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">Endereço</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    CEP
                                </label>
                                <MaskedInput mask="cep" className="input" placeholder="00000-000" {...register("cep")} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    Logradouro
                                </label>
                                <input className="input" placeholder="Rua, Av., Travessa..." {...register("logradouro")} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    Número
                                </label>
                                <input className="input" placeholder="Nº" {...register("numero")} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    Complemento
                                </label>
                                <input className="input" placeholder="Apto, Bloco..." {...register("complemento")} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    Bairro
                                </label>
                                <input className="input" {...register("bairro")} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    Cidade
                                </label>
                                <input className="input" {...register("cidade")} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                    UF
                                </label>
                                <select className="input" {...register("estado")}>
                                    <option value="">UF</option>
                                    {ESTADOS_BR.map((e) => (
                                        <option key={e} value={e}>
                                            {e}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Dirigente / Responsável */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">Dirigente / Responsável</h3>

                        {/* Dirigente 1 */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Dirigente 1</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                        Nome
                                    </label>
                                    <input className="input" placeholder="Nome completo" {...register("dirigente_nome")} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                        Cargo / Título
                                    </label>
                                    <input className="input" placeholder="Ex: Pastor, Presbítero" {...register("dirigente_cargo")} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                        Celular
                                    </label>
                                    <MaskedInput mask="celular" className="input" placeholder="(00) 00000-0000" {...register("dirigente_celular")} />
                                </div>
                            </div>
                        </div>

                        {/* Dirigente 2 */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Dirigente 2 (opcional)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                        Nome
                                    </label>
                                    <input className="input" placeholder="Nome completo" {...register("dirigente2_nome")} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                        Cargo / Título
                                    </label>
                                    <input className="input" placeholder="Ex: Presbítero, Diácono" {...register("dirigente2_cargo")} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                                        Celular
                                    </label>
                                    <MaskedInput mask="celular" className="input" placeholder="(00) 00000-0000" {...register("dirigente2_celular")} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Botões */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-ghost">
                            <X className="w-4 h-4" /> Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                            {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                            Salvar Congregação
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal de confirmação de exclusão ──────────────────────────────────────
function ConfirmDeleteModal({ congregacao, onConfirm, onClose, loading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Excluir congregação</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Esta ação não pode ser desfeita</p>
                    </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Deseja excluir a congregação <strong>{congregacao.nome}</strong>? Os membros vinculados serão desassociados.
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-ghost">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={loading} className="btn bg-red-600 text-white hover:bg-red-700">
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function CongregacoesPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [busca, setBusca] = useState("");

    const { data: congregacoes = [], isLoading } = useQuery({
        queryKey: ["congregacoes"],
        queryFn: () => congregacoesAPI.listar().then((r) => r.data),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => congregacoesAPI.deletar(id),
        onSuccess: () => {
            toast.success("Congregação excluída!");
            qc.invalidateQueries({ queryKey: ["congregacoes"] });
            setDeleteTarget(null);
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao excluir congregação"),
    });

    const filtradas = congregacoes.filter(
        (c) =>
            c.nome.toLowerCase().includes(busca.toLowerCase()) ||
            (c.cidade || "").toLowerCase().includes(busca.toLowerCase()) ||
            (c.dirigente_nome || "").toLowerCase().includes(busca.toLowerCase()),
    );

    const abrirNova = () => {
        setEditData(null);
        setShowModal(true);
    };

    const abrirEditar = (c) => {
        setEditData({ ...c, ativo: !!c.ativo });
        setShowModal(true);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Congregações</h1>
                    <p className="page-subtitle">Gerencie as congregações vinculadas a esta igreja</p>
                </div>
                <button onClick={abrirNova} className="btn btn-primary self-start sm:self-auto">
                    <Plus className="w-4 h-4" />
                    Nova Congregação
                </button>
            </div>

            {/* Barra de busca */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    className="input pl-9"
                    placeholder="Buscar por nome, cidade ou dirigente..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                />
            </div>

            {/* Tabela */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="spinner" />
                </div>
            ) : filtradas.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
                    <Church className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        {busca ? "Nenhuma congregação encontrada" : "Nenhuma congregação cadastrada"}
                    </p>
                    {!busca && <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Clique em "Nova Congregação" para começar</p>}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <th className="text-left px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                                        Congregação
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                                        Endereço
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">
                                        Dirigente
                                    </th>
                                    <th className="text-center px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                                        Membros
                                    </th>
                                    <th className="text-center px-5 py-3 text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                                        Status
                                    </th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtradas.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        {/* Nome */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                    <Church className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-white">{c.nome}</span>
                                            </div>
                                        </td>

                                        {/* Endereço */}
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            {c.cidade ? (
                                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span>
                                                        {[c.logradouro, c.numero].filter(Boolean).join(", ")}
                                                        {c.bairro ? ` - ${c.bairro}` : ""}
                                                        {c.cidade ? `, ${c.cidade}` : ""}
                                                        {c.estado ? `/${c.estado}` : ""}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Não informado</span>
                                            )}
                                        </td>

                                        {/* Dirigente */}
                                        <td className="px-5 py-4 hidden lg:table-cell">
                                            {c.dirigente_nome ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                                        <UserCheck className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                                        <span>
                                                            {c.dirigente_nome}
                                                            {c.dirigente_cargo ? (
                                                                <span className="text-gray-400 text-xs ml-1">({c.dirigente_cargo})</span>
                                                            ) : null}
                                                        </span>
                                                    </div>
                                                    {c.dirigente2_nome && (
                                                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                            <UserCheck className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
                                                            <span>
                                                                {c.dirigente2_nome}
                                                                {c.dirigente2_cargo ? (
                                                                    <span className="text-gray-400 text-xs ml-1">({c.dirigente2_cargo})</span>
                                                                ) : null}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Não informado</span>
                                            )}
                                        </td>

                                        {/* Total membros */}
                                        <td className="px-5 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                <Users className="w-3 h-3" />
                                                {c.total_membros ?? 0}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4 text-center">
                                            {c.ativo ? (
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                    <ToggleRight className="w-3.5 h-3.5" /> Ativa
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                    <ToggleLeft className="w-3.5 h-3.5" /> Inativa
                                                </span>
                                            )}
                                        </td>

                                        {/* Ações */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => navigate(`/dashboard/congregacoes/${c.id}`)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="Visualizar"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => abrirEditar(c)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(c)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Rodapé da tabela */}
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {filtradas.length} congregaç{filtradas.length !== 1 ? "ões" : "ão"} encontrada{filtradas.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            )}

            {/* Modal criar/editar */}
            {showModal && (
                <CongregacaoFormModal
                    editData={editData}
                    onClose={() => {
                        setShowModal(false);
                        setEditData(null);
                    }}
                />
            )}

            {/* Modal confirmar exclusão */}
            {deleteTarget && (
                <ConfirmDeleteModal
                    congregacao={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={() => deleteMut.mutate(deleteTarget.id)}
                    loading={deleteMut.isPending}
                />
            )}
        </div>
    );
}
