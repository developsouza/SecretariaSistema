import { useState, useEffect, useCallback, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    Pencil,
    X,
    Calendar,
    Clock,
    MapPin,
    AlignLeft,
    MessageCircle,
    Send,
    CalendarDays,
    BookOpen,
    Church,
    ExternalLink,
    Download,
    Share2,
    CheckCircle,
    XCircle,
    Users,
    Bell,
    MessageSquare,
    List,
} from "lucide-react";
import api from "../../services/api";
import clsx from "clsx";
import { useAuth } from "../../hooks/useAuth";
import RecursoBloqueado from "../../components/RecursoBloqueado";

// ─── Constantes ────────────────────────────────────────────────────────────
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CORES_PASTORAL = [
    { value: "#1a56db", label: "Azul" },
    { value: "#7c3aed", label: "Roxo" },
    { value: "#059669", label: "Verde" },
    { value: "#dc2626", label: "Vermelho" },
    { value: "#d97706", label: "Laranja" },
    { value: "#0891b2", label: "Ciano" },
];

const CORES_EVENTO = [
    { value: "#1a56db", label: "Azul" },
    { value: "#059669", label: "Verde" },
    { value: "#dc2626", label: "Vermelho" },
    { value: "#d97706", label: "Laranja" },
    { value: "#7c3aed", label: "Roxo" },
    { value: "#db2777", label: "Rosa" },
    { value: "#0891b2", label: "Ciano" },
    { value: "#374151", label: "Cinza" },
];

const FORM_INICIAL = {
    titulo: "",
    descricao: "",
    local: "",
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
    cor: "#1a56db",
    dia_todo: false,
    recorrente: false,
    recorrencia: "",
};

// ─── Helpers de data ────────────────────────────────────────────────────────
function diasNoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
}

function primeiroDiaMes(ano, mes) {
    return new Date(ano, mes, 1).getDay();
}

function padZero(n) {
    return String(n).padStart(2, "0");
}

function formatarDataBR(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
}

function formatarDataHoraBR(isoDate, hora) {
    if (!isoDate) return "";
    const dateStr = formatarDataBR(isoDate);
    return hora ? `${dateStr} às ${hora}` : dateStr;
}

function gerarUrlGoogleCalendar(evento) {
    const pad = (n) => String(n).padStart(2, "0");
    let datesParam;
    if (evento.dia_todo) {
        const inicio = evento.data_inicio.replace(/-/g, "");
        const dataFim = evento.data_fim || evento.data_inicio;
        const fim = new Date(dataFim + "T12:00:00");
        fim.setDate(fim.getDate() + 1);
        const fimStr = `${fim.getFullYear()}${pad(fim.getMonth() + 1)}${pad(fim.getDate())}`;
        datesParam = `${inicio}/${fimStr}`;
    } else {
        const inicioDate = evento.data_inicio.replace(/-/g, "");
        const inicioHora = (evento.hora_inicio || "00:00").replace(":", "");
        const dataFim = evento.data_fim || evento.data_inicio;
        const fimDate = dataFim.replace(/-/g, "");
        const fimHora = (evento.hora_fim || evento.hora_inicio || "00:00").replace(":", "");
        datesParam = `${inicioDate}T${inicioHora}00/${fimDate}T${fimHora}00`;
    }
    const params = new URLSearchParams({
        text: evento.titulo,
        dates: datesParam,
        ctz: "America/Sao_Paulo",
    });
    if (evento.descricao) params.set("details", evento.descricao);
    if (evento.local) params.set("location", evento.local);
    return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}

