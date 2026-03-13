import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicoAPI } from "../services/api";
import { maskPhone } from "../utils/masks";
import {
    Cake,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    MessageSquare,
    PartyPopper,
    Phone,
    Mail,
    Users,
    Plus,
    X,
    CheckCircle,
    AlertCircle,
    Church,
    Star,
    Clock,
} from "lucide-react";
import { parseISO } from "date-fns";

// ─── Constantes ───────────────────────────────────────────────────────────────
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CARGOS_ECLESIASTICOS = ["Membro", "Diácono", "Presbítero", "Evangelista", "Pastor", "Dirigente de Departamento", "Outro"];

// Cargos que geram evento automático na Agenda Pastoral
const CARGOS_PASTORAIS_REGEX = /di[áa]con[ao]|presb[íi]tero|evangelista|pastor|dirigente de departamento/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDiasNoMes(ano, mes) {
    return new Date(ano, mes, 0).getDate();
}
function getPrimeiroDia(ano, mes) {
    return new Date(ano, mes - 1, 1).getDay();
}
function calcularIdade(dataIso) {
    if (!dataIso) return null;
    const hoje = new Date();
    const nasc = parseISO(dataIso);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
}
// Retorna a idade que a pessoa completa (ou completou) no ano corrente
function idadeNoAniversario(dataIso) {
    if (!dataIso) return null;
    return new Date().getFullYear() - parseISO(dataIso).getFullYear();
}
function fmtDiaMes(dataIso) {
    if (!dataIso) return "";
    const partes = dataIso.split("-");
    if (partes.length < 3) return dataIso;
    return `${partes[2]}/${partes[1]}`;
}
function fmtDiaMesLongo(dataIso) {
    if (!dataIso) return "";
    const d = new Date(dataIso + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}
function ehCargoPastoral(cargo) {
    return cargo && CARGOS_PASTORAIS_REGEX.test(cargo);
}
function getCargoColor(cargo) {
    if (!cargo) return { bg: "bg-gray-100", text: "text-gray-600" };
    const c = cargo.toLowerCase();
    if (/pastor/.test(c)) return { bg: "bg-purple-100", text: "text-purple-700" };
    if (/presb/.test(c)) return { bg: "bg-blue-100", text: "text-blue-700" };
    if (/di[áa]con/.test(c)) return { bg: "bg-cyan-100", text: "text-cyan-700" };
    if (/evangelista/.test(c)) return { bg: "bg-green-100", text: "text-green-700" };
    if (/l[íi]der/.test(c)) return { bg: "bg-amber-100", text: "text-amber-700" };
    return { bg: "bg-gray-100", text: "text-gray-600" };
}

// ─── Geração de PDF ───────────────────────────────────────────────────────────
function gerarPDF(lista, titulo, subtitulo, nomeIgreja, logoUrl) {
    if (!lista || lista.length === 0) {
        alert("Nenhum aniversariante para exportar.");
        return;
    }
    const colunas = lista.length > 16 ? 3 : 2;
    const cards = lista
        .map((m) => {
            const dataNasc = m.data_nascimento ? new Date(m.data_nascimento + "T12:00:00") : null;
            const diaFormatado = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "—";
            const idade = idadeNoAniversario(m.data_nascimento);
            const iniciais = (m.nome_completo || "?")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();
            const cargo = m.cargo || "";
            const dept = m.departamento ? ` · ${m.departamento}` : "";
            return `<div class="card">
                <div class="avatar"><div class="avatar-fallback">${iniciais}</div></div>
                <div class="info">
                    <div class="nome">${m.nome_completo}</div>
                    ${cargo ? `<div class="cargo">${cargo}${dept}</div>` : ""}
                    <div class="data">🎂 ${diaFormatado}${idade !== null ? ` &middot; completa <strong>${idade}</strong> ano${idade !== 1 ? "s" : ""}` : ""}</div>
                </div>
            </div>`;
        })
        .join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>${titulo} — ${nomeIgreja}</title>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}@page{size:A4 portrait;margin:0}
body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;position:relative;padding-bottom:44px}
.header{background:linear-gradient(135deg,#0f0c29 0%,#302b63 40%,#7c2d9b 72%,#be185d 100%);padding:22px 40px;position:relative;overflow:hidden}
.header-row{display:flex;align-items:center;gap:20px;position:relative;z-index:1}
.church-logo{height:72px;max-width:160px;display:flex;align-items:center;justify-content:center;font-size:40px;flex-shrink:0}
.church-logo img{height:100%;max-width:160px;object-fit:contain}
.main-title{font-family:'Crimson Pro',Georgia,serif;font-size:38px;font-weight:700;color:#fff;line-height:1.1}
.main-title .accent{color:#fbbf24}
.ornament{height:5px;background:linear-gradient(90deg,#fbbf24 0%,#f472b6 45%,#a855f7 100%)}
.stats{display:flex;align-items:center;background:#faf5ff;border-bottom:1px solid #ede9fe;padding:8px 36px;gap:24px}
.stat-pill{display:flex;align-items:center;gap:6px}
.stat-n{font-size:15px;font-weight:700;color:#7c2d9b}
.stat-l{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#a78bfa;font-weight:600}
.stat-dot{color:#d8b4fe;font-size:10px}
.content{padding:22px 36px 32px}
.grid{display:grid;grid-template-columns:repeat(${colunas},1fr);gap:10px}
.card{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:10px;border:1px solid #ede9fe;background:linear-gradient(135deg,#fdf4ff 0%,#fff 100%);position:relative;overflow:hidden;page-break-inside:avoid}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#a855f7,#ec4899);border-radius:10px 0 0 10px}
.avatar{width:40px;height:40px;flex-shrink:0;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#7c3aed,#db2777);display:flex;align-items:center;justify-content:center}
.avatar-fallback{color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.info{flex:1;min-width:0}
.nome{font-size:12px;font-weight:600;color:#1e1b4b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cargo{font-size:9px;color:#7c3aed;font-weight:600;margin-top:1px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.data{font-size:10px;color:#6b7280;margin-top:3px}
.data strong{color:#be185d}
.footer{position:fixed;bottom:0;left:0;right:0;height:36px;background:linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#7c2d9b 100%);display:flex;align-items:center;justify-content:space-between;padding:0 36px}
.footer-text{font-size:9px;color:rgba(255,255,255,.55);letter-spacing:.08em;text-transform:uppercase}
.footer-verse{font-family:'Crimson Pro',Georgia,serif;font-size:11px;font-style:italic;color:rgba(255,255,255,.5)}
.empty{text-align:center;padding:60px;color:#9ca3af;font-size:15px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.footer{position:fixed;bottom:0}}
</style></head><body><div class="page">
<div class="header"><div class="header-row">
<div class="church-logo">${logoUrl ? `<img src="${logoUrl}" onerror="this.style.display='none';this.parentElement.innerText='⛪'" />` : "⛪"}</div>
<div class="title-area"><div class="main-title">🎂 <span class="accent">${titulo}</span></div></div>
</div></div>
<div class="ornament"></div>
<div class="stats">
<div class="stat-pill"><span class="stat-n">${lista.length}</span><span class="stat-l">Aniversariante${lista.length !== 1 ? "s" : ""}</span></div>
<span class="stat-dot">•</span>
<div class="stat-pill"><span class="stat-l">${subtitulo}</span></div>
</div>
<div class="content">
${lista.length === 0 ? '<div class="empty">Nenhum aniversariante no período.</div>' : `<div class="grid">${cards}</div>`}
</div>
<div class="footer">
<span class="footer-text">Gestão Secretaria</span>
<span class="footer-verse">"Que o Senhor te abençoe" — Nm 6:24</span>
<span class="footer-text">${nomeIgreja}</span>
</div>
</div><script>window.onload=function(){setTimeout(function(){window.print();},600)}<\/script>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
        alert("Pop-up bloqueado. Permita pop-ups para esta página.");
        return;
    }
    w.document.write(html);
    w.document.close();
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────
function exportarCSV(lista, nomeArquivo) {
    if (!lista || lista.length === 0) {
        alert("Nenhum aniversariante para exportar.");
        return;
    }
    const SEP = ";";
    const sepHint = `sep=${SEP}\n`;
    const cabecalhos = ["Nome Completo", "Data de Nascimento", "Dia / Mês", "Idade Atual", "Fará Anos", "Cargo", "Departamento", "Celular", "E-mail"];
    const header = cabecalhos.map((h) => `"${h}"`).join(SEP) + "\n";
    const esc = (v) => `"${(v || "").replace(/"/g, '""')}"`;
    const linhas = lista
        .map((m) => {
            const dataNasc = m.data_nascimento ? new Date(m.data_nascimento + "T12:00:00") : null;
            const dataFormatada = dataNasc ? dataNasc.toLocaleDateString("pt-BR") : "";
            const diaMes = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
            const idadeAtual = calcularIdade(m.data_nascimento);
            const faraAnos = idadeAtual !== null ? idadeNoAniversario(m.data_nascimento) : "";
            return [
                esc(m.nome_completo),
                esc(dataFormatada),
                esc(diaMes),
                idadeAtual !== null ? idadeAtual : "",
                faraAnos,
                esc(m.cargo),
                esc(m.departamento),
                esc(m.celular),
                esc(m.email),
            ].join(SEP);
        })
        .join("\n");
    const conteudo = sepHint + header + linhas;
    const bytes = new Uint8Array(conteudo.length);
    for (let i = 0; i < conteudo.length; i++) {
        const cp = conteudo.charCodeAt(i);
        bytes[i] = cp <= 0xff ? cp : 0x3f;
    }
    const blob = new Blob([bytes], { type: "text/csv;charset=windows-1252;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Modal de Cadastro ────────────────────────────────────────────────────────
function ModalCadastro({ slug, corPrimaria, nomeIgreja, onClose, onSucesso }) {
    const queryClient = useQueryClient();
    const hoje = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        nome_completo: "",
        data_nascimento: "",
        celular: "",
        email: "",
        cargo: "",
        departamento: "",
        congregacao: "",
    });
    const [sucesso, setSucesso] = useState(false);
    const [erroApi, setErroApi] = useState("");

    const mutation = useMutation({
        mutationFn: (data) => publicoAPI.registrarAniversario(slug, data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["aniversarios-publicos", slug] });
            setSucesso(true);
            if (onSucesso) onSucesso(res.data);
        },
        onError: (err) => {
            const msg = err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || "Erro ao cadastrar. Tente novamente.";
            setErroApi(msg);
        },
    });

    function handleChange(e) {
        const { name, value } = e.target;
        const parsed = name === "celular" ? maskPhone(value) : value;
        setForm((f) => ({ ...f, [name]: parsed }));
        if (erroApi) setErroApi("");
    }

    function handleSubmit(e) {
        e.preventDefault();
        setErroApi("");
        if (!form.nome_completo.trim()) {
            setErroApi("Nome completo é obrigatório.");
            return;
        }
        if (!form.data_nascimento) {
            setErroApi("Data de nascimento é obrigatória.");
            return;
        }
        if (!form.cargo) {
            setErroApi("Selecione um cargo ou função.");
            return;
        }
        mutation.mutate({ ...form, whatsapp: form.celular });
    }

    const mostraDept = form.cargo === "Dirigente de Departamento" || form.cargo === "Outro";
    const ehPastoral = ehCargoPastoral(form.cargo);

    if (sucesso) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-9 h-9 text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Aniversário cadastrado! 🎉</h2>
                    <p className="text-gray-500 text-sm mb-1">
                        Seu aniversário foi registrado com sucesso em <strong>{nomeIgreja}</strong>.
                    </p>
                    {ehPastoral && (
                        <p className="text-purple-600 text-xs bg-purple-50 rounded-lg px-3 py-2 mt-3">
                            ✨ Por ser um cargo de liderança, seu aniversário também foi adicionado à Agenda Pastoral da igreja.
                        </p>
                    )}
                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                        style={{ background: corPrimaria || "#1a56db" }}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Cadastrar meu Aniversário</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{nomeIgreja}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome completo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nome_completo"
                            value={form.nome_completo}
                            onChange={handleChange}
                            placeholder="Seu nome completo"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Data de nascimento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data de nascimento <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="data_nascimento"
                            value={form.data_nascimento}
                            onChange={handleChange}
                            max={hoje}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Cargo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cargo Eclesiástico / Função <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="cargo"
                            value={form.cargo}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            required
                        >
                            <option value="">Selecione...</option>
                            {CARGOS_ECLESIASTICOS.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                        {ehPastoral && (
                            <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Será agendado também na Agenda Pastoral da igreja.
                            </p>
                        )}
                    </div>

                    {/* Departamento (condicional) */}
                    {mostraDept && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {form.cargo === "Dirigente de Departamento" ? "Nome do Departamento que você dirige" : "Departamento / Ministério"}
                                {form.cargo === "Dirigente de Departamento" && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            <input
                                type="text"
                                name="departamento"
                                value={form.departamento}
                                onChange={handleChange}
                                placeholder={
                                    form.cargo === "Dirigente de Departamento"
                                        ? "Ex: Jovens, Louvor, EBD, Senhoras..."
                                        : "Ex: Ministério de Louvor, Jovens, EBD..."
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    {/* Celular / WhatsApp */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Celular / WhatsApp</label>
                        <input
                            type="tel"
                            name="celular"
                            value={form.celular}
                            onChange={handleChange}
                            placeholder="(00) 00000-0000"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-400">Informe o número do aniversariante</p>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="seu@email.com"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Congregação */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Congregação</label>
                        <input
                            type="text"
                            name="congregacao"
                            value={form.congregacao}
                            onChange={handleChange}
                            placeholder="Nome da congregação"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Erro */}
                    {erroApi && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {erroApi}
                        </div>
                    )}

                    {/* Botões */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ background: corPrimaria || "#1a56db" }}
                        >
                            {mutation.isPending ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Cake className="w-4 h-4" /> Cadastrar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Card de Membro ───────────────────────────────────────────────────────────
function CardMembro({ membro, corPrimaria }) {
    const hoje = new Date();
    const dataNasc = membro.data_nascimento ? new Date(membro.data_nascimento + "T12:00:00") : null;
    const ehHoje = dataNasc && dataNasc.getMonth() === hoje.getMonth() && dataNasc.getDate() === hoje.getDate();
    const idade = calcularIdade(membro.data_nascimento);
    const diaFormatado = dataNasc ? fmtDiaMesLongo(membro.data_nascimento) : "";
    const { bg, text } = getCargoColor(membro.cargo);
    const iniciais = (membro.nome_completo || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${ehHoje ? "bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200 shadow-sm" : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"}`}
        >
            <div className="relative flex-shrink-0">
                <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${ehHoje ? "bg-pink-200 text-pink-700" : "bg-gray-100 text-gray-500"}`}
                >
                    {iniciais}
                </div>
                {ehHoje && <span className="absolute -top-1 -right-1 text-sm leading-none">🎂</span>}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{membro.nome_completo}</p>
                <p className="text-xs text-gray-500">
                    {diaFormatado}
                    {idade !== null ? ` · completa ${idade} ano${idade !== 1 ? "s" : ""}` : ""}
                </p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {membro.cargo && <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${bg} ${text}`}>{membro.cargo}</span>}
                    {membro.departamento && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">{membro.departamento}</span>
                    )}
                </div>
            </div>
            <div className="flex gap-0.5 flex-shrink-0">
                {(membro.whatsapp || membro.celular) && (
                    <a
                        href={`https://wa.me/55${(membro.whatsapp || membro.celular).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="WhatsApp"
                    >
                        <Phone className="w-3.5 h-3.5" />
                    </a>
                )}
                {membro.email && (
                    <a href={`mailto:${membro.email}`} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="E-mail">
                        <Mail className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function AniversariosPublicos() {
    const { slug } = useParams();
    const agora = new Date();
    const [mes, setMes] = useState(agora.getMonth() + 1);
    const [ano, setAno] = useState(agora.getFullYear());
    const [modalAberto, setModalAberto] = useState(false);
    const [diaSelecionado, setDiaSelecionado] = useState(null);
    const [abaAtiva, setAbaAtiva] = useState("calendario"); // "calendario" | "lista"
    const [exportPainel, setExportPainel] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ["aniversarios-publicos", slug, mes],
        queryFn: () => publicoAPI.aniversarios(slug, mes).then((r) => r.data),
        staleTime: 60_000,
    });

    const igreja = data?.igreja || {};
    const aniversariantes = data?.aniversariantes || [];
    const hojeList = data?.hoje || [];
    const proximos = data?.proximos || [];
    const total = data?.total || 0;
    const corPrimaria = igreja?.cor_primaria || "#1a56db";
    const nomeIgreja = igreja?.nome || "";

    // Mapa dia → membros
    const porDia = useMemo(() => {
        const mapa = {};
        aniversariantes.forEach((m) => {
            const dia = parseInt(m.dia);
            if (!mapa[dia]) mapa[dia] = [];
            mapa[dia].push(m);
        });
        return mapa;
    }, [aniversariantes]);

    // Células do calendário
    const [totalDias, primeiroDia] = useMemo(() => [getDiasNoMes(ano, mes), getPrimeiroDia(ano, mes)], [ano, mes]);
    const cells = useMemo(() => {
        const arr = Array(primeiroDia)
            .fill(null)
            .concat(Array.from({ length: totalDias }, (_, i) => i + 1));
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [totalDias, primeiroDia]);

    function navMes(delta) {
        let m = mes + delta;
        let a = ano;
        if (m > 12) {
            m = 1;
            a++;
        }
        if (m < 1) {
            m = 12;
            a--;
        }
        setMes(m);
        setAno(a);
        setDiaSelecionado(null);
    }

    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();
    const diaAtual = agora.getDate();
    const ehMesAtual = mes === mesAtual && ano === anoAtual;

    const membrosDiaSelecionado = diaSelecionado ? porDia[diaSelecionado] || [] : [];
    const painelTitulo = diaSelecionado
        ? `Dia ${diaSelecionado} — ${membrosDiaSelecionado.length} aniversariante${membrosDiaSelecionado.length !== 1 ? "s" : ""}`
        : ehMesAtual && proximos.length > 0
          ? "Próximos 7 dias"
          : `${MESES[mes - 1]} — ${aniversariantes.length} aniversariante${aniversariantes.length !== 1 ? "s" : ""}`;
    const painelLista = diaSelecionado ? membrosDiaSelecionado : ehMesAtual && proximos.length > 0 ? proximos : aniversariantes;

    function handleEnviarWhatsApp(lista) {
        if (!lista.length) {
            alert("Nenhum aniversariante para compartilhar.");
            return;
        }
        const titulo = `Aniversariantes de ${MESES[mes - 1]} ${ano}`;
        const linhas = lista
            .map((m) => {
                const diaMes = fmtDiaMes(m.data_nascimento);
                const cargo = m.cargo ? `\n   Cargo: ${m.cargo}${m.departamento ? ` — ${m.departamento}` : ""}` : "";
                return `- ${m.nome_completo} — ${diaMes}${cargo}`;
            })
            .join("\n");
        const msg = `*${titulo}*\n${nomeIgreja}\n\n${linhas}\n\n_📍 Página de Aniversários_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }

    // ─── Estado de erro / loading ────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center p-8">
                    <Church className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Igreja não encontrada</h2>
                    <p className="text-gray-400 text-sm">Verifique o link e tente novamente.</p>
                </div>
            </div>
        );
    }

    if (isLoading && !data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Header ────────────────────────────────────────────────── */}
            <header
                className="shadow-lg"
                style={{
                    background: `linear-gradient(135deg, ${corPrimaria} 0%, ${igreja.cor_secundaria || "#6366f1"} 100%)`,
                }}
            >
                <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-4">
                    {igreja.logo_url ? (
                        <img src={igreja.logo_url} alt={nomeIgreja} className="h-12 w-12 rounded-full object-cover bg-white/20 flex-shrink-0" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Church className="w-6 h-6 text-white/80" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-white truncate">{nomeIgreja}</h1>
                        <p className="text-white/70 text-sm flex items-center gap-1">
                            <Cake className="w-3.5 h-3.5" /> Calendário de Aniversariantes
                        </p>
                    </div>
                    <button
                        onClick={() => setModalAberto(true)}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all backdrop-blur-sm border border-white/20 flex-shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Meu Aniversário</span>
                        <span className="sm:hidden">Cadastrar</span>
                    </button>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* ── Stats ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-pink-50 text-pink-500">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{total}</p>
                            <p className="text-xs text-gray-500">Cadastrados</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-50 text-rose-500">
                            <PartyPopper className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{hojeList.length}</p>
                            <p className="text-xs text-gray-500">Hoje</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-50 text-purple-500">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{proximos.length}</p>
                            <p className="text-xs text-gray-500">Próx. 7 dias</p>
                        </div>
                    </div>
                </div>

                {/* ── Aniversariantes hoje ───────────────────────────────── */}
                {hojeList.length > 0 && (
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <PartyPopper className="w-5 h-5 text-pink-500" />
                            <h3 className="font-semibold text-pink-700">🎉 Aniversariante{hojeList.length > 1 ? "s" : ""} Hoje!</h3>
                            <span className="ml-auto text-xs font-bold bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full">{hojeList.length}</span>
                        </div>
                        <div className="space-y-2">
                            {hojeList.map((m) => (
                                <CardMembro key={m.id} membro={m} corPrimaria={corPrimaria} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Tabs ──────────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex border-b border-gray-100">
                        {["calendario", "lista"].map((aba) => (
                            <button
                                key={aba}
                                onClick={() => setAbaAtiva(aba)}
                                className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${abaAtiva === aba ? "text-pink-600 border-b-2 border-pink-500 bg-pink-50/40" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                {aba === "calendario" ? "📅 Calendário" : "📋 Lista"}
                            </button>
                        ))}
                    </div>

                    <div className="p-4">
                        {/* ── Calendário ─────────────────────────────────── */}
                        {abaAtiva === "calendario" && (
                            <div className="flex flex-col lg:flex-row lg:gap-6">
                                {/* Grade */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <button
                                            onClick={() => navMes(-1)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-semibold text-gray-700">
                                            {MESES[mes - 1]} {ano}
                                        </span>
                                        <button
                                            onClick={() => navMes(1)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5">
                                        {SEMANA.map((s) => (
                                            <div key={s} className="text-center text-[11px] font-semibold text-gray-400 py-1">
                                                {s}
                                            </div>
                                        ))}
                                        {cells.map((dia, idx) => {
                                            if (!dia) return <div key={`e-${idx}`} />;
                                            const temAniv = !!porDia[dia];
                                            const eHoje = ehMesAtual && dia === diaAtual;
                                            const selecionado = diaSelecionado === dia;
                                            return (
                                                <button
                                                    key={dia}
                                                    onClick={() => setDiaSelecionado(temAniv ? (selecionado ? null : dia) : null)}
                                                    className={[
                                                        "relative h-11 flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all",
                                                        eHoje ? "text-white font-bold shadow-sm" : "",
                                                        temAniv && !eHoje ? "bg-pink-100 text-pink-700" : "",
                                                        selecionado ? "ring-2 ring-pink-400" : "",
                                                        !temAniv && !eHoje ? "text-gray-600 hover:bg-gray-100" : "",
                                                        temAniv ? "cursor-pointer" : "cursor-default",
                                                    ].join(" ")}
                                                    style={eHoje ? { background: corPrimaria } : {}}
                                                >
                                                    {dia}
                                                    {temAniv && <span className="w-1 h-1 rounded-full bg-pink-500 mt-0.5" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Legenda */}
                                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 rounded bg-pink-100 inline-block" /> Aniversariante
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 rounded inline-block" style={{ background: corPrimaria }} /> Hoje
                                        </span>
                                    </div>
                                </div>

                                {/* Painel lateral */}
                                <div className="lg:w-64 mt-4 lg:mt-0 flex-shrink-0">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{painelTitulo}</p>
                                    {isLoading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-5 h-5 border-2 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
                                        </div>
                                    ) : painelLista.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            <Cake className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            Nenhum aniversariante{diaSelecionado ? " neste dia" : " em breve"}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                                            {painelLista.map((m) => (
                                                <CardMembro key={m.id} membro={m} corPrimaria={corPrimaria} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Lista ─────────────────────────────────────── */}
                        {abaAtiva === "lista" && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navMes(-1)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-semibold text-gray-700">
                                            {MESES[mes - 1]} {ano}
                                        </span>
                                        <button
                                            onClick={() => navMes(1)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {aniversariantes.length} cadastrado{aniversariantes.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                {isLoading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
                                    </div>
                                ) : aniversariantes.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Cake className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Nenhum aniversariante em {MESES[mes - 1]}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {aniversariantes.map((m) => (
                                            <CardMembro key={m.id} membro={m} corPrimaria={corPrimaria} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Painel de Exportação ───────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setExportPainel((p) => !p)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">Exportar Aniversariantes</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${exportPainel ? "rotate-90" : ""}`} />
                    </button>

                    {exportPainel && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                            <p className="text-xs text-gray-500">
                                Lista de aniversariantes de{" "}
                                <strong>
                                    {MESES[mes - 1]} {ano}
                                </strong>{" "}
                                ({aniversariantes.length} cadastrado{aniversariantes.length !== 1 ? "s" : ""})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => exportarCSV(aniversariantes, `aniversariantes_${MESES[mes - 1]}_${ano}.csv`)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <FileText className="w-4 h-4" /> Exportar CSV
                                </button>
                                <button
                                    onClick={() =>
                                        gerarPDF(
                                            aniversariantes,
                                            `Aniversariantes de ${MESES[mes - 1]}`,
                                            `${MESES[mes - 1]} de ${ano}`,
                                            nomeIgreja,
                                            igreja.logo_url,
                                        )
                                    }
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" /> Exportar PDF
                                </button>
                                <button
                                    onClick={() => handleEnviarWhatsApp(aniversariantes)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" /> Compartilhar WhatsApp
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Rodapé ────────────────────────────────────────────── */}
                <p className="text-center text-xs text-gray-400 pb-4">
                    {nomeIgreja} · Página de Aniversariantes · Powered by <span className="font-semibold text-gray-500">Gestão Secretaria</span>
                </p>
            </div>

            {/* ── Modal de Cadastro ────────────────────────────────────── */}
            {modalAberto && (
                <ModalCadastro
                    slug={slug}
                    corPrimaria={corPrimaria}
                    nomeIgreja={nomeIgreja}
                    onClose={() => setModalAberto(false)}
                    onSucesso={() => {}}
                />
            )}
        </div>
    );
}
