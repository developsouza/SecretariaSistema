import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardAPI } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { ChevronLeft, ChevronRight, Cake, Phone, PartyPopper, Mail } from "lucide-react";
import { parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Mensagem de aniversário predefinida ───────────────────────────────────
function gerarMensagemAniversario(nomeCompleto, nomeIgreja) {
    const primeiroNome = nomeCompleto?.split(" ")[0] || nomeCompleto;
    return `*Feliz Aniversário, ${primeiroNome}!*\n\n${nomeIgreja} louva a Deus por sua vida neste dia tão especial. Somos gratos ao Senhor por sua dedicação, comunhão e fidelidade na obra. Que esta nova etapa seja marcada por crescimento espiritual, saúde, paz e muitas conquistas em Cristo.\n\n_"Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais."_\n_(Jeremias 29:11)_\n\nQue o Senhor continue dirigindo seus passos e fortalecendo sua fé a cada dia.\n\nReceba nosso carinho e nossas orações.\nDeus abençoe ricamente sua vida!`;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDiasNoMes(ano, mes) {
    return new Date(ano, mes, 0).getDate(); // mes = 1-12
}

function getPrimeiroDiaSemana(ano, mes) {
    return new Date(ano, mes - 1, 1).getDay(); // 0=dom
}

function fmtNasc(dataIso) {
    if (!dataIso) return "";
    const partes = dataIso.split("-");
    if (partes.length < 3) return dataIso;
    return `${partes[2]}/${partes[1]}`;
}

function calcularIdade(dataIso) {
    if (!dataIso) return null;
    const hoje = new Date();
    const nasc = parseISO(dataIso);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNasc = nasc.getMonth();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
}

export default function CalendarioAniversariantes({ mes: mesProp, ano: anoProp, onNavMes }) {
    const agora = new Date();
    // Modo autônomo (sem props) ou controlado (com props vindas do pai)
    const [mesInterno, setMesInterno] = useState(agora.getMonth() + 1);
    const [anoInterno, setAnoInterno] = useState(agora.getFullYear());

    const isControlado = mesProp !== undefined && anoProp !== undefined;
    const mes = isControlado ? mesProp : mesInterno;
    const ano = isControlado ? anoProp : anoInterno;

    const navMes = (delta) => {
        if (isControlado) {
            onNavMes?.(delta);
        } else {
            let novoMes = mesInterno + delta;
            let novoAno = anoInterno;
            if (novoMes > 12) {
                novoMes = 1;
                novoAno++;
            }
            if (novoMes < 1) {
                novoMes = 12;
                novoAno--;
            }
            setMesInterno(novoMes);
            setAnoInterno(novoAno);
            setDiaSelecionado(null);
        }
    };

    const [diaSelecionado, setDiaSelecionado] = useState(null);
    const { usuario } = useAuth();
    const nomeIgreja = usuario?.igreja?.nome || "Nossa Igreja";

    // Reseta seleção ao trocar de mês
    useEffect(() => {
        setDiaSelecionado(null);
    }, [mes, ano]);

    const { data, isLoading } = useQuery({
        queryKey: ["aniversariantes", ano, mes],
        queryFn: () => dashboardAPI.aniversariantes(mes).then((r) => r.data),
    });

    const aniversariantes = data?.aniversariantes || [];
    const hoje = data?.hoje || [];
    const proximos = data?.proximos || [];

    // Mapeia dia -> membros
    const porDia = {};
    aniversariantes.forEach((m) => {
        const dia = parseInt(m.dia);
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(m);
    });

    const totalDias = getDiasNoMes(ano, mes);
    const primeiroDia = getPrimeiroDiaSemana(ano, mes); // 0=dom
    const cells = Array(primeiroDia)
        .fill(null)
        .concat(Array.from({ length: totalDias }, (_, i) => i + 1));
    // Completa para múltiplo de 7
    while (cells.length % 7 !== 0) cells.push(null);

    const membrosDiaSelecionado = diaSelecionado ? porDia[diaSelecionado] || [] : [];
    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();
    const diaAtual = agora.getDate();
    const ehMesAtual = mes === mesAtual && ano === anoAtual;

    // Monta lista do painel direito
    const painelMembros = diaSelecionado ? membrosDiaSelecionado : proximos;
    const painelTitulo = diaSelecionado
        ? `Dia ${diaSelecionado} — ${membrosDiaSelecionado.length} aniversariante${membrosDiaSelecionado.length !== 1 ? "s" : ""}`
        : ehMesAtual && proximos.length > 0
          ? "Próximos 7 dias"
          : `${MESES[mes - 1]} — ${aniversariantes.length} aniversariante${aniversariantes.length !== 1 ? "s" : ""}`;
    const painelLista = diaSelecionado ? membrosDiaSelecionado : ehMesAtual && proximos.length > 0 ? proximos : aniversariantes;

    return (
        <div className="card">
            {/* Título */}
            <div className="flex items-center gap-2 mb-4">
                <Cake className="w-5 h-5 text-pink-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Calendário de Aniversariantes</h3>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="spinner-sm" />
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row lg:gap-6">
                    {/* ── COLUNA ESQUERDA: grade ────────────────────────── */}
                    <div className="flex-1 min-w-0">
                        {/* Navegação de mês */}
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={() => navMes(-1)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {MESES[mes - 1]} {ano}
                            </span>
                            <button
                                onClick={() => navMes(1)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Grade */}
                        <div className="grid grid-cols-7 gap-0.5">
                            {SEMANA.map((s) => (
                                <div key={s} className="text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 py-1">
                                    {s}
                                </div>
                            ))}
                            {cells.map((dia, idx) => {
                                if (!dia) return <div key={`empty-${idx}`} />;
                                const temAniv = porDia[dia] && porDia[dia].length > 0;
                                const eHoje = ehMesAtual && dia === diaAtual;
                                const selecionado = diaSelecionado === dia;
                                return (
                                    <button
                                        key={dia}
                                        onClick={() => setDiaSelecionado(selecionado ? null : temAniv ? dia : null)}
                                        className={`
                                            relative h-11 flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all
                                            ${eHoje ? "bg-primary text-white font-bold shadow-glow-sm" : ""}
                                            ${temAniv && !eHoje ? "bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300" : ""}
                                            ${selecionado ? "ring-2 ring-pink-400" : ""}
                                            ${!temAniv && !eHoje ? "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" : ""}
                                            ${temAniv ? "cursor-pointer" : "cursor-default"}
                                        `}
                                    >
                                        {dia}
                                        {temAniv && <span className="w-1 h-1 rounded-full bg-pink-500 mt-0.5" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legenda */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-pink-100 dark:bg-pink-500/15 inline-block" /> Aniversariante
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-primary inline-block" /> Hoje
                            </span>
                        </div>
                    </div>

                    {/* ── DIVISOR (só desktop) ──────────────────────────── */}
                    <div className="hidden lg:block w-px bg-gray-100 dark:bg-gray-700/50 self-stretch" />

                    {/* ── COLUNA DIREITA: detalhes ──────────────────────── */}
                    <div className="flex-1 min-w-0 mt-4 lg:mt-0 flex flex-col">
                        {/* Banner aniversariantes hoje */}
                        {ehMesAtual && hoje.length > 0 && (
                            <div className="mb-3 p-3 rounded-xl bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 flex items-start gap-2">
                                <PartyPopper className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-pink-700 dark:text-pink-400">
                                        🎉 {hoje.length === 1 ? "Aniversariante hoje:" : `${hoje.length} aniversariantes hoje:`}
                                    </p>
                                    <p className="text-xs text-pink-600 dark:text-pink-300 mt-0.5">{hoje.map((m) => m.nome_completo).join(", ")}</p>
                                </div>
                            </div>
                        )}

                        {/* Título do painel */}
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{painelTitulo}</p>

                        {/* Lista */}
                        {painelLista.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                                <Cake className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-sm">Nenhum aniversariante</p>
                            </div>
                        ) : (
                            <div className="space-y-2 overflow-y-auto flex-1 max-h-[360px] pr-1">
                                {painelLista.map((m) => {
                                    const idade = calcularIdade(m.data_nascimento);
                                    return (
                                        <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                                            {m.foto_url ? (
                                                <img
                                                    src={m.foto_url}
                                                    alt={m.nome_completo}
                                                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-pink-600 dark:text-pink-300 font-bold text-sm">{m.nome_completo?.[0]}</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.nome_completo}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                    {diaSelecionado
                                                        ? `${m.cargo || "Membro"}${idade !== null ? ` · ${idade + 1} anos` : ""}`
                                                        : `dia ${m.dia_mes?.split("-")[1] ?? m.dia} · ${m.cargo || "Membro"}`}
                                                </p>
                                            </div>
                                            {diaSelecionado && (
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {m.celular && (
                                                        <a
                                                            href={`https://wa.me/55${m.celular.replace(/\D/g, "")}?text=${encodeURIComponent(gerarMensagemAniversario(m.nome_completo, nomeIgreja))}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                                            title="Enviar parabéns pelo WhatsApp"
                                                        >
                                                            <Phone className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    {m.email && (
                                                        <a
                                                            href={`mailto:${m.email}?subject=${encodeURIComponent(`Feliz Aniversario, ${m.nome_completo.split(" ")[0]}! | ${nomeIgreja}`)}&body=${encodeURIComponent(gerarMensagemAniversario(m.nome_completo, nomeIgreja))}`}
                                                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                                            title="Enviar parabéns por e-mail"
                                                        >
                                                            <Mail className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
