import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardAPI, aniversariosPublicosAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import {
    Cake,
    Calendar,
    Download,
    PartyPopper,
    Clock,
    Phone,
    Mail,
    Search,
    ChevronLeft,
    ChevronRight,
    Users,
    FileText,
    MessageSquare,
    Share2,
    Trash2,
    UserX,
    AlertTriangle,
} from "lucide-react";
import { parseISO } from "date-fns";
import CalendarioAniversariantes from "../../components/CalendarioAniversariantes";

// ─── Constantes ───────────────────────────────────────────────────────────
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const TABS = ["Calendário", "Lista", "Cadastros Externos"];

// ─── Cargo / ministério — cores de destaque ──────────────────────────────
function getCargoVariant(cargo) {
    if (!cargo) return "default";
    const c = cargo.toLowerCase();
    if (/pastor|bispo|ap[oó]stolo|reverendo/.test(c)) return "purple";
    if (/presb[ií]tero|anc[ií][ãa]o|obreiro/.test(c)) return "blue";
    if (/di[áa]con[ao]/.test(c)) return "cyan";
    if (/evangelista|mission[áa]rio/.test(c)) return "green";
    if (/l[íi]der|dirig|coordenador|supervisor|minist/.test(c)) return "amber";
    return "default";
}

const CARGO_CLASSES = {
    purple: "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300",
    blue: "bg-blue-100   dark:bg-blue-500/15   text-blue-700   dark:text-blue-300",
    cyan: "bg-cyan-100   dark:bg-cyan-500/15   text-cyan-700   dark:text-cyan-300",
    green: "bg-green-100  dark:bg-green-500/15  text-green-700  dark:text-green-300",
    amber: "bg-amber-100  dark:bg-amber-500/15  text-amber-700  dark:text-amber-300",
    default: "bg-gray-100   dark:bg-gray-700/60   text-gray-600   dark:text-gray-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────
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

// ─── Geração de PDF premium ───────────────────────────────────────────────
function gerarPDF(lista, titulo, subtitulo, nomeIgreja, logoUrl) {
    if (!lista || lista.length === 0) {
        alert("Nenhum aniversariante para exportar.");
        return;
    }

    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const colunas = lista.length > 16 ? 3 : 2;

    const cards = lista
        .map((m) => {
            const dataNasc = m.data_nascimento ? new Date(m.data_nascimento + "T12:00:00") : null;
            const diaFormatado = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "—";
            const idade = calcularIdade(m.data_nascimento);
            const iniciais = (m.nome_completo || "?")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();
            const cargo = m.cargo || "";
            const avatarHtml = m.foto_url
                ? `<img src="${m.foto_url}" class="avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="avatar-fallback" style="display:none">${iniciais}</div>`
                : `<div class="avatar-fallback">${iniciais}</div>`;
            return `
            <div class="card">
                <div class="avatar">${avatarHtml}</div>
                <div class="info">
                    <div class="nome">${m.nome_completo}</div>
                    ${cargo ? `<div class="cargo">${cargo}</div>` : ""}
                    <div class="data">🎂 ${diaFormatado}${idade !== null ? ` &middot; completa <strong>${idade + 1}</strong> ano${idade + 1 !== 1 ? "s" : ""}` : ""}</div>
                </div>
            </div>`;
        })
        .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo} — ${nomeIgreja}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: #fff;
    color: #1a1a2e;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page { width: 210mm; min-height: 297mm; position: relative; padding-bottom: 44px; }

  /* ─── Header ──────────────────────────────── */
  .header {
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #7c2d9b 72%, #be185d 100%);
    padding: 22px 40px 22px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: ""; position: absolute;
    top: -80px; right: -60px;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(251,191,36,.18) 0%, transparent 70%);
    border-radius: 50%;
  }
  .header::after {
    content: ""; position: absolute;
    bottom: -90px; left: 20px;
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(167,139,250,.15) 0%, transparent 70%);
    border-radius: 50%;
  }
  .header-row {
    display: flex; align-items: center;
    gap: 20px;
    position: relative; z-index: 1;
  }
  .church-logo {
    height: 72px; max-width: 160px;
    display: flex; align-items: center; justify-content: center;
    font-size: 40px; flex-shrink: 0;
  }
  .church-logo img { height: 100%; max-width: 160px; object-fit: contain; }
  .title-area { position: relative; z-index: 1; flex: 1; }
  .main-title {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 38px; font-weight: 700;
    color: #fff; letter-spacing: -.01em; line-height: 1.1;
  }
  .main-title .accent { color: #fbbf24; }

  /* ─── Faixa ornamental ─────────────────────── */
  .ornament {
    height: 5px;
    background: linear-gradient(90deg, #fbbf24 0%, #f472b6 45%, #a855f7 100%);
  }

  /* ─── Stats ────────────────────────────────── */
  .stats {
    display: flex; align-items: center;
    background: #faf5ff;
    border-bottom: 1px solid #ede9fe;
    padding: 8px 36px; gap: 24px;
  }
  .stat-pill {
    display: flex; align-items: center; gap: 6px;
  }
  .stat-n {
    font-size: 15px; font-weight: 700;
    color: #7c2d9b; line-height: 1;
  }
  .stat-l {
    font-size: 9px; text-transform: uppercase;
    letter-spacing: .09em; color: #a78bfa;
    font-weight: 600;
  }
  .stat-dot { color: #d8b4fe; font-size: 10px; }

  /* ─── Content ──────────────────────────────── */
  .content { padding: 22px 36px 32px; }

  /* ─── Grid cards ───────────────────────────── */
  .grid {
    display: grid;
    grid-template-columns: repeat(${colunas}, 1fr);
    gap: 10px;
  }
  .card {
    display: flex; align-items: center;
    gap: 11px; padding: 11px 13px;
    border-radius: 10px;
    border: 1px solid #ede9fe;
    background: linear-gradient(135deg, #fdf4ff 0%, #fff 100%);
    position: relative; overflow: hidden;
    page-break-inside: avoid;
  }
  .card::before {
    content: ""; position: absolute;
    left: 0; top: 0; bottom: 0; width: 3px;
    background: linear-gradient(180deg, #a855f7, #ec4899);
    border-radius: 10px 0 0 10px;
  }
  .avatar {
    width: 40px; height: 40px; flex-shrink: 0;
    border-radius: 50%; overflow: hidden;
    background: linear-gradient(135deg, #7c3aed, #db2777);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-fallback {
    color: #fff; font-size: 14px; font-weight: 700;
    letter-spacing: -.02em; display: flex;
    align-items: center; justify-content: center;
    width: 100%; height: 100%;
  }
  .info { flex: 1; min-width: 0; }
  .nome {
    font-size: 12px; font-weight: 600;
    color: #1e1b4b;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cargo {
    font-size: 9px; color: #7c3aed; font-weight: 600;
    margin-top: 1px; text-transform: uppercase;
    letter-spacing: .06em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .data { font-size: 10px; color: #6b7280; margin-top: 3px; }
  .data strong { color: #be185d; }

  /* ─── Footer ───────────────────────────────── */
  .footer {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 36px;
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #7c2d9b 100%);
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 0 36px;
  }
  .footer-text {
    font-size: 9px; color: rgba(255,255,255,.55);
    letter-spacing: .08em; text-transform: uppercase;
  }
  .footer-verse {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 11px; font-style: italic;
    color: rgba(255,255,255,.5);
  }

  .empty { text-align: center; padding: 60px; color: #9ca3af; font-size: 15px; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .footer { position: fixed; bottom: 0; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-row">
      <div class="church-logo">
        ${logoUrl ? `<img src="${logoUrl}" onerror="this.style.display='none';this.parentElement.innerText='⛪'" />` : "⛪"}
      </div>
      <div class="title-area">
        <div class="main-title">🎂 <span class="accent">${titulo}</span></div>
      </div>
    </div>
  </div>

  <div class="ornament"></div>

  <div class="stats">
    <div class="stat-pill">
      <span class="stat-n">${lista.length}</span>
      <span class="stat-l">Aniversariante${lista.length !== 1 ? "s" : ""}</span>
    </div>
    <span class="stat-dot">•</span>
    <div class="stat-pill">
      <span class="stat-l">${subtitulo}</span>
    </div>
  </div>

  <div class="content">
    ${lista.length === 0 ? '<div class="empty">Nenhum aniversariante no período.</div>' : `<div class="grid">${cards}</div>`}
  </div>

  <div class="footer">
    <span class="footer-text">Gestão Secretaria</span>
    <span class="footer-verse">"Que o Senhor te abençoe" — Nm 6:24</span>
    <span class="footer-text">${nomeIgreja}</span>
  </div>

</div>
<script>
  window.onload = function () {
    setTimeout(function () { window.print(); }, 600);
  };
<\/script>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
        alert("Pop-up bloqueado. Permita pop-ups para esta página e tente novamente.");
        return;
    }
    w.document.write(html);
    w.document.close();
}

function exportarCSV(lista, nomeArquivo) {
    if (!lista || lista.length === 0) {
        alert("Nenhum aniversariante para exportar.");
        return;
    }

    // Ponto-e-vírgula: separador padrão do Excel nas regiões que usam vírgula como decimal (pt-BR)
    const SEP = ";";

    // Instrui o Excel a usar ";" independente da configuração regional
    const sepHint = `sep=${SEP}\n`;

    const cabecalhos = ["Nome Completo", "Data de Nascimento", "Dia / Mês", "Idade Atual", "Fará Anos", "Cargo / Função", "Celular", "E-mail"];
    const header = cabecalhos.map((h) => `"${h}"`).join(SEP) + "\n";

    const esc = (v) => `"${(v || "").replace(/"/g, '""')}"`;

    const linhas = lista
        .map((m) => {
            const dataNasc = m.data_nascimento ? new Date(m.data_nascimento + "T12:00:00") : null;
            const dataFormatada = dataNasc ? dataNasc.toLocaleDateString("pt-BR") : "";
            const diaMes = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
            const idadeAtual = calcularIdade(m.data_nascimento);
            const faraAnos = idadeAtual !== null ? idadeAtual + 1 : "";

            return [
                esc(m.nome_completo),
                esc(dataFormatada),
                esc(diaMes),
                idadeAtual !== null ? idadeAtual : "", // número sem aspas → Excel reconhece como inteiro
                faraAnos,
                esc(m.cargo),
                esc(m.celular),
                esc(m.email),
            ].join(SEP);
        })
        .join("\n");

    // Codifica como Windows-1252: caracteres U+00–U+FF mapeiam diretamente ao byte
    // (Excel brasileiro lê CSV nessa codificação por padrão; o BOM UTF-8 é ignorado em muitas versões)
    const conteudo = sepHint + header + linhas;
    const bytes = new Uint8Array(conteudo.length);
    for (let i = 0; i < conteudo.length; i++) {
        const cp = conteudo.charCodeAt(i);
        bytes[i] = cp <= 0xff ? cp : 0x3f; // '?' para caracteres fora do Latin-1
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

// ─── Stat Card ────────────────────────────────────────────────────────────
const CARD_ACCENTS_BDAY = {
    pink: "from-pink-400/80 to-pink-300/60",
    purple: "from-purple-400/80 to-purple-300/60",
    blue: "from-primary/80 to-primary-300/60",
    amber: "from-amber-400/80 to-amber-300/60",
};

function StatCard({ icon: Icon, label, value, sub, color = "pink" }) {
    const colors = {
        pink: "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400",
        purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
        blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
        amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
    return (
        <div className="card-stat flex items-center gap-4">
            <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r ${CARD_ACCENTS_BDAY[color]}`} />
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${colors[color]}`}>
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

// ─── Member Card (lista) ──────────────────────────────────────────────────
function MemberCard({ membro }) {
    const hoje = new Date();
    const dataNasc = membro.data_nascimento ? new Date(membro.data_nascimento + "T12:00:00") : null;
    const ehHoje = dataNasc && dataNasc.getMonth() === hoje.getMonth() && dataNasc.getDate() === hoje.getDate();
    const idade = calcularIdade(membro.data_nascimento);

    const diaFormatado = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "";

    return (
        <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                ehHoje
                    ? "bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 border-pink-200 dark:border-pink-500/30 shadow-sm"
                    : "bg-white dark:bg-dark-800 border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:border-gray-200 dark:hover:border-gray-600"
            }`}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                {membro.foto_url ? (
                    <img src={membro.foto_url} alt={membro.nome_completo} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                    <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${ehHoje ? "bg-pink-200 dark:bg-pink-500/30" : "bg-gray-100 dark:bg-gray-700"}`}
                    >
                        <span className={`font-semibold text-sm ${ehHoje ? "text-pink-700 dark:text-pink-300" : "text-gray-500 dark:text-gray-400"}`}>
                            {membro.nome_completo?.[0]?.toUpperCase() || "?"}
                        </span>
                    </div>
                )}
                {ehHoje && <span className="absolute -top-1 -right-1 text-sm leading-none">🎂</span>}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{membro.nome_completo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {diaFormatado}
                    {idade !== null ? ` · completa ${idade + 1} ano${idade + 1 !== 1 ? "s" : ""}` : ""}
                </p>
                {membro.cargo && (
                    <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold inline-block mt-0.5 truncate max-w-full ${CARGO_CLASSES[getCargoVariant(membro.cargo)]}`}
                    >
                        {membro.cargo}
                    </span>
                )}
            </div>

            {/* Contatos */}
            <div className="flex gap-0.5 flex-shrink-0">
                {membro.celular && (
                    <a
                        href={`https://wa.me/55${membro.celular.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        title="WhatsApp"
                    >
                        <Phone className="w-3.5 h-3.5" />
                    </a>
                )}
                {membro.email && (
                    <a
                        href={`mailto:${membro.email}`}
                        className="p-1.5 rounded-lg text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        title="E-mail"
                    >
                        <Mail className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>
        </div>
    );
}
// ─── Seção de Hoje + Próximos ─────────────────────────────────────────────
function SecaoDestaques({ hoje, proximos }) {
    if (hoje.length === 0 && proximos.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aniversariantes hoje */}
            {hoje.length > 0 && (
                <div className="card border-pink-100 dark:border-pink-500/20">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center">
                            <PartyPopper className="w-4 h-4 text-pink-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">🎉 Aniversariante{hoje.length > 1 ? "s" : ""} Hoje</h3>
                        <span className="ml-auto text-xs font-semibold bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full">
                            {hoje.length}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {hoje.map((m) => (
                            <MemberCard key={m.id} membro={m} />
                        ))}
                    </div>
                </div>
            )}

            {/* Próximos 7 dias */}
            {proximos.length > 0 && (
                <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-purple-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Próximos 7 Dias</h3>
                        <span className="ml-auto text-xs font-semibold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                            {proximos.length}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {proximos.map((m) => (
                            <MemberCard key={m.id} membro={m} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────
export default function Aniversarios() {
    const agora = new Date();
    const mesAtual = agora.getMonth() + 1;
    const proximoMes = mesAtual === 12 ? 1 : mesAtual + 1;

    const [tab, setTab] = useState("Calendário");
    const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
    const [anoSelecionado, setAnoSelecionado] = useState(agora.getFullYear());
    const [busca, setBusca] = useState("");

    // ── Aba Cadastros Externos ─────────────────────────────────────────────
    const [buscaExternos, setBuscaExternos] = useState("");
    const [confirmandoRemocao, setConfirmandoRemocao] = useState(null); // id do registro
    const queryClient = useQueryClient();

    // ── Painel de exportação ───────────────────────────────────────────────
    const [exportTipo, setExportTipo] = useState("mes"); // "semana" | "mes"
    const [exportMes, setExportMes] = useState(mesAtual);
    const [exportAno, setExportAno] = useState(agora.getFullYear());

    const { usuario } = useAuth();

    // ── Queries ──────────────────────────────────────────────────────────
    const { data: dataAtual } = useQuery({
        queryKey: ["aniversariantes", agora.getFullYear(), mesAtual],
        queryFn: () => dashboardAPI.aniversariantes(mesAtual).then((r) => r.data),
    });

    const { data: dataProxMes } = useQuery({
        queryKey: ["aniversariantes", agora.getFullYear(), proximoMes],
        queryFn: () => dashboardAPI.aniversariantes(proximoMes).then((r) => r.data),
    });

    const { data: dataSemana } = useQuery({
        queryKey: ["aniversariantes-semana"],
        queryFn: () => dashboardAPI.aniversariantesSemana().then((r) => r.data),
    });

    const { data: dataLista, isLoading: loadingLista } = useQuery({
        queryKey: ["aniversariantes", anoSelecionado, mesSelecionado],
        queryFn: () => dashboardAPI.aniversariantes(mesSelecionado).then((r) => r.data),
    });

    const { data: dataExport } = useQuery({
        queryKey: ["aniversariantes-export", exportAno, exportMes],
        queryFn: () => dashboardAPI.aniversariantes(exportMes).then((r) => r.data),
        enabled: exportTipo === "mes",
    });

    const { data: dataExternos, isLoading: loadingExternos } = useQuery({
        queryKey: ["aniversarios-publicos", buscaExternos],
        queryFn: () => aniversariosPublicosAPI.listar({ busca: buscaExternos, limit: 200 }).then((r) => r.data),
        enabled: tab === "Cadastros Externos",
    });

    const mutacaoRemover = useMutation({
        mutationFn: (id) => aniversariosPublicosAPI.remover(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aniversarios-publicos"] });
            setConfirmandoRemocao(null);
        },
    });

    // ── Dados derivados ───────────────────────────────────────────────────
    const hoje = dataAtual?.hoje || [];
    const proximos = dataAtual?.proximos || [];
    const estesMes = dataAtual?.aniversariantes || [];
    const semana = dataSemana?.aniversariantes || [];
    const proxMesCount = dataProxMes?.aniversariantes?.length || 0;
    const listaExportar = exportTipo === "semana" ? semana : dataExport?.aniversariantes || [];

    const listaFiltrada = useMemo(() => {
        const lista = dataLista?.aniversariantes || [];
        if (!busca.trim()) return lista;
        const b = busca.toLowerCase();
        return lista.filter((m) => m.nome_completo?.toLowerCase().includes(b));
    }, [dataLista, busca]);

    // ── Navegação de mês (aba Lista) ──────────────────────────────────────
    function navMes(delta) {
        let novoMes = mesSelecionado + delta;
        let novoAno = anoSelecionado;
        if (novoMes > 12) {
            novoMes = 1;
            novoAno++;
        }
        if (novoMes < 1) {
            novoMes = 12;
            novoAno--;
        }
        setMesSelecionado(novoMes);
        setAnoSelecionado(novoAno);
        setBusca("");
    }

    // ── Navegação de mês (painel exportação) ──────────────────────────────
    function navExportMes(delta) {
        let m = exportMes + delta;
        let a = exportAno;
        if (m > 12) {
            m = 1;
            a++;
        }
        if (m < 1) {
            m = 12;
            a--;
        }
        setExportMes(m);
        setExportAno(a);
    }

    const nomeIgreja = usuario?.igreja?.nome || "Igreja";
    const logoUrl = usuario?.igreja?.logo_url || "";

    // ── Handlers unificados de exportação ──────────────────────────────────
    function handleExportarCSV() {
        const nome =
            exportTipo === "semana"
                ? `aniversariantes_semana_${agora.toISOString().slice(0, 10)}.csv`
                : `aniversariantes_${MESES[exportMes - 1]}_${exportAno}.csv`;
        exportarCSV(listaExportar, nome);
    }

    function handleExportarPDF() {
        if (exportTipo === "semana") {
            const inicioSemana = new Date(agora);
            inicioSemana.setDate(agora.getDate() - agora.getDay());
            const fimSemana = new Date(inicioSemana);
            fimSemana.setDate(inicioSemana.getDate() + 6);
            const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
            gerarPDF(listaExportar, `Aniversariantes da Semana`, `${fmt(inicioSemana)} a ${fmt(fimSemana)}`, nomeIgreja, logoUrl);
        } else {
            gerarPDF(listaExportar, `Aniversariantes de ${MESES[exportMes - 1]}`, `${MESES[exportMes - 1]} de ${exportAno}`, nomeIgreja, logoUrl);
        }
    }
    // ── Handler unificado de WhatsApp ─────────────────────────────────
    function handleEnviarWhatsApp() {
        if (!listaExportar.length) {
            alert("Nenhum aniversariante para compartilhar.");
            return;
        }
        const titulo = exportTipo === "semana" ? `Aniversariantes da Semana` : `Aniversariantes de ${MESES[exportMes - 1]} ${exportAno}`;

        const linhas = listaExportar
            .map((m) => {
                const dataNasc = m.data_nascimento ? new Date(m.data_nascimento + "T12:00:00") : null;
                const diaMes = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
                const cargo = m.cargo ? `\n   Cargo: ${m.cargo}` : "";
                return `- ${m.nome_completo} — ${diaMes}${cargo}`;
            })
            .join("\n");

        const mensagem = `*${titulo}*\n${nomeIgreja}\n\n${linhas}\n\n_Envio automático pelo Sistema_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
    }
    // ── Sub-título de usuário ─────────────────────────────────────────────
    const primeiroNome = usuario?.nome?.split(" ")[0];

    return (
        <div className="space-y-6">
            {/* ── Cabeçalho ─────────────────────────────────────────────── */}
            <div>
                <h1 className="page-title">Aniversários</h1>
                <p className="page-subtitle">
                    {primeiroNome ? `${primeiroNome}, acompanhe os aniversariantes da sua igreja.` : "Acompanhe os aniversariantes da sua igreja."}
                </p>
            </div>

            {/* ── Cards de resumo ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={PartyPopper}
                    label="Aniversariantes Hoje"
                    value={hoje.length}
                    sub={hoje.length > 0 ? hoje.map((m) => m.nome_completo.split(" ")[0]).join(", ") : "Nenhum hoje"}
                    color="pink"
                />
                <StatCard
                    icon={Calendar}
                    label="Esta Semana"
                    value={semana.length}
                    sub={
                        semana.length > 0
                            ? semana
                                  .slice(0, 3)
                                  .map((m) => m.nome_completo.split(" ")[0])
                                  .join(", ") + (semana.length > 3 ? "…" : "")
                            : "Nenhum esta semana"
                    }
                    color="purple"
                />
                <StatCard icon={Cake} label={`Em ${MESES[mesAtual - 1]}`} value={estesMes.length} sub="Mês atual" color="blue" />
                <StatCard icon={Clock} label={`Em ${MESES[proximoMes - 1]}`} value={proxMesCount} sub="Próximo mês" color="amber" />
            </div>

            {/* ── Destaques (hoje + próximos 7 dias) ───────────────────── */}
            <SecaoDestaques hoje={hoje} proximos={proximos} />

            {/* ── Abas + barra de exportação ────────────────────────────── */}
            <div>
                {/* Toolbar: abas (esquerda) + exportação (direita) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-0">
                    {/* Abas */}
                    <div className="flex">
                        {TABS.map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                    tab === t
                                        ? "border-primary text-primary dark:text-primary-300"
                                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                {t === "Calendário" && <span className="mr-1.5">📅</span>}
                                {t === "Lista" && <span className="mr-1.5">📋</span>}
                                {t === "Cadastros Externos" && <span className="mr-1.5">🌐</span>}
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Controles de exportação inline */}
                    <div className="flex items-center gap-2 pb-2 sm:pb-0 flex-wrap sm:flex-nowrap">
                        {/* Seletor segmentado semana/mês */}
                        <div className="flex bg-gray-100 dark:bg-gray-700/60 rounded-lg p-0.5">
                            <button
                                onClick={() => setExportTipo("semana")}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    exportTipo === "semana"
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                Semana
                            </button>
                            <button
                                onClick={() => setExportTipo("mes")}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    exportTipo === "mes"
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                Mês
                            </button>
                        </div>

                        {/* Seletor de mês (só quando "mes") */}
                        {exportTipo === "mes" && (
                            <div className="flex items-center gap-0.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                                <button
                                    onClick={() => navExportMes(-1)}
                                    className="p-1.5 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {MESES[exportMes - 1]} {exportAno}
                                </span>
                                <button
                                    onClick={() => navExportMes(1)}
                                    className="p-1.5 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Contador */}
                        <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:block">
                            {exportTipo === "semana" ? `${semana.length} nesta semana` : `${listaExportar.length} em ${MESES[exportMes - 1]}`}
                        </span>

                        {/* Divisor */}
                        <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700" />

                        {/* Botões CSV + PDF */}
                        <div className="flex gap-1.5">
                            <button
                                onClick={handleExportarCSV}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                CSV
                            </button>
                            <button
                                onClick={handleExportarPDF}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                PDF
                            </button>
                            <button
                                onClick={handleEnviarWhatsApp}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                title="Compartilhar lista no WhatsApp"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp
                            </button>
                            {usuario?.igreja?.slug && (
                                <a
                                    href={`/aniversarios/${usuario.igreja.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                    title="Ver página pública de aniversários"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    Pública
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    {/* ── Tab: Calendário ─── */}
                    {tab === "Calendário" && <CalendarioAniversariantes mes={exportMes} ano={exportAno} onNavMes={navExportMes} />}

                    {/* ── Tab: Cadastros Externos ─── */}
                    {tab === "Cadastros Externos" && (
                        <div className="space-y-4">
                            {/* Cabeçalho */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Aniversariantes cadastrados diretamente na página pública da sua igreja.
                                    </p>
                                </div>
                                <div className="relative flex-shrink-0 w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={buscaExternos}
                                        onChange={(e) => setBuscaExternos(e.target.value)}
                                        placeholder="Buscar por nome, telefone…"
                                        className="input pl-9 w-full"
                                    />
                                </div>
                            </div>

                            {/* Modal de confirmação */}
                            {confirmandoRemocao && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">Remover cadastro?</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Esta ação não pode ser desfeita.</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setConfirmandoRemocao(null)}
                                                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => mutacaoRemover.mutate(confirmandoRemocao)}
                                                disabled={mutacaoRemover.isPending}
                                                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                                            >
                                                {mutacaoRemover.isPending ? "Removendo…" : "Remover"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Lista */}
                            {loadingExternos ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-7 h-7 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : !dataExternos?.registros?.length ? (
                                <div className="text-center py-16 space-y-3">
                                    <UserX className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto" />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                                        {buscaExternos ? "Nenhum resultado para a busca." : "Nenhum cadastro recebido pela página pública."}
                                    </p>
                                    {buscaExternos && (
                                        <button onClick={() => setBuscaExternos("")} className="text-sm text-primary hover:underline">
                                            Limpar busca
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {dataExternos.registros.length} cadastro{dataExternos.registros.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {dataExternos.registros.map((reg) => {
                                            const dataNasc = reg.data_nascimento ? new Date(reg.data_nascimento + "T12:00:00") : null;
                                            const diaMes = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "—";
                                            const dataRegistro = new Date(reg.created_at).toLocaleDateString("pt-BR", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            });
                                            return (
                                                <div
                                                    key={reg.id}
                                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                                                >
                                                    {/* Avatar */}
                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                                                            {reg.nome_completo?.[0]?.toUpperCase() || "?"}
                                                        </span>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                            {reg.nome_completo}
                                                        </p>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">🎂 {diaMes}</span>
                                                            {reg.cargo && (
                                                                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                                                                    {reg.cargo}
                                                                </span>
                                                            )}
                                                            {reg.congregacao && (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                    📍 {reg.congregacao}
                                                                </span>
                                                            )}
                                                            {reg.celular && (
                                                                <a
                                                                    href={`https://wa.me/55${reg.celular.replace(/\D/g, "")}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                                                                >
                                                                    📱 {reg.celular}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Data de cadastro */}
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block">
                                                        {dataRegistro}
                                                    </span>

                                                    {/* Botão remover */}
                                                    <button
                                                        onClick={() => setConfirmandoRemocao(reg.id)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                                                        title="Remover cadastro"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab: Lista ─────── */}
                    {tab === "Lista" && (
                        <div className="space-y-4">
                            {/* Controles */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Navegação de mês */}
                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 flex-shrink-0">
                                    <button
                                        onClick={() => navMes(-1)}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
                                        {MESES[mesSelecionado - 1]} {anoSelecionado}
                                    </span>
                                    <button
                                        onClick={() => navMes(1)}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Busca */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={busca}
                                        onChange={(e) => setBusca(e.target.value)}
                                        placeholder="Buscar por nome…"
                                        className="input pl-9 w-full"
                                    />
                                </div>
                            </div>

                            {/* Contador */}
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Users className="w-4 h-4" />
                                <span>
                                    {loadingLista
                                        ? "Carregando…"
                                        : `${listaFiltrada.length} aniversariante${
                                              listaFiltrada.length !== 1 ? "s" : ""
                                          } em ${MESES[mesSelecionado - 1]} ${anoSelecionado}`}
                                </span>
                            </div>

                            {/* Grade de membros */}
                            {loadingLista ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-7 h-7 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : listaFiltrada.length === 0 ? (
                                <div className="text-center py-16 space-y-3">
                                    <Cake className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto" />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                                        {busca ? "Nenhum resultado para a busca." : `Nenhum aniversariante em ${MESES[mesSelecionado - 1]}.`}
                                    </p>
                                    {busca && (
                                        <button onClick={() => setBusca("")} className="text-sm text-primary hover:underline">
                                            Limpar busca
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {listaFiltrada.map((m) => (
                                        <MemberCard key={m.id} membro={m} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
