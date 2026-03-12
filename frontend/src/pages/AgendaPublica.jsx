import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
    Calendar,
    Clock,
    MapPin,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Church,
    X,
    Send,
    User,
    Phone,
    Mail,
    AlignLeft,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import clsx from "clsx";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function padZero(n) {
    return String(n).padStart(2, "0");
}

function diasNoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
}

function primeiroDiaMes(ano, mes) {
    return new Date(ano, mes, 1).getDay();
}

function formatarDataBR(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
}

function formatarDataExtenso(isoDate) {
    if (!isoDate) return "";
    const d = new Date(isoDate + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function formatarHorario(ev) {
    if (ev.dia_todo) return "Dia todo";
    if (!ev.hora_inicio) return "";
    return ev.hora_fim ? `${ev.hora_inicio} – ${ev.hora_fim}` : ev.hora_inicio;
}

function ehFuturo(isoDate) {
    return isoDate >= new Date().toISOString().slice(0, 10);
}

// ─── Modal de Solicitação de Agendamento ─────────────────────────────────────
function ModalSolicitar({ slug, corPrimaria, onClose }) {
    const hoje = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        nome: "",
        email: "",
        celular: "",
        whatsapp: "",
        titulo: "",
        descricao: "",
        local: "",
        data_inicio: hoje,
        hora_inicio: "",
        data_fim: "",
        hora_fim: "",
    });
    const [enviando, setEnviando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState("");

    function set(campo, valor) {
        setForm((f) => ({ ...f, [campo]: valor }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.nome.trim()) return setErro("Nome é obrigatório");
        if (!form.celular.trim()) return setErro("Celular é obrigatório");
        if (!form.titulo.trim()) return setErro("Título do evento é obrigatório");
        if (!form.data_inicio) return setErro("Data de início é obrigatória");

        setErro("");
        setEnviando(true);
        try {
            await axios.post(`/api/publico/agenda/${slug}/solicitar`, form);
            setSucesso(true);
        } catch (err) {
            const msgs = err.response?.data?.errors;
            if (msgs?.length) {
                setErro(msgs.map((e) => e.msg).join(" • "));
            } else {
                setErro(err.response?.data?.error || "Erro ao enviar solicitação. Tente novamente.");
            }
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
                    style={{ background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}cc)` }}
                >
                    <div>
                        <h2 className="text-white font-bold text-lg">Solicitar Agendamento</h2>
                        <p className="text-white/80 text-xs mt-0.5">Preencha os detalhes do evento desejado</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {sucesso ? (
                    <div className="p-8 text-center space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle className="w-16 h-16 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Solicitação enviada!</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Sua solicitação foi recebida e será analisada pela equipe. Você será notificado sobre a decisão em breve.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-4 px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90"
                            style={{ background: corPrimaria }}
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Dados do Solicitante */}
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Seus dados</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <User className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={(e) => set("nome", e.target.value)}
                                    placeholder="Seu nome completo"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Phone className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                    Celular *
                                </label>
                                <input
                                    type="tel"
                                    value={form.celular}
                                    onChange={(e) => set("celular", e.target.value)}
                                    placeholder="(00) 90000-0000"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Phone className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                    WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={form.whatsapp}
                                    onChange={(e) => set("whatsapp", e.target.value)}
                                    placeholder="(00) 90000-0000"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Mail className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => set("email", e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Dados do Evento */}
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Sobre o evento</p>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                <Calendar className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                Título do evento *
                            </label>
                            <input
                                type="text"
                                value={form.titulo}
                                onChange={(e) => set("titulo", e.target.value)}
                                placeholder="Ex: Culto de aniversário da congregação"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                <AlignLeft className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                Descrição
                            </label>
                            <textarea
                                value={form.descricao}
                                onChange={(e) => set("descricao", e.target.value)}
                                rows={2}
                                placeholder="Descreva o evento brevemente..."
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                <MapPin className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                Local
                            </label>
                            <input
                                type="text"
                                value={form.local}
                                onChange={(e) => set("local", e.target.value)}
                                placeholder="Local do evento"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Data início *</label>
                                <input
                                    type="date"
                                    value={form.data_inicio}
                                    min={hoje}
                                    onChange={(e) => set("data_inicio", e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <Clock className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                                    Hora início
                                </label>
                                <input
                                    type="time"
                                    value={form.hora_inicio}
                                    onChange={(e) => set("hora_inicio", e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
                                <input
                                    type="date"
                                    value={form.data_fim}
                                    min={form.data_inicio || hoje}
                                    onChange={(e) => set("data_fim", e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Hora fim</label>
                                <input
                                    type="time"
                                    value={form.hora_fim}
                                    onChange={(e) => set("hora_fim", e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>

                        {erro && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{erro}</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={enviando}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: corPrimaria }}
                            >
                                <Send className="w-4 h-4" />
                                {enviando ? "Enviando..." : "Enviar Solicitação"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// ─── Card de evento ────────────────────────────────────────────────────────
function EventoCard({ evento, corPrimaria, onClick }) {
    const horario = formatarHorario(evento);
    const futuro = ehFuturo(evento.data_inicio);
    const dataObj = new Date(evento.data_inicio + "T12:00:00");
    const diaSemana = DIAS_SEMANA[dataObj.getDay()];
    const dia = dataObj.getDate();
    const mesAbrev = MESES_CURTOS[dataObj.getMonth()];

    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-full text-left group relative bg-white rounded-2xl border overflow-hidden transition-all duration-200",
                futuro ? "border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer" : "border-gray-100 opacity-70",
            )}
        >
            {/* Barra lateral colorida */}
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: evento.cor || corPrimaria }} />

            <div className="flex items-start gap-4 p-5 pl-6">
                {/* Data badge */}
                <div className="flex-shrink-0 text-center w-14 bg-gray-50 rounded-xl py-2.5 group-hover:bg-gray-100 transition-colors">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{diaSemana}</p>
                    <p className="text-2xl font-bold text-gray-800 leading-none mt-0.5">{dia}</p>
                    <p className="text-[10px] text-gray-400 uppercase mt-0.5">{mesAbrev}</p>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                        {evento.titulo}
                    </h3>
                    {horario && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{horario}</span>
                        </div>
                    )}
                    {evento.local && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{evento.local}</span>
                        </div>
                    )}
                    {evento.descricao && <p className="mt-2 text-xs text-gray-400 leading-relaxed line-clamp-2">{evento.descricao}</p>}
                </div>
            </div>
        </button>
    );
}

// ─── Modal de detalhe do evento ───────────────────────────────────────────────
function EventoDetalhe({ evento, corPrimaria, onClose, onSolicitar }) {
    const horario = formatarHorario(evento);
    const dataExtenso = formatarDataExtenso(evento.data_inicio);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div
                    className="relative px-6 py-5"
                    style={{ background: `linear-gradient(135deg, ${evento.cor || corPrimaria}, ${evento.cor || corPrimaria}bb)` }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-white font-bold text-xl pr-8 leading-snug">{evento.titulo}</h2>
                    <p className="text-white/70 text-sm mt-1 capitalize">{dataExtenso}</p>
                </div>
                <div className="p-6 space-y-3">
                    {horario && (
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{horario}</span>
                        </div>
                    )}
                    {evento.data_fim && evento.data_fim !== evento.data_inicio && (
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>Até {formatarDataBR(evento.data_fim)}</span>
                        </div>
                    )}
                    {evento.local && (
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{evento.local}</span>
                        </div>
                    )}
                    {evento.descricao && (
                        <div className="flex items-start gap-3 text-sm text-gray-600">
                            <AlignLeft className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{evento.descricao}</span>
                        </div>
                    )}
                    <div className="pt-3 border-t border-gray-100">
                        <button
                            onClick={onSolicitar}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90"
                            style={{ background: corPrimaria }}
                        >
                            <CalendarDays className="w-4 h-4" />
                            Solicitar Agendamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Mini calendário público ──────────────────────────────────────────────────
function MiniCalendario({ ano, mes, eventos, diaSelecionado, corPrimaria, onDiaClick, onPrev, onProx }) {
    const total = diasNoMes(ano, mes);
    const primeiroDia = primeiroDiaMes(ano, mes);
    const hojeStr = new Date().toISOString().slice(0, 10);

    const eventosMap = {};
    eventos.forEach((e) => {
        if (!eventosMap[e.data_inicio]) eventosMap[e.data_inicio] = [];
        eventosMap[e.data_inicio].push(e);
    });

    const cells = [];
    for (let i = 0; i < primeiroDia; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);

    return (
        <div>
            {/* Navegação de mês */}
            <div className="flex items-center justify-between mb-3">
                <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-sm text-gray-800">
                    {MESES[mes]} {ano}
                </span>
                <button onClick={onProx} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-0.5">
                {DIAS_SEMANA.map((d) => (
                    <div key={d} className="text-center text-[10px] font-semibold text-gray-400 pb-1 uppercase tracking-wide">
                        {d}
                    </div>
                ))}
            </div>

            {/* Células */}
            <div className="grid grid-cols-7 gap-0.5 mt-0.5">
                {cells.map((dia, i) => {
                    if (!dia) return <div key={`e${i}`} className="h-11" />;
                    const dataStr = `${ano}-${padZero(mes + 1)}-${padZero(dia)}`;
                    const eventosDia = eventosMap[dataStr] || [];
                    const isHoje = dataStr === hojeStr;
                    const isSel = dataStr === diaSelecionado;
                    return (
                        <button
                            key={dia}
                            onClick={() => onDiaClick(dataStr)}
                            className={clsx(
                                "relative h-11 w-full rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center",
                                isSel ? "text-white" : "",
                                !isSel && eventosDia.length > 0 ? "bg-blue-50" : "",
                                !isSel && eventosDia.length === 0 && !isHoje ? "text-gray-600 hover:bg-gray-100" : "",
                            )}
                            style={isSel ? { background: corPrimaria } : isHoje && !isSel ? { color: corPrimaria } : {}}
                        >
                            {dia}
                            {eventosDia.length > 0 && !isSel && (
                                <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: corPrimaria }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legenda */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block" /> Evento
                </span>
                <span className="flex items-center gap-1" style={{ color: corPrimaria }}>
                    <span className="w-3 h-3 rounded inline-block" style={{ background: corPrimaria }} /> Hoje
                </span>
            </div>
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function AgendaPublica() {
    const { slug } = useParams();
    const hoje = new Date();
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [ano, setAno] = useState(hoje.getFullYear());
    const [mes, setMes] = useState(hoje.getMonth());
    const [diaSelecionado, setDiaSelecionado] = useState(null);
    const [eventoDetalhe, setEventoDetalhe] = useState(null);
    const [modalSolicitar, setModalSolicitar] = useState(false);

    const mesStr = `${ano}-${padZero(mes + 1)}`;

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            const res = await axios.get(`/api/publico/agenda/${slug}?mes=${mesStr}`);
            setDados(res.data);
            setErro("");
        } catch (err) {
            if (err.response?.status === 403) {
                setErro("A agenda pública desta igreja não está disponível.");
            } else if (err.response?.status === 404) {
                setErro("Igreja não encontrada.");
            } else {
                setErro("Erro ao carregar a agenda. Tente novamente.");
            }
        } finally {
            setCarregando(false);
        }
    }, [slug, mesStr]);

    useEffect(() => {
        carregar();
        setDiaSelecionado(null);
    }, [carregar]);

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

    function abrirSolicitar(evento = null) {
        if (evento) setEventoDetalhe(null);
        setModalSolicitar(true);
    }

    if (carregando && !dados) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Carregando agenda...</p>
                </div>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center space-y-4">
                    <Church className="w-14 h-14 text-gray-300 mx-auto" />
                    <h2 className="text-xl font-bold text-gray-700">Agenda indisponível</h2>
                    <p className="text-gray-500 text-sm">{erro}</p>
                </div>
            </div>
        );
    }

    const { igreja, eventos } = dados;
    const corPrimaria = igreja.cor_primaria || "#1a56db";
    const corSecundaria = igreja.cor_secundaria || "#6366f1";

    const eventosVisiveis = diaSelecionado ? eventos.filter((e) => e.data_inicio === diaSelecionado) : eventos;

    const proximosEventos = [...eventos].filter((e) => ehFuturo(e.data_inicio)).slice(0, 3);

    return (
        <div className="min-h-screen" style={{ background: "#f8fafc" }}>
            {/* ── Hero ────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)` }}>
                {/* Padrão decorativo */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white translate-y-1/2 -translate-x-1/4" />
                </div>

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        {/* Logo ou ícone */}
                        {igreja.logo_url ? (
                            <img
                                src={igreja.logo_url}
                                alt={`Logo ${igreja.nome}`}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white/20 p-2 shadow-xl flex-shrink-0"
                            />
                        ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 flex items-center justify-center shadow-xl flex-shrink-0">
                                <Church className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                            </div>
                        )}

                        {/* Informações da igreja */}
                        <div className="flex-1">
                            {igreja.denominacao && (
                                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{igreja.denominacao}</p>
                            )}
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">{igreja.nome}</h1>
                            {(igreja.cidade || igreja.estado) && (
                                <p className="text-white/80 text-sm mt-1.5">
                                    <MapPin className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                                    {[igreja.cidade, igreja.estado].filter(Boolean).join(", ")}
                                </p>
                            )}
                        </div>

                        {/* Botão principal */}
                        <button
                            onClick={() => abrirSolicitar()}
                            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-white font-semibold text-sm shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                            style={{ color: corPrimaria }}
                        >
                            <CalendarDays className="w-5 h-5" />
                            Solicitar Agendamento
                        </button>
                    </div>

                    {/* Destaques dos próximos eventos */}
                    {proximosEventos.length > 0 && (
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {proximosEventos.map((ev) => (
                                <button
                                    key={ev.id}
                                    onClick={() => setEventoDetalhe(ev)}
                                    className="text-left bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl p-4 transition-all duration-200 border border-white/20 hover:border-white/40"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                        <p className="text-white/60 text-[10px] uppercase font-semibold tracking-wider">
                                            {formatarDataBR(ev.data_inicio)}
                                        </p>
                                    </div>
                                    <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{ev.titulo}</p>
                                    {ev.hora_inicio && !ev.dia_todo && (
                                        <p className="text-white/60 text-xs mt-1">
                                            <Clock className="w-3 h-3 inline mr-0.5" />
                                            {ev.hora_inicio}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Conteúdo principal ──────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Card único meio a meio */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    {carregando ? (
                        <div className="flex items-center justify-center h-64">
                            <div
                                className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: `${corPrimaria}40`, borderTopColor: "transparent" }}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row lg:gap-8">
                            {/* Coluna esquerda: calendário */}
                            <div className="flex-1 min-w-0">
                                <MiniCalendario
                                    ano={ano}
                                    mes={mes}
                                    eventos={eventos}
                                    diaSelecionado={diaSelecionado}
                                    corPrimaria={corPrimaria}
                                    onDiaClick={handleDiaClick}
                                    onPrev={prevMes}
                                    onProx={proxMes}
                                />
                            </div>

                            {/* Divisor vertical (desktop) */}
                            <div className="hidden lg:block w-px bg-gray-100 self-stretch" />

                            {/* Coluna direita: lista de eventos */}
                            <div className="flex-1 min-w-0 mt-6 lg:mt-0 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        {diaSelecionado ? `Eventos — ${formatarDataBR(diaSelecionado)}` : `${MESES[mes]} ${ano}`}
                                    </p>
                                    {diaSelecionado && (
                                        <button
                                            onClick={() => setDiaSelecionado(null)}
                                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Limpar
                                        </button>
                                    )}
                                </div>

                                {eventosVisiveis.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
                                        <CalendarDays className="w-12 h-12 text-gray-200 mb-3" />
                                        <p className="text-gray-500 font-medium text-sm">Nenhum evento</p>
                                        <p className="text-gray-400 text-xs mt-1">
                                            {diaSelecionado ? "Nenhum evento nesta data." : "Nenhum evento programado para este mês."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                                        {eventosVisiveis.map((ev) => (
                                            <EventoCard key={ev.id} evento={ev} corPrimaria={corPrimaria} onClick={() => setEventoDetalhe(ev)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Solicitar agendamento */}
                <div className="mt-6 rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${corPrimaria}, ${corSecundaria})` }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-base">Quer realizar um evento?</h3>
                            <p className="text-white/80 text-sm mt-0.5">Envie uma solicitação e nossa equipe entrará em contato para confirmar.</p>
                        </div>
                        <button
                            onClick={() => abrirSolicitar()}
                            className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
                            style={{ color: corPrimaria }}
                        >
                            <CalendarDays className="w-4 h-4" />
                            Solicitar Agendamento
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">
                        Agenda pública powered by <span className="font-semibold text-gray-500">Gestão Secretaria</span>
                    </p>
                </div>
            </div>

            {/* Modais */}
            {eventoDetalhe && !modalSolicitar && (
                <EventoDetalhe
                    evento={eventoDetalhe}
                    corPrimaria={corPrimaria}
                    onClose={() => setEventoDetalhe(null)}
                    onSolicitar={() => abrirSolicitar(eventoDetalhe)}
                />
            )}

            {modalSolicitar && <ModalSolicitar slug={slug} corPrimaria={corPrimaria} onClose={() => setModalSolicitar(false)} />}
        </div>
    );
}