// ─── Componente Modal de evento ─────────────────────────────────────────────
function EventoModal({ tipo, evento, onClose, onSaved }) {
    const [form, setForm] = useState(
        evento
            ? { ...evento, dia_todo: !!evento.dia_todo, recorrente: !!evento.recorrente }
            : { ...FORM_INICIAL, cor: tipo === "pastoral" ? "#7c3aed" : "#1a56db" },
    );
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    const cores = tipo === "pastoral" ? CORES_PASTORAL : CORES_EVENTO;

    function set(campo, valor) {
        setForm((f) => ({ ...f, [campo]: valor }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.titulo.trim()) return setErro("Título obrigatório");
        if (!form.data_inicio) return setErro("Data de início obrigatória");
        setErro("");
        setSalvando(true);
        try {
            const payload = { ...form, tipo };
            if (evento?.id) {
                await api.put(`/agenda/${evento.id}`, payload);
            } else {
                await api.post("/agenda", payload);
            }
            onSaved();
        } catch (err) {
            setErro(err.response?.data?.error || "Erro ao salvar evento");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: form.cor }}>
                    <h2 className="text-white font-semibold text-lg">
                        {evento?.id ? "Editar" : "Novo"} {tipo === "pastoral" ? "Compromisso Pastoral" : "Evento"}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Cor */}
                    <div>
                        <label className="label">Cor</label>
                        <div className="flex gap-2 flex-wrap">
                            {cores.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => set("cor", c.value)}
                                    className={clsx(
                                        "w-7 h-7 rounded-full border-2 transition-transform",
                                        form.cor === c.value ? "border-gray-700 dark:border-white scale-125" : "border-transparent",
                                    )}
                                    style={{ background: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Título */}
                    <div>
                        <label className="label">
                            <Calendar className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                            Título *
                        </label>
                        <input
                            type="text"
                            value={form.titulo}
                            onChange={(e) => set("titulo", e.target.value)}
                            placeholder={tipo === "pastoral" ? "Ex: Reunião de pastores" : "Ex: Culto de aniversário"}
                            className="input"
                        />
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="label">
                            <AlignLeft className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                            Descrição
                        </label>
                        <textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={2} className="input resize-none" />
                    </div>

                    {/* Local */}
                    <div>
                        <label className="label">
                            <MapPin className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                            Local
                        </label>
                        <input type="text" value={form.local} onChange={(e) => set("local", e.target.value)} className="input" />
                    </div>

                    {/* Dia todo */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                            className={clsx(
                                "w-10 h-5 rounded-full transition-colors relative",
                                form.dia_todo ? "bg-primary" : "bg-gray-300 dark:bg-gray-600",
                            )}
                            onClick={() => set("dia_todo", !form.dia_todo)}
                        >
                            <div
                                className={clsx(
                                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                                    form.dia_todo ? "translate-x-5" : "translate-x-0",
                                )}
                            />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Dia todo</span>
                    </label>

                    {/* Datas e horários */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Data Início *</label>
                            <input
                                type="date"
                                value={form.data_inicio}
                                onChange={(e) => set("data_inicio", e.target.value)}
                                className="input dark:[color-scheme:dark]"
                            />
                        </div>
                        {!form.dia_todo && (
                            <div>
                                <label className="label">
                                    <Clock className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                                    Hora Início
                                </label>
                                <input
                                    type="time"
                                    value={form.hora_inicio}
                                    onChange={(e) => set("hora_inicio", e.target.value)}
                                    className="input dark:[color-scheme:dark]"
                                />
                            </div>
                        )}
                        <div>
                            <label className="label">Data Fim</label>
                            <input
                                type="date"
                                value={form.data_fim}
                                onChange={(e) => set("data_fim", e.target.value)}
                                min={form.data_inicio}
                                className="input dark:[color-scheme:dark]"
                            />
                        </div>
                        {!form.dia_todo && (
                            <div>
                                <label className="label">
                                    <Clock className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                                    Hora Fim
                                </label>
                                <input
                                    type="time"
                                    value={form.hora_fim}
                                    onChange={(e) => set("hora_fim", e.target.value)}
                                    className="input dark:[color-scheme:dark]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Recorrência */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                            className={clsx(
                                "w-10 h-5 rounded-full transition-colors relative",
                                form.recorrente ? "bg-primary" : "bg-gray-300 dark:bg-gray-600",
                            )}
                            onClick={() => set("recorrente", !form.recorrente)}
                        >
                            <div
                                className={clsx(
                                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                                    form.recorrente ? "translate-x-5" : "translate-x-0",
                                )}
                            />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Evento recorrente</span>
                    </label>

                    {form.recorrente && (
                        <select value={form.recorrencia} onChange={(e) => set("recorrencia", e.target.value)} className="input">
                            <option value="">Selecione a recorrência</option>
                            <option value="semanal">Semanal</option>
                            <option value="mensal">Mensal</option>
                            <option value="anual">Anual</option>
                        </select>
                    )}

                    {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando}
                            className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
                            style={{ background: form.cor }}
                        >
                            {salvando ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Componente de detalhe do evento ─────────────────────────────────────────
function EventoDetalheModal({ evento, tipo, onClose, onEditar, onExcluir }) {
    const [excluindo, setExcluindo] = useState(false);
    const [enviandoWpp, setEnviandoWpp] = useState(false);
    const [errWpp, setErrWpp] = useState("");

    async function handleExcluir() {
        if (!confirm("Excluir este evento?")) return;
        setExcluindo(true);
        try {
            await api.delete(`/agenda/${evento.id}`);
            onExcluir();
        } finally {
            setExcluindo(false);
        }
    }

    async function handleWhatsApp(periodo) {
        setEnviandoWpp(true);
        setErrWpp("");
        try {
            const res = await api.post("/agenda/pastoral/enviar-whatsapp", { periodo });
            window.open(res.data.url, "_blank");
        } catch (err) {
            setErrWpp(err.response?.data?.error || "Erro ao gerar mensagem WhatsApp");
        } finally {
            setEnviandoWpp(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: evento.cor || "#1a56db" }}>
                    <h2 className="text-white font-semibold text-lg truncate pr-4">{evento.titulo}</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white flex-shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>
                            {formatarDataHoraBR(evento.data_inicio, evento.dia_todo ? null : evento.hora_inicio)}
                            {evento.hora_fim && !evento.dia_todo ? ` – ${evento.hora_fim}` : ""}
                            {evento.data_fim && evento.data_fim !== evento.data_inicio ? ` até ${formatarDataBR(evento.data_fim)}` : ""}
                            {evento.dia_todo && <span className="ml-1 text-xs text-gray-400">(Dia todo)</span>}
                        </span>
                    </div>
                    {evento.local && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span>{evento.local}</span>
                        </div>
                    )}
                    {evento.descricao && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <AlignLeft className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{evento.descricao}</span>
                        </div>
                    )}
                    {!!evento.recorrente && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CalendarDays className="w-4 h-4 flex-shrink-0" />
                            <span>Recorrência {evento.recorrencia}</span>
                        </div>
                    )}
                    {evento.criado_por_nome && <p className="text-xs text-gray-400 dark:text-gray-500">Criado por {evento.criado_por_nome}</p>}

                    {/* Botões WhatsApp — apenas agenda pastoral */}
                    {tipo === "pastoral" && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                <MessageCircle className="w-3.5 h-3.5 inline mr-1" />
                                Enviar ao Pastor via WhatsApp
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleWhatsApp("amanha")}
                                    disabled={enviandoWpp}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    Agenda de amanhã
                                </button>
                                <button
                                    onClick={() => handleWhatsApp("semana")}
                                    disabled={enviandoWpp}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60"
                                >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    Agenda da semana
                                </button>
                            </div>
                            {errWpp && <p className="text-xs text-red-500 mt-1">{errWpp}</p>}
                        </div>
                    )}

                    {/* Botão Google Calendar */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <a
                            href={gerarUrlGoogleCalendar(evento)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Adicionar ao Google Calendar
                        </a>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleExcluir}
                            disabled={excluindo}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                        >
                            <Trash2 className="w-4 h-4" />
                            {excluindo ? "Excluindo..." : "Excluir"}
                        </button>
                        <button
                            onClick={onEditar}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                            style={{ background: evento.cor || "#1a56db" }}
                        >
                            <Pencil className="w-4 h-4" />
                            Editar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Componente calendário ──────────────────────────────────────────────────
function Calendario({ ano, mes, eventos, onDiaClick, onPrevMes, onProxMes }) {
    const total = diasNoMes(ano, mes);
    const primeiroDia = primeiroDiaMes(ano, mes);
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${padZero(hoje.getMonth() + 1)}-${padZero(hoje.getDate())}`;

    const eventosMap = {};
    eventos.forEach((e) => {
        if (!eventosMap[e.data_inicio]) eventosMap[e.data_inicio] = [];
        eventosMap[e.data_inicio].push(e);
    });

    const cells = [];
    for (let i = 0; i < primeiroDia; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Cabeçalho do calendário */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <button
                    onClick={onPrevMes}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {MESES[mes]} {ano}
                </h3>
                <button
                    onClick={onProxMes}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
                {DIAS_SEMANA.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2">
                        {d}
                    </div>
                ))}
            </div>

            {/* Células */}
            <div className="grid grid-cols-7">
                {cells.map((dia, i) => {
                    if (!dia)
                        return <div key={`empty-${i}`} className="h-16 border-r border-b border-gray-50 dark:border-gray-700/50 last:border-r-0" />;
                    const dataStr = `${ano}-${padZero(mes + 1)}-${padZero(dia)}`;
                    const eventosDia = eventosMap[dataStr] || [];
                    const isHoje = dataStr === hojeStr;

                    return (
                        <div
                            key={dia}
                            onClick={() => onDiaClick(dataStr, dia)}
                            className={clsx(
                                "h-16 border-r border-b border-gray-50 dark:border-gray-700/50 last:border-r-0 p-1 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 relative",
                                (i + 1) % 7 === 0 && "border-r-0",
                            )}
                        >
                            <span
                                className={clsx(
                                    "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                                    isHoje ? "bg-primary text-white" : "text-gray-700 dark:text-gray-300",
                                )}
                            >
                                {dia}
                            </span>
                            <div className="mt-0.5 space-y-0.5 overflow-hidden">
                                {eventosDia.slice(0, 2).map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="truncate text-[10px] leading-4 px-1 rounded text-white font-medium"
                                        style={{ background: ev.cor || "#1a56db" }}
                                    >
                                        {ev.titulo}
                                    </div>
                                ))}
                                {eventosDia.length > 2 && (
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">+{eventosDia.length - 2}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Painel lateral — lista de eventos ─────────────────────────────────────
function ListaEventos({ eventos, diaSelecionado, tipo, onEventoClick, onNovoEventoDia }) {
    const eventosParaExibir = diaSelecionado
        ? eventos.filter((e) => e.data_inicio === diaSelecionado)
        : [...eventos]
              .sort((a, b) => {
                  if (a.data_inicio !== b.data_inicio) return a.data_inicio.localeCompare(b.data_inicio);
                  return (a.hora_inicio || "").localeCompare(b.hora_inicio || "");
              })
              .slice(0, 20);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {diaSelecionado
                        ? `${new Date(diaSelecionado + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`
                        : "Próximos eventos"}
                </h3>
                {diaSelecionado && (
                    <button
                        onClick={() => onNovoEventoDia(diaSelecionado)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Novo
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                {eventosParaExibir.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                        <CalendarDays className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">{diaSelecionado ? "Nenhum evento neste dia" : "Nenhum evento cadastrado"}</p>
                    </div>
                ) : (
                    eventosParaExibir.map((ev) => (
                        <button
                            key={ev.id}
                            onClick={() => onEventoClick(ev)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: ev.cor || "#1a56db" }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{ev.titulo}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        {!diaSelecionado && <span>{formatarDataBR(ev.data_inicio)} · </span>}
                                        {ev.dia_todo
                                            ? "Dia todo"
                                            : ev.hora_inicio
                                              ? `${ev.hora_inicio}${ev.hora_fim ? ` – ${ev.hora_fim}` : ""}`
                                              : "Sem horário"}
                                    </p>
                                    {ev.local && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">📍 {ev.local}</p>}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Painel de Solicitações de Agendamento ───────────────────────────────────
function SolicitacoesPanel({ igrejaSlug }) {
    const [filtro, setFiltro] = useState("pendente");
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [processando, setProcessando] = useState(null);
    const [modalReprovar, setModalReprovar] = useState(null); // solicitação selecionada para reprovar
    const [motivo, setMotivo] = useState("");
    const [whatsappUrl, setWhatsappUrl] = useState(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const res = await api.get(`/agenda/solicitacoes?status=${filtro}`);
            setSolicitacoes(res.data.solicitacoes || []);
        } catch {
            setSolicitacoes([]);
        } finally {
            setCarregando(false);
        }
    }, [filtro]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    async function handleAprovar(id) {
        if (!confirm("Aprovar esta solicitação e adicionar o evento à agenda?")) return;
        setProcessando(id);
        try {
            await api.patch(`/agenda/solicitacoes/${id}/aprovar`);
            carregar();
        } catch (err) {
            alert(err.response?.data?.error || "Erro ao aprovar solicitação");
        } finally {
            setProcessando(null);
        }
    }

    async function confirmarReprovar() {
        if (!modalReprovar) return;
        setProcessando(modalReprovar.id);
        try {
            const res = await api.patch(`/agenda/solicitacoes/${modalReprovar.id}/reprovar`, { motivo });
            setModalReprovar(null);
            setMotivo("");
            if (res.data.whatsapp_url) setWhatsappUrl(res.data.whatsapp_url);
            carregar();
        } catch (err) {
            alert(err.response?.data?.error || "Erro ao reprovar solicitação");
        } finally {
            setProcessando(null);
        }
    }

    const filtros = [
        { key: "pendente", label: "Pendentes", cor: "text-amber-600 bg-amber-50 border-amber-200" },
        { key: "aprovado", label: "Aprovados", cor: "text-emerald-600 bg-emerald-50 border-emerald-200" },
        { key: "reprovado", label: "Reprovados", cor: "text-red-600 bg-red-50 border-red-200" },
    ];

    return (
        <div className="space-y-4">
            {/* Filtros de status */}
            <div className="flex gap-2 flex-wrap">
                {filtros.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFiltro(f.key)}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            filtro === f.key ? f.cor : "text-gray-500 bg-white border-gray-200 hover:border-gray-300",
                        )}
                    >
                        {f.label}
                    </button>
                ))}

                {/* Link para página pública */}
                {igrejaSlug && (
                    <a
                        href={`/agenda/${igrejaSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver agenda pública
                    </a>
                )}
            </div>

            {/* Lista */}
            {carregando ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : solicitacoes.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma solicitação {filtro}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                        {filtro === "pendente" ? "Nenhuma nova solicitação de agendamento." : `Nenhum registro ${filtro}.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {solicitacoes.map((s) => (
                        <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{s.titulo}</h4>
                                        {s.status === "pendente" && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                Pendente
                                            </span>
                                        )}
                                        {s.status === "aprovado" && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                Aprovado
                                            </span>
                                        )}
                                        {s.status === "reprovado" && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                                Reprovado
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {s.data_inicio?.split("-").reverse().join("/")}
                                            {s.hora_inicio ? ` às ${s.hora_inicio}` : ""}
                                        </span>
                                        {s.local && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {s.local}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {s.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.descricao}</p>}

                            {/* Dados do solicitante */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Solicitante</p>
                                <p>
                                    <span className="text-gray-400">Nome: </span>
                                    {s.nome}
                                </p>
                                <p>
                                    <span className="text-gray-400">Celular: </span>
                                    {s.celular}
                                    {s.whatsapp && s.whatsapp !== s.celular ? ` · WhatsApp: ${s.whatsapp}` : ""}
                                </p>
                                {s.email && (
                                    <p>
                                        <span className="text-gray-400">E-mail: </span>
                                        {s.email}
                                    </p>
                                )}
                                <p className="text-gray-400 text-[10px] mt-1">
                                    Recebida em {new Date(s.created_at).toLocaleDateString("pt-BR")} às{" "}
                                    {new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>

                            {/* Motivo de reprovação (se houver) */}
                            {s.status === "reprovado" && s.motivo_reprovacao && (
                                <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300">
                                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Motivo:</strong> {s.motivo_reprovacao}
                                    </span>
                                </div>
                            )}

                            {/* Ações (apenas pendentes) */}
                            {s.status === "pendente" && (
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => handleAprovar(s.id)}
                                        disabled={processando === s.id}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        {processando === s.id ? "Processando..." : "Aprovar"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalReprovar(s);
                                            setMotivo("");
                                        }}
                                        disabled={processando === s.id}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Reprovar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de reprovação */}
            {modalReprovar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Reprovar Solicitação</h3>
                            <button onClick={() => setModalReprovar(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300">
                                <p className="font-semibold">{modalReprovar.titulo}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {modalReprovar.data_inicio?.split("-").reverse().join("/")} · {modalReprovar.nome}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                    Motivo da reprovação (opcional)
                                </label>
                                <textarea
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    rows={3}
                                    placeholder="Ex: Data indisponível no calendário da igreja..."
                                    className="input resize-none text-sm"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {modalReprovar.email
                                        ? "Um e-mail será enviado automaticamente ao solicitante."
                                        : "O solicitante não tem e-mail cadastrado."}{" "}
                                    Você também poderá enviar uma mensagem via WhatsApp.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setModalReprovar(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmarReprovar}
                                    disabled={processando === modalReprovar.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                                >
                                    <XCircle className="w-4 h-4" />
                                    {processando === modalReprovar.id ? "Reprovando..." : "Confirmar Reprovação"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal pós-reprovação: link WhatsApp */}
            {whatsappUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                            <MessageCircle className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Solicitação reprovada</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                Deseja enviar uma mensagem via WhatsApp informando o solicitante sobre a reprovação?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setWhatsappUrl(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Não
                            </button>
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setWhatsappUrl(null)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                            >
                                <Send className="w-4 h-4" />
                                Enviar WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
const CARD_ACCENTS = {
    blue: "from-blue-400/80 to-blue-300/60",
    purple: "from-purple-400/80 to-purple-300/60",
    emerald: "from-emerald-400/80 to-emerald-300/60",
    amber: "from-amber-400/80 to-amber-300/60",
};

function StatCardAgenda({ icon: Icon, label, value, sub, color = "blue" }) {
    const iconColors = {
        blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
        purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
        emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
    return (
        <div className="card-stat flex items-center gap-4 relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r ${CARD_ACCENTS[color]}`} />
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${iconColors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 pt-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
                {sub && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function AgendaPage() {
    const { usuario, loading: authLoading } = useAuth();
    const temAgenda = !!usuario?.igreja?.plano_recursos?.agenda;
    const temAgendaPublica = !!usuario?.igreja?.plano_recursos?.agenda_publica;
    const igrejaSlug = usuario?.igreja?.slug;
    const primeiroNome = usuario?.nome?.split(" ")[0];

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${padZero(hoje.getMonth() + 1)}-${padZero(hoje.getDate())}`;

    const [aba, setAba] = useState("pastoral");
    const [viewTab, setViewTab] = useState("Calendário"); // "Calendário" | "Lista" | "Solicitações"
    const [ano, setAno] = useState(hoje.getFullYear());
    const [mes, setMes] = useState(hoje.getMonth());
    const [eventos, setEventos] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [diaSelecionado, setDiaSelecionado] = useState(null);
    const [modalNovo, setModalNovo] = useState(false);
    const [eventoEditando, setEventoEditando] = useState(null);
    const [eventoDetalhe, setEventoDetalhe] = useState(null);
    const [formDataInicial, setFormDataInicial] = useState("");

    const mesStr = `${ano}-${padZero(mes + 1)}`;

    const carregarEventos = useCallback(async () => {
        setCarregando(true);
        try {
            const res = await api.get(`/agenda?tipo=${aba}&mes=${mesStr}`);
            setEventos(res.data.eventos || []);
        } catch {
            setEventos([]);
        } finally {
            setCarregando(false);
        }
    }, [aba, mesStr]);

    useEffect(() => {
        if (!temAgenda) return;
        carregarEventos();
        setDiaSelecionado(null);
    }, [carregarEventos, temAgenda]);

    // Resetar sub-aba ao trocar aba principal
    useEffect(() => {
        setViewTab("Calendário");
    }, [aba]);

    function prevMes() {
        if (mes === 0) {
            setMes(11);
            setAno((a) => a - 1);
        } else setMes((m) => m - 1);
    }

    function proxMes() {
        if (mes === 11) {
            setMes(0);
            setAno((a) => a + 1);
        } else setMes((m) => m + 1);
    }

    function handleDiaClick(dataStr) {
        setDiaSelecionado((prev) => (prev === dataStr ? null : dataStr));
    }

    function handleNovoEventoDia(dataStr) {
        setFormDataInicial(dataStr);
        setModalNovo(true);
    }

    function handleEditar() {
        setEventoEditando(eventoDetalhe);
        setEventoDetalhe(null);
    }

    function handleSaved() {
        setModalNovo(false);
        setEventoEditando(null);
        setFormDataInicial("");
        carregarEventos();
    }

    function handleExcluir() {
        setEventoDetalhe(null);
        carregarEventos();
    }

    // ── Estatísticas derivadas ──────────────────────────────────────────────
    const stats = useMemo(() => {
        const mesAtualStr = `${hoje.getFullYear()}-${padZero(hoje.getMonth() + 1)}`;
        const proxMesDate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        const proxMesStr = `${proxMesDate.getFullYear()}-${padZero(proxMesDate.getMonth() + 1)}`;

        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        const swStr = `${inicioSemana.getFullYear()}-${padZero(inicioSemana.getMonth() + 1)}-${padZero(inicioSemana.getDate())}`;
        const ewStr = `${fimSemana.getFullYear()}-${padZero(fimSemana.getMonth() + 1)}-${padZero(fimSemana.getDate())}`;

        const eventoHoje = eventos.filter((e) => e.data_inicio === hojeStr).length;
        const eventosSemana = eventos.filter((e) => e.data_inicio >= swStr && e.data_inicio <= ewStr).length;
        const eventosMesAtual = eventos.filter((e) => e.data_inicio?.startsWith(mesAtualStr)).length;
        const eventosProxMes = eventos.filter((e) => e.data_inicio?.startsWith(proxMesStr)).length;

        const nomeMesAtual = MESES[hoje.getMonth()];
        const nomeMesProx = MESES[proxMesDate.getMonth()];

        const proxEventos = [...eventos].filter((e) => e.data_inicio >= hojeStr).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
        const proxTitulo = proxEventos[0]?.titulo || null;

        return { eventoHoje, eventosSemana, eventosMesAtual, eventosProxMes, nomeMesAtual, nomeMesProx, proxTitulo };
    }, [eventos, hojeStr, hoje]);

    const VIEW_TABS = temAgendaPublica && aba === "evento" ? ["Calendário", "Lista", "Solicitações"] : ["Calendário", "Lista"];

    // ── Plano sem acesso à Agenda ────────────────────────────────────────────
    if (!authLoading && !temAgenda) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="page-title">Agenda</h1>
                    <p className="page-subtitle">Gerencie os compromissos pastorais e os eventos da igreja</p>
                </div>
                <RecursoBloqueado
                    titulo="Agenda Pastoral & Eventos da Igreja"
                    descricao="Organize compromissos pastorais e eventos com calendário visual interativo, notificações automáticas e integração com Google Calendar."
                    gradiente="from-purple-600 to-indigo-600"
                    recursos={[
                        "Agenda Pastoral com lembretes automáticos toda segunda-feira",
                        "Calendário interativo de Eventos da Igreja",
                        "Exportação para Google Calendar e Apple Calendar (.ics)",
                        "Envio manual da agenda ao pastor via WhatsApp",
                        "Notificações diárias com os compromissos do dia seguinte",
                        "Suporte a eventos recorrentes (semanal, mensal, anual)",
                    ]}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Cabeçalho ───────────────────────────────────────────────── */}
            <div>
                <h1 className="page-title">Agenda</h1>
                <p className="page-subtitle">
                    {primeiroNome
                        ? `${primeiroNome}, gerencie os compromissos e eventos da sua igreja.`
                        : "Gerencie os compromissos pastorais e os eventos da igreja."}
                </p>
            </div>

            {/* ── Cards de resumo ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardAgenda
                    icon={Calendar}
                    label="Hoje"
                    value={stats.eventoHoje}
                    sub={stats.eventoHoje > 0 ? stats.proxTitulo : "Nenhum hoje"}
                    color="blue"
                />
                <StatCardAgenda
                    icon={CalendarDays}
                    label="Esta Semana"
                    value={stats.eventosSemana}
                    sub={stats.eventosSemana > 0 ? `${stats.eventosSemana} evento${stats.eventosSemana !== 1 ? "s" : ""}` : "Nenhum esta semana"}
                    color="purple"
                />
                <StatCardAgenda icon={Church} label={`Em ${stats.nomeMesAtual}`} value={stats.eventosMesAtual} sub="Mês atual" color="emerald" />
                <StatCardAgenda icon={Clock} label={`Em ${stats.nomeMesProx}`} value={stats.eventosProxMes} sub="Próximo mês" color="amber" />
            </div>

            {/* ── Aviso pastoral ──────────────────────────────────────────── */}
            {aba === "pastoral" && (
                <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
                    <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong>Notificações automáticas:</strong> toda segunda às 06h é enviado um e-mail com a agenda da semana; e todo dia às 06h,
                        um lembrete com os compromissos do dia seguinte — tudo via e-mail para o admin e para o pastor (se cadastrado em{" "}
                        <em>Configurações › Igreja</em>). Use o botão <strong>WhatsApp</strong> em cada compromisso para envio manual.
                    </div>
                </div>
            )}

            {/* ── Toolbar: abas + ações ────────────────────────────────────── */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-0">
                    {/* Abas de visualização */}
                    <div className="flex">
                        {VIEW_TABS.map((t) => (
                            <button
                                key={t}
                                onClick={() => setViewTab(t)}
                                className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                    viewTab === t
                                        ? "border-primary text-primary dark:text-primary-300"
                                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                {t === "Calendário" && <span className="mr-1.5">📅</span>}
                                {t === "Lista" && <span className="mr-1.5">📋</span>}
                                {t === "Solicitações" && <Bell className="w-3.5 h-3.5 inline mr-1.5" />}
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Ações à direita */}
                    <div className="flex items-center gap-2 pb-2 sm:pb-0 flex-wrap sm:flex-nowrap">
                        {/* Seletor de tipo: Pastoral / Eventos */}
                        <div className="flex bg-gray-100 dark:bg-gray-700/60 rounded-lg p-0.5">
                            <button
                                onClick={() => setAba("pastoral")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    aba === "pastoral"
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                Pastoral
                            </button>
                            <button
                                onClick={() => setAba("evento")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    aba === "evento"
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                <Church className="w-3.5 h-3.5" />
                                Eventos
                            </button>
                        </div>

                        {/* Navegação de mês */}
                        <div className="flex items-center gap-0.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                            <button
                                onClick={prevMes}
                                className="p-1.5 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {MESES[mes]} {ano}
                            </span>
                            <button
                                onClick={proxMes}
                                className="p-1.5 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Divisor */}
                        <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700" />

                        {/* Botões de ação */}
                        <div className="flex gap-1.5">
                            {temAgendaPublica && aba === "evento" && igrejaSlug && (
                                <a
                                    href={`/agenda/${igrejaSlug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    Pública
                                </a>
                            )}
                            <button
                                onClick={() => window.open(`/api/agenda/exportar-ics?tipo=${aba}&mes=${mesStr}`, "_blank")}
                                title="Exportar como .ics (Google Calendar / Apple Calendar)"
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                ICS
                            </button>
                            {viewTab !== "Solicitações" && (
                                <button
                                    onClick={() => {
                                        setFormDataInicial("");
                                        setModalNovo(true);
                                    }}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-primary hover:bg-primary-700 text-white transition-colors shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Novo {aba === "pastoral" ? "Compromisso" : "Evento"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Conteúdo das abas ─────────────────────────────────── */}
                <div className="mt-6">
                    {/* Tab: Calendário */}
                    {viewTab === "Calendário" && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div className="xl:col-span-2">
                                {carregando ? (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-center h-80">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <Calendario
                                        ano={ano}
                                        mes={mes}
                                        eventos={eventos}
                                        onDiaClick={handleDiaClick}
                                        onPrevMes={prevMes}
                                        onProxMes={proxMes}
                                    />
                                )}
                            </div>
                            <div className="xl:col-span-1 min-h-[400px]">
                                <ListaEventos
                                    eventos={eventos}
                                    diaSelecionado={diaSelecionado}
                                    tipo={aba}
                                    onEventoClick={setEventoDetalhe}
                                    onNovoEventoDia={handleNovoEventoDia}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab: Lista */}
                    {viewTab === "Lista" && (
                        <div>
                            {carregando ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : eventos.length === 0 ? (
                                <div className="text-center py-16 space-y-3">
                                    <CalendarDays className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto" />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                                        Nenhum evento em {MESES[mes]} {ano}.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {[...eventos]
                                        .sort((a, b) => {
                                            if (a.data_inicio !== b.data_inicio) return a.data_inicio.localeCompare(b.data_inicio);
                                            return (a.hora_inicio || "").localeCompare(b.hora_inicio || "");
                                        })
                                        .map((ev) => (
                                            <button
                                                key={ev.id}
                                                onClick={() => setEventoDetalhe(ev)}
                                                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                                                        style={{ background: ev.cor || "#1a56db" }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{ev.titulo}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {formatarDataBR(ev.data_inicio)}
                                                                {ev.data_fim && ev.data_fim !== ev.data_inicio
                                                                    ? ` até ${formatarDataBR(ev.data_fim)}`
                                                                    : ""}
                                                            </span>
                                                            {!ev.dia_todo && ev.hora_inicio && (
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {ev.hora_inicio}
                                                                    {ev.hora_fim ? ` – ${ev.hora_fim}` : ""}
                                                                </span>
                                                            )}
                                                            {ev.dia_todo && <span className="text-gray-400">Dia todo</span>}
                                                            {ev.local && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3.5 h-3.5" />
                                                                    {ev.local}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {ev.descricao && (
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                                                                {ev.descricao}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Pencil className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Solicitações */}
                    {viewTab === "Solicitações" && <SolicitacoesPanel igrejaSlug={igrejaSlug} />}
                </div>
            </div>

            {/* Modais */}
            {(modalNovo || eventoEditando) && (
                <EventoModal
                    tipo={aba}
                    evento={eventoEditando ? eventoEditando : formDataInicial ? { ...FORM_INICIAL, data_inicio: formDataInicial } : null}
                    onClose={() => {
                        setModalNovo(false);
                        setEventoEditando(null);
                        setFormDataInicial("");
                    }}
                    onSaved={handleSaved}
                />
            )}

            {eventoDetalhe && !eventoEditando && (
                <EventoDetalheModal
                    evento={eventoDetalhe}
                    tipo={aba}
                    onClose={() => setEventoDetalhe(null)}
                    onEditar={handleEditar}
                    onExcluir={handleExcluir}
                />
            )}
        </div>
    );
}
