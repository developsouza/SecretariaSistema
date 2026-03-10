import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardAPI } from "../../services/api";
import { BarChart3, Download, Filter } from "lucide-react";

const SITUACOES = ["ativo", "inativo", "transferido", "falecido", "disciplina"];
const SEXOS = ["masculino", "feminino"];
const ESTADOS_CIVIS = ["solteiro(a)", "casado(a)", "divorciado(a)", "viúvo(a)", "união estável"];

function exportCSV(membros) {
    const headers = [
        "Nº Rol",
        "Nome",
        "Celular",
        "Email",
        "Situação",
        "Cargo",
        "Tipo Cadastro",
        "Data Ingresso",
        "Entrada",
        "Nascimento",
        "Cidade Nascimento",
        "Estado Nascimento",
        "Cidade Residência",
        "Estado",
        "Sexo",
        "Estado Civil",
        "CPF",
        "RG",
        "Profissão",
        "Empresa",
        "Escolaridade",
        "Graduação",
        "Batismo Águas",
        "Ano Bat. Espírito Santo",
        "Cidade Batismo",
        "Denominação Origem",
        "Doador Sangue",
        "Tipo Sanguíneo",
        "Nome Pai",
        "Nome Mãe",
        "Cônjuge",
    ];
    const rows = membros.map((m) =>
        [
            m.numero_membro,
            m.nome_completo,
            m.celular,
            m.email,
            m.situacao,
            m.cargo,
            m.tipo_cadastro,
            m.data_ingresso,
            m.data_entrada_igreja,
            m.data_nascimento,
            m.cidade_nascimento,
            m.estado_nascimento,
            m.cidade,
            m.estado,
            m.sexo,
            m.estado_civil,
            m.cpf,
            m.rg,
            m.profissao,
            m.empresa_trabalho,
            m.escolaridade,
            m.graduacao,
            m.data_batismo_agua || m.data_batismo,
            m.ano_batismo_espirito_santo,
            m.cidade_batismo,
            m.denominacao_origem,
            m.doador_sangue ? "Sim" : "Não",
            m.tipo_sangue,
            m.nome_pai,
            m.nome_mae,
            m.nome_conjuge,
        ].map((v) => `"${v || ""}"`.replace(/\n/g, " ")),
    );

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-membros-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
}

export default function RelatoriosPage() {
    const [filtros, setFiltros] = useState({ situacao: "ativo", sexo: "", estado_civil: "", cargo: "", de: "", ate: "" });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["relatorio", filtros],
        queryFn: () => dashboardAPI.relatorio(Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))).then((r) => r.data),
    });

    const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

    return (
        <div className="space-y-5">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Relatórios</h1>
                    <p className="page-subtitle">{data?.total || 0} resultado(s)</p>
                </div>
                {data?.membros?.length > 0 && (
                    <button onClick={() => exportCSV(data.membros)} className="btn btn-secondary">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="card space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">Filtros</span>
                </div>
                <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="label">Situação</label>
                        <select className="input" value={filtros.situacao} onChange={(e) => set("situacao", e.target.value)}>
                            <option value="">Todos</option>
                            {SITUACOES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Sexo</label>
                        <select className="input" value={filtros.sexo} onChange={(e) => set("sexo", e.target.value)}>
                            <option value="">Todos</option>
                            {SEXOS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Estado civil</label>
                        <select className="input" value={filtros.estado_civil} onChange={(e) => set("estado_civil", e.target.value)}>
                            <option value="">Todos</option>
                            {ESTADOS_CIVIS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Cargo</label>
                        <input className="input" placeholder="Ex: Pastor" value={filtros.cargo} onChange={(e) => set("cargo", e.target.value)} />
                    </div>
                    <div>
                        <label className="label">Entrada de</label>
                        <input type="date" className="input" value={filtros.de} onChange={(e) => set("de", e.target.value)} />
                    </div>
                    <div>
                        <label className="label">Entrada até</label>
                        <input type="date" className="input" value={filtros.ate} onChange={(e) => set("ate", e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="spinner" />
                    </div>
                ) : !data?.membros?.length ? (
                    <div className="empty-state">
                        <BarChart3 className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros acima</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="table-header">
                                <tr>
                                    {["Nº", "Nome", "Situação", "Cargo", "Celular", "Cidade", "Entrada", "Sexo", "Nasc."].map((h) => (
                                        <th
                                            key={h}
                                            className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {data.membros.map((m, i) => (
                                    <tr key={i} className="table-row">
                                        <td className="px-3 py-2.5 text-gray-400 dark:text-gray-500 text-xs">{m.numero_membro || "–"}</td>
                                        <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{m.nome_completo}</td>
                                        <td className="px-3 py-2.5">
                                            <span className={`badge ${m.situacao === "ativo" ? "badge-green" : "badge-gray"}`}>{m.situacao}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{m.cargo || "–"}</td>
                                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.celular}</td>
                                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {m.cidade ? `${m.cidade}/${m.estado}` : "–"}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {m.data_entrada_igreja ? new Date(m.data_entrada_igreja + "T12:00:00").toLocaleDateString("pt-BR") : "–"}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 capitalize">{m.sexo || "–"}</td>
                                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {m.data_nascimento ? new Date(m.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "–"}
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
