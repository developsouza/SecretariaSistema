import { useState, useEffect, useCallback } from "react";
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

// ─── Página principal ────────────────────────────────────────────────────────
export default function AgendaPage() {
    const { usuario, loading: authLoading } = useAuth();
    // Acesso pela flag no plano OU pelo nome do plano (fallback para planos criados antes da migração)
    const planoNome = usuario?.igreja?.plano_nome || "";
    const temAgenda = !!usuario?.igreja?.plano_recursos?.agenda || planoNome === "Profissional" || planoNome === "Premium";

    const hoje = new Date();
    const [aba, setAba] = useState("pastoral");
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

    const abaConfig = {
        pastoral: { label: "Agenda Pastoral", icon: BookOpen, cor: "from-purple-600 to-indigo-600" },
        evento: { label: "Eventos da Igreja", icon: Church, cor: "from-blue-600 to-cyan-600" },
    };

    // ── Plano sem acesso à Agenda ────────────────────────────────────────────
    if (!authLoading && !temAgenda) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-7 h-7 text-primary" />
                        Agenda
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie os compromissos pastorais e os eventos da igreja</p>
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
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-7 h-7 text-primary" />
                        Agenda
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie os compromissos pastorais e os eventos da igreja</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.open(`/api/agenda/exportar-ics?tipo=${aba}&mes=${mesStr}`, "_blank")}
                        title="Exportar como .ics (Google Calendar / Apple Calendar)"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar ICS
                    </button>
                    <button
                        onClick={() => {
                            setFormDataInicial("");
                            setModalNovo(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Novo {aba === "pastoral" ? "Compromisso" : "Evento"}
                    </button>
                </div>
            </div>

            {/* Abas */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl w-fit">
                {Object.entries(abaConfig).map(([key, cfg]) => (
                    <button
                        key={key}
                        onClick={() => setAba(key)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            aba === key
                                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                        )}
                    >
                        <cfg.icon className="w-4 h-4" />
                        {cfg.label}
                    </button>
                ))}
            </div>

            {/* Aviso de notificações — apenas pastoral */}
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

            {/* Layout calendário + lista */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Calendário — ocupa 2 colunas */}
                <div className="xl:col-span-2">
                    {carregando ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-center h-80">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <Calendario ano={ano} mes={mes} eventos={eventos} onDiaClick={handleDiaClick} onPrevMes={prevMes} onProxMes={proxMes} />
                    )}
                </div>

                {/* Painel lateral */}
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
