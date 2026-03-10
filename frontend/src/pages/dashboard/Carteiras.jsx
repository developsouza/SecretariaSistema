import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { membrosAPI, carteirasAPI } from "../../services/api";
import { CreditCard, Download, RefreshCw, User, Search, CheckCircle2, PackageCheck, Clock, X, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { congregacoesAPI } from "../../services/api";

async function downloadCarteira(m) {
    try {
        const res = await carteirasAPI.download(m.id);
        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `carteira-${m.nome_completo || m.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        toast.error(e.response?.data?.error || "Erro ao baixar carteira");
    }
}

function fmtData(d) {
    if (!d) return "–";
    try {
        return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
    } catch {
        return d;
    }
}

// ─── Modal de Entrega ─────────────────────────────────────────────────────
function ModalEntrega({ membro, onClose, onSalvo }) {
    const hoje = new Date().toISOString().split("T")[0];
    const [dataEntrega, setDataEntrega] = useState(hoje);
    const [entreguePara, setEntreguePara] = useState("");
    const qc = useQueryClient();

    const mut = useMutation({
        mutationFn: () => carteirasAPI.registrarEntrega(membro.id, { data_entrega: dataEntrega, entregue_para: entreguePara }),
        onSuccess: () => {
            toast.success("Entrega registrada com sucesso!");
            qc.invalidateQueries({ queryKey: ["membros-carteiras"] });
            onSalvo?.();
            onClose();
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao registrar entrega"),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-green-600" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registrar Entrega</h2>
                    </div>
                    <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Carteira de <span className="font-medium text-gray-900 dark:text-white">{membro.nome_completo}</span>
                    </p>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data de Entrega</label>
                        <input type="date" className="input w-full" value={dataEntrega} max={hoje} onChange={(e) => setDataEntrega(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Entregue a quem</label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="Nome de quem recebeu..."
                            value={entreguePara}
                            onChange={(e) => setEntreguePara(e.target.value)}
                        />
                    </div>
                </div>
                <div className="px-6 pb-5 flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary">
                        Cancelar
                    </button>
                    <button onClick={() => mut.mutate()} disabled={mut.isPending || !dataEntrega || !entreguePara.trim()} className="btn btn-primary">
                        {mut.isPending ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <PackageCheck className="w-4 h-4" />
                        )}
                        Confirmar Entrega
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CarteirasPage() {
    const [busca, setBusca] = useState("");
    const [congregacaoId, setCongregacaoId] = useState("");
    const [selecionados, setSelecionados] = useState([]);
    const [modalEntrega, setModalEntrega] = useState(null); // membro selecionado para entrega
    const qc = useQueryClient();

    const { data: dataCongregacoes } = useQuery({
        queryKey: ["congregacoes"],
        queryFn: () => congregacoesAPI.listar().then((r) => r.data),
        staleTime: 300_000,
    });
    const congregacoes = dataCongregacoes?.congregacoes || dataCongregacoes || [];

    const { data, isLoading } = useQuery({
        queryKey: ["membros-carteiras", busca, congregacaoId],
        queryFn: () =>
            membrosAPI
                .listar({ limite: 200, busca: busca || undefined, situacao: "ativo", congregacao_id: congregacaoId || undefined })
                .then((r) => r.data),
    });

    const gerarMut = useMutation({
        mutationFn: (id) => carteirasAPI.gerar(id),
        onSuccess: () => {
            toast.success("Carteira gerada!");
            qc.invalidateQueries({ queryKey: ["membros-carteiras"] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao gerar"),
    });

    const gerarLoteMut = useMutation({
        mutationFn: (ids) => carteirasAPI.gerarLote(ids),
        onSuccess: (res) => {
            toast.success(`${res.data.resultados?.filter((r) => !r.error).length} carteiras geradas!`);
            qc.invalidateQueries({ queryKey: ["membros-carteiras"] });
            setSelecionados([]);
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao gerar lote"),
    });

    const loteA4Mut = useMutation({
        mutationFn: (ids) => carteirasAPI.gerarLotePdf(ids),
        onSuccess: (res) => {
            const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = "carteiras-lote.pdf";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("PDF A4 com todas as carteiras baixado!");
            setSelecionados([]);
        },
        onError: () => toast.error("Erro ao gerar PDF A4"),
    });

    const toggleSel = (id) => setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const membros = data?.membros || [];

    return (
        <div className="space-y-5">
            {modalEntrega && <ModalEntrega membro={modalEntrega} onClose={() => setModalEntrega(null)} />}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Carteiras de Membro</h1>
                    <p className="page-subtitle">Gere e gerencie as carteirinhas em PDF com QR Code</p>
                </div>
                {selecionados.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => gerarLoteMut.mutate(selecionados)}
                            disabled={gerarLoteMut.isPending || loteA4Mut.isPending}
                            className="btn btn-secondary"
                        >
                            {gerarLoteMut.isPending ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            Gerar {selecionados.length} individual(is)
                        </button>
                        <button
                            onClick={() => loteA4Mut.mutate(selecionados)}
                            disabled={gerarLoteMut.isPending || loteA4Mut.isPending}
                            className="btn btn-primary"
                        >
                            {loteA4Mut.isPending ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Baixar A4 ({selecionados.length})
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="input pl-9 w-full" placeholder="Buscar membro..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
                <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                        className="input pl-9 pr-8 min-w-[220px]"
                        value={congregacaoId}
                        onChange={(e) => {
                            setCongregacaoId(e.target.value);
                            setSelecionados([]);
                        }}
                    >
                        <option value="">Todas as congregações</option>
                        <option value="sede">Igreja Sede</option>
                        {congregacoes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.nome}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="spinner" />
                    </div>
                ) : membros.length === 0 ? (
                    <div className="empty-state">
                        <CreditCard className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum membro encontrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="table-header">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded"
                                            onChange={(e) => setSelecionados(e.target.checked ? membros.map((m) => m.id) : [])}
                                            checked={selecionados.length === membros.length && membros.length > 0}
                                        />
                                    </th>
                                    {["Membro", "Nº", "Cargo", "Situação Carteira", "Ações"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {membros.map((m) => (
                                    <tr key={m.id} className="table-row">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded"
                                                checked={selecionados.includes(m.id)}
                                                onChange={() => toggleSel(m.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {m.foto_url ? (
                                                    <img src={m.foto_url} className="w-8 h-8 rounded-full object-cover" alt={m.nome_completo} />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                                        <span className="text-primary dark:text-primary-300 font-bold text-xs">
                                                            {m.nome_completo?.[0]}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">{m.nome_completo}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{m.numero_membro || "–"}</td>
                                        <td className="px-4 py-3 text-gray-500">{m.cargo || "–"}</td>
                                        <td className="px-4 py-3">
                                            {m.carteira_entregue ? (
                                                <div className="space-y-0.5">
                                                    <span className="badge badge-green flex items-center gap-1 w-fit">
                                                        <PackageCheck className="w-3 h-3" /> Entregue
                                                    </span>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                        {fmtData(m.carteira_entregue_em)} · {m.carteira_entregue_para}
                                                    </p>
                                                </div>
                                            ) : m.carteira_gerada ? (
                                                <span className="badge badge-yellow flex items-center gap-1 w-fit">
                                                    <Clock className="w-3 h-3" /> Gerada
                                                </span>
                                            ) : (
                                                <span className="badge badge-gray">Não gerada</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => gerarMut.mutate(m.id)}
                                                    disabled={gerarMut.isPending}
                                                    className="btn btn-secondary py-1 px-2.5 text-xs"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" /> {m.carteira_gerada ? "Regenerar" : "Gerar"}
                                                </button>
                                                {m.carteira_gerada && (
                                                    <button onClick={() => downloadCarteira(m)} className="btn btn-secondary py-1 px-2.5 text-xs">
                                                        <Download className="w-3.5 h-3.5" /> Baixar
                                                    </button>
                                                )}
                                                {m.carteira_gerada && !m.carteira_entregue && (
                                                    <button
                                                        onClick={() => setModalEntrega(m)}
                                                        className="btn btn-secondary py-1 px-2.5 text-xs text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30"
                                                    >
                                                        <PackageCheck className="w-3.5 h-3.5" /> Registrar entrega
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
