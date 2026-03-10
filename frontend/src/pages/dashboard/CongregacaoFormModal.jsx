/**
 * CongregacaoFormModal — componente compartilhado.
 * Usado tanto na lista (CongrecacoesPage) quanto no detalhe (CongregacaoDetalhe).
 */
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { congregacoesAPI } from "../../services/api";
import MaskedInput from "../../components/MaskedInput";
import { Church, X } from "lucide-react";

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

/** Props:
 *  - onClose: () => void
 *  - editData: objeto da congregação para editar, ou null/undefined para criação
 *  - onSuccessExtra?: () => void  — callback adicional após salvar com sucesso
 */
export default function CongregacaoFormModal({ onClose, editData, onSuccessExtra }) {
    const qc = useQueryClient();
    const isEdit = !!editData;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: editData ? { ...editData, ativo: !!editData.ativo } : { ativo: true },
    });

    const salvarMut = useMutation({
        mutationFn: (data) => (isEdit ? congregacoesAPI.atualizar(editData.id, data) : congregacoesAPI.criar(data)),
        onSuccess: () => {
            toast.success(isEdit ? "Congregação atualizada!" : "Congregação cadastrada!");
            qc.invalidateQueries({ queryKey: ["congregacoes"] });
            qc.invalidateQueries({ queryKey: ["congregacao", editData?.id] });
            onSuccessExtra?.();
            onClose();
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao salvar congregação"),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-gradient-to-r from-primary to-primary-700">
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
                                    <input type="checkbox" className="w-4 h-4 rounded accent-primary" {...register("ativo")} />
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

                    {/* Dirigentes */}
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
                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-3">
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
