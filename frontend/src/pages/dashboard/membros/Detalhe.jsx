import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { membrosAPI, carteirasAPI } from "../../../services/api";
import { X, PackageCheck, Clock } from "lucide-react";

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
import { ArrowLeft, Pencil, CreditCard, Download, User, Phone, MapPin, Church, Users, Calendar } from "lucide-react";

// ─── Modal de Entrega ─────────────────────────────────────────────────────
function ModalEntrega({ membro, onClose, invalidateKey }) {
    const hoje = new Date().toISOString().split("T")[0];
    const [dataEntrega, setDataEntrega] = useState(hoje);
    const [entreguePara, setEntreguePara] = useState("");
    const qc = useQueryClient();

    const mut = useMutation({
        mutationFn: () => carteirasAPI.registrarEntrega(membro.id, { data_entrega: dataEntrega, entregue_para: entreguePara }),
        onSuccess: () => {
            toast.success("Entrega registrada com sucesso!");
            qc.invalidateQueries({ queryKey: ["membro", membro.id] });
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BADGE = { ativo: "badge-green", inativo: "badge-gray", transferido: "badge-blue", falecido: "badge-gray", disciplina: "badge-red" };

function InfoItem({ label, value }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
        </div>
    );
}

export default function MembroDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [modalEntrega, setModalEntrega] = useState(false);

    const { data: membro, isLoading } = useQuery({
        queryKey: ["membro", id],
        queryFn: () => membrosAPI.buscar(id).then((r) => r.data),
        staleTime: 0,
    });

    const baixarMut = useMutation({
        mutationFn: () => carteirasAPI.download(id),
        onSuccess: (res) =>
            downloadBlob(new Blob([res.data], { type: "application/pdf" }), `carteira-${membro?.nome_completo?.replace(/\s+/g, "_") ?? id}.pdf`),
        onError: () => toast.error("Erro ao baixar carteira"),
    });

    const gerarMut = useMutation({
        mutationFn: () => carteirasAPI.gerar(id),
        onSuccess: (res) => {
            toast.success("Carteira gerada!");
            qc.invalidateQueries({ queryKey: ["membro", id] });
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao gerar carteira"),
    });

    if (isLoading)
        return (
            <div className="flex justify-center py-20">
                <div className="spinner" />
            </div>
        );
    if (!membro) return <div className="text-center py-20 text-gray-400 dark:text-gray-600">Membro não encontrado</div>;

    const fmt = (d) => (d ? format(new Date(d + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "–");

    return (
        <div className="space-y-5">
            {modalEntrega && <ModalEntrega membro={membro} onClose={() => setModalEntrega(false)} />}
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="btn-ghost p-2 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="page-title">Detalhes do Membro</h1>
                </div>
                <div className="flex items-center gap-2">
                    {membro.carteira_url && (
                        <button onClick={() => baixarMut.mutate()} disabled={baixarMut.isPending} className="btn btn-secondary">
                            {baixarMut.isPending ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Baixar carteira
                        </button>
                    )}
                    <button onClick={() => gerarMut.mutate()} disabled={gerarMut.isPending} className="btn btn-secondary">
                        {gerarMut.isPending ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <CreditCard className="w-4 h-4" />
                        )}
                        {membro.carteira_gerada ? "Regenerar carteira" : "Gerar carteira"}
                    </button>
                    <Link to={`/dashboard/membros/${id}/editar`} className="btn btn-primary">
                        <Pencil className="w-4 h-4" /> Editar
                    </Link>
                </div>
            </div>

            {/* Card principal */}
            <div className="card">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                    {membro.foto_url ? (
                        <img
                            src={membro.foto_url}
                            alt={membro.nome_completo}
                            className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 border border-gray-100 shadow"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-12 h-12 text-primary/30" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{membro.nome_completo}</h2>
                                {membro.nome_social && <p className="text-gray-400 dark:text-gray-500 text-sm">({membro.nome_social})</p>}
                            </div>
                            <span className={`badge text-sm ${BADGE[membro.situacao] || "badge-gray"}`}>{membro.situacao}</span>
                        </div>
                        <p className="text-gray-500 mt-1">
                            {membro.cargo || "Membro"} · Nº {membro.numero_membro || "–"}
                            {membro.tipo_cadastro && <span className="ml-2 text-xs text-gray-400">({membro.tipo_cadastro})</span>}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                            {membro.celular && (
                                <span className="flex items-center gap-1.5">
                                    <Phone className="w-4 h-4" />
                                    {membro.celular}
                                </span>
                            )}
                            {membro.cidade && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />
                                    {membro.cidade}/{membro.estado}
                                </span>
                            )}
                            {membro.data_entrada_igreja && (
                                <span className="flex items-center gap-1.5">
                                    <Church className="w-4 h-4" />
                                    Membro desde {fmt(membro.data_entrada_igreja)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dados em grid */}
            <div className="grid lg:grid-cols-2 gap-5">
                {/* Dados Pessoais */}
                <div className="card space-y-4">
                    <h3 className="section-title">Dados Pessoais</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Data de Nascimento" value={fmt(membro.data_nascimento)} />
                        <InfoItem label="Sexo" value={membro.sexo} />
                        <InfoItem label="Estado Civil" value={membro.estado_civil} />
                        <InfoItem label="Nacionalidade" value={membro.nacionalidade} />
                        <InfoItem label="Outra Nacionalidade" value={membro.outra_nacionalidade} />
                        <InfoItem label="Cidade de Nascimento" value={membro.cidade_nascimento} />
                        <InfoItem label="Estado de Nascimento" value={membro.estado_nascimento} />
                        <InfoItem label="CPF" value={membro.cpf} />
                        <InfoItem label="RG" value={membro.rg ? `${membro.rg} ${membro.rg_orgao || ""} ${membro.rg_uf || ""}`.trim() : null} />
                        <InfoItem label="Título de Eleitor" value={membro.titulo_eleitor} />
                        <InfoItem label="Tipo Sanguíneo" value={membro.tipo_sangue} />
                        <InfoItem label="Doador de Sangue" value={membro.doador_sangue ? "Sim" : null} />
                    </div>
                </div>

                {/* Profissão / Educação */}
                <div className="card space-y-4">
                    <h3 className="section-title">Profissão e Educação</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Profissão" value={membro.profissao} />
                        <InfoItem label="Empresa / Local" value={membro.empresa_trabalho} />
                        <InfoItem label="Escolaridade" value={membro.escolaridade} />
                        <InfoItem label="Graduação" value={membro.graduacao} />
                    </div>
                </div>

                {/* Dados Eclesiásticos */}
                <div className="card space-y-4">
                    <h3 className="section-title">Dados Eclesiásticos</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Forma de Entrada" value={membro.forma_entrada} />
                        <InfoItem label="Data de Ingresso" value={fmt(membro.data_ingresso)} />
                        <InfoItem label="Data de Entrada" value={fmt(membro.data_entrada_igreja)} />
                        <InfoItem label="Congregação" value={membro.congregacao_nome || "Igreja sede"} />
                        <InfoItem label="Data de Conversão" value={fmt(membro.data_conversao)} />
                        <InfoItem label="Denominação de Origem" value={membro.denominacao_origem} />
                        <InfoItem label="Mudança de Denominação" value={fmt(membro.data_mudanca_denominacao)} />
                    </div>
                </div>

                {/* Batismo */}
                <div className="card space-y-4">
                    <h3 className="section-title">Batismo</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Batismo nas Águas" value={fmt(membro.data_batismo_agua || membro.data_batismo)} />
                        <InfoItem label="Cidade do Batismo" value={membro.cidade_batismo} />
                        <InfoItem label="Estado do Batismo" value={membro.estado_batismo} />
                        <InfoItem label="Ano Batismo Esp. Santo" value={membro.ano_batismo_espirito_santo?.toString()} />
                    </div>
                </div>

                {/* Cargos Ministeriais */}
                <div className="card space-y-4">
                    <h3 className="section-title">Cargos Ministeriais</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Cargo Principal" value={membro.cargo} />
                        {membro.auxiliar_trabalho ? (
                            <InfoItem label="Auxiliar de Trabalho" value={membro.auxiliar_trabalho_detalhes || "Sim"} />
                        ) : null}
                        {membro.diacono ? <InfoItem label="Diácono" value={membro.diacono_detalhes || "Sim"} /> : null}
                        {membro.presbitero ? <InfoItem label="Presbítero" value={membro.presbitero_detalhes || "Sim"} /> : null}
                        {membro.evangelista ? <InfoItem label="Evangelista" value={membro.evangelista_detalhes || "Sim"} /> : null}
                        {membro.pastor ? <InfoItem label="Pastor" value={membro.pastor_detalhes || "Sim"} /> : null}
                    </div>
                    {membro.departamentos?.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                                Departamentos
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {membro.departamentos.map((d) => (
                                    <span key={d} className="badge badge-blue text-xs">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Contato */}
                <div className="card space-y-4">
                    <h3 className="section-title">Contato</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Celular" value={membro.celular} />
                        <InfoItem label="Telefone" value={membro.telefone} />
                        <InfoItem label="WhatsApp" value={membro.whatsapp} />
                        <InfoItem label="E-mail" value={membro.email} />
                    </div>
                </div>

                {/* Endereço */}
                <div className="card space-y-4">
                    <h3 className="section-title">Endereço de Residência</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {membro.endereco_completo ? (
                            <InfoItem label="Endereço" value={membro.endereco_completo} />
                        ) : (
                            <>
                                <InfoItem label="Logradouro" value={membro.logradouro} />
                                <InfoItem label="Número" value={membro.numero} />
                                <InfoItem label="Bairro" value={membro.bairro} />
                                <InfoItem label="Complemento" value={membro.complemento} />
                            </>
                        )}
                        <InfoItem label="CEP" value={membro.cep} />
                        <InfoItem label="Cidade/Estado" value={membro.cidade ? `${membro.cidade}/${membro.estado}` : null} />
                    </div>
                </div>
            </div>

            {/* Família */}
            {(membro.nome_pai || membro.nome_mae || membro.nome_conjuge || membro.veio_outra_assembleia) && (
                <div className="card">
                    <h3 className="font-semibold font-semibold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700 mb-4">
                        Família
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <InfoItem label="Nome do Pai" value={membro.nome_pai} />
                        <InfoItem label="Nome da Mãe" value={membro.nome_mae} />
                        <InfoItem label="Cônjuge" value={membro.nome_conjuge} />
                        <InfoItem label="Data do Casamento" value={fmt(membro.data_casamento)} />
                        <InfoItem label="Certidão" value={membro.certidao_casamento} />
                        <InfoItem
                            label="Livro/Folha"
                            value={membro.livro_casamento ? `${membro.livro_casamento} / ${membro.folha_casamento || "–"}` : null}
                        />
                    </div>
                    {membro.veio_outra_assembleia ? (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-medium text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                                Transferência de Origem
                            </p>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <InfoItem label="Cidade de Origem" value={membro.cidade_origem} />
                                <InfoItem label="Estado de Origem" value={membro.estado_origem} />
                                <InfoItem label="Data de Mudança" value={fmt(membro.data_mudanca)} />
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Carteira de Membro */}
            <div className="card">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 mb-4">
                    <h3 className="section-title mb-0">Carteira de Membro</h3>
                    {membro.carteira_gerada && !membro.carteira_entregue && (
                        <button
                            onClick={() => setModalEntrega(true)}
                            className="btn btn-secondary py-1.5 px-3 text-xs text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30"
                        >
                            <PackageCheck className="w-3.5 h-3.5" /> Registrar entrega
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-6 items-start">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Situação</p>
                        {membro.carteira_entregue ? (
                            <span className="badge badge-green flex items-center gap-1 w-fit">
                                <PackageCheck className="w-3.5 h-3.5" /> Entregue
                            </span>
                        ) : membro.carteira_gerada ? (
                            <span className="badge badge-yellow flex items-center gap-1 w-fit">
                                <Clock className="w-3.5 h-3.5" /> Gerada — aguard. entrega
                            </span>
                        ) : (
                            <span className="badge badge-gray">Não gerada</span>
                        )}
                    </div>
                    {membro.carteira_gerada_em && (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Gerada em</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                {fmt(membro.carteira_gerada_em?.split(" ")[0] || membro.carteira_gerada_em)}
                            </p>
                        </div>
                    )}
                    {membro.carteira_entregue && (
                        <>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Data da entrega</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{fmt(membro.carteira_entregue_em)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Entregue a</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{membro.carteira_entregue_para}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Observações */}
            {membro.observacoes && (
                <div className="card">
                    <h3 className="font-semibold font-semibold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700 mb-3">
                        Observações
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">{membro.observacoes}</p>
                </div>
            )}
        </div>
    );
}
