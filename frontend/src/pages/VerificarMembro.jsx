import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicoAPI } from "../services/api";
import { CheckCircle2, XCircle, Church, ShieldCheck, User, Calendar, Hash, AlertTriangle, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Converte "#rrggbb" em [r, g, b] */
function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function dk(c, amt) {
    return Math.max(0, c - amt);
}
function toHex(r, g, b) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export default function VerificarMembro() {
    const { slug, membroId } = useParams();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["verificar", slug, membroId],
        queryFn: () => publicoAPI.verificarMembro(slug, membroId).then((r) => r.data),
        retry: false,
    });

    if (isLoading)
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-blue-200 text-sm">Verificando credencial...</p>
                </div>
            </div>
        );

    const isValido = data?.valido;
    const membro = data?.membro;
    const igreja = data?.igreja;

    const cor1 = igreja?.cor_primaria || "#1e3a8a";
    const cor2 = igreja?.cor_secundaria || "#3b82f6";
    const [r1, g1, b1] = hexToRgb(cor1);
    const corDark = toHex(dk(r1, 30), dk(g1, 30), dk(b1, 30));
    const corDark2 = toHex(dk(r1, 15), dk(g1, 15), dk(b1, 15));

    const agora = new Date();
    const dataVerificacao = format(agora, "dd/MM/yyyy", { locale: ptBR });
    const horaVerificacao = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const numRol = membro?.numero ? String(membro.numero).padStart(4, "0") : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
            <div className="w-full max-w-xs">
                {/* ── CARTÃO EM RETRATO ───────────────────────────────── */}
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl select-none" style={{ background: "#fcfdff" }}>
                    {isError ? (
                        <div className="p-10 text-center">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-8 h-8 text-amber-500" />
                            </div>
                            <p className="font-bold text-gray-800">QR Code Inválido</p>
                            <p className="text-sm text-gray-400 mt-1">Credencial não pôde ser verificada.</p>
                        </div>
                    ) : (
                        <>
                            {/* ══ CABEÇALHO — gradiente idêntico ao PDF ══ */}
                            <div
                                className="relative overflow-hidden px-4 pt-5 pb-4"
                                style={{ background: `linear-gradient(90deg, ${cor1} 0%, ${cor2} 100%)` }}
                            >
                                <div
                                    className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
                                    style={{ background: "rgba(255,255,255,0.08)" }}
                                />
                                <div
                                    className="absolute right-6 bottom-0 w-20 h-20 rounded-full pointer-events-none"
                                    style={{ background: "rgba(255,255,255,0.06)" }}
                                />

                                <div className="relative z-10 flex items-center gap-3">
                                    <div
                                        className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
                                        style={{ background: "rgba(255,255,255,0.15)" }}
                                    >
                                        {igreja?.logo_url ? (
                                            <img src={igreja.logo_url} alt="" className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <Church className="w-7 h-7 text-white" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p
                                            className="text-[9px] uppercase tracking-widest font-semibold mb-0.5"
                                            style={{ color: "rgba(255,255,255,0.7)" }}
                                        >
                                            Carteira de Membro
                                        </p>
                                        <p className="text-white font-bold text-sm leading-tight">{igreja?.nome || "—"}</p>
                                    </div>
                                </div>

                                {/* Barra escura inferior — igual ao rodapé do PDF */}
                                <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: corDark }} />
                            </div>

                            {/* ══ IDENTIDADE ═══════════════════════════ */}
                            <div className="px-4 pt-4 pb-2 text-center border-b border-gray-100">
                                <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-0.5">Carteira de Identidade de</p>
                                <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: cor1 }}>
                                    {membro?.cargo || "Membro"}
                                </p>
                            </div>

                            {/* ══ FOTO 3×4 — igual ao PDF ══════════════ */}
                            <div className="flex justify-center pt-5 pb-3">
                                <div
                                    className="relative rounded-lg overflow-hidden"
                                    style={{
                                        width: 96,
                                        height: 128,
                                        boxShadow: `0 0 0 3px ${cor1}, 0 0 0 5px white, 0 4px 16px rgba(0,0,0,0.18)`,
                                    }}
                                >
                                    {membro?.foto_url ? (
                                        <img src={membro.foto_url} alt={membro.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center" style={{ background: "#f0f4fc" }}>
                                            <User className="w-12 h-12" style={{ color: "#c0c8dc" }} />
                                        </div>
                                    )}
                                    {/* Badge situação no canto da foto */}
                                    <div
                                        className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                                        style={{ background: isValido ? "#10b981" : "#ef4444", boxShadow: "0 0 0 2px white" }}
                                    >
                                        {isValido ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-white" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ══ NOME + linha divisória (igual ao PDF) ═ */}
                            <div className="text-center px-4 pb-4">
                                <p className="font-bold text-gray-900 text-base leading-snug">{membro?.nome || "—"}</p>
                                <div className="mt-2 mx-auto h-0.5 w-20 rounded-full" style={{ background: cor1 }} />
                            </div>

                            {/* ══ DADOS ════════════════════════════════ */}
                            <div className="mx-3 mb-3 rounded-xl overflow-hidden border border-gray-100">
                                <DataRow icon={<Hash className="w-3 h-3" />} label="Nº do Membro">
                                    <span className="font-mono font-bold tracking-widest" style={{ color: cor1 }}>
                                        {numRol ?? "—"}
                                    </span>
                                </DataRow>
                                <DataRow icon={<Calendar className="w-3 h-3" />} label="Membro desde">
                                    {membro?.membro_desde
                                        ? format(new Date(membro.membro_desde + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                        : "—"}
                                </DataRow>
                                {membro?.congregacao && (
                                    <DataRow icon={<Building2 className="w-3 h-3" />} label="Congregação">
                                        {membro.congregacao}
                                    </DataRow>
                                )}
                                <DataRow icon={<ShieldCheck className="w-3 h-3" />} label="Situação">
                                    <span className="font-bold capitalize" style={{ color: isValido ? "#059669" : "#dc2626" }}>
                                        {membro?.situacao || "—"}
                                    </span>
                                </DataRow>
                            </div>

                            {/* ══ RODAPÉ — gradiente escuro igual ao PDF ═ */}
                            <div
                                className="px-4 py-3 flex items-center justify-between"
                                style={{ background: `linear-gradient(90deg, ${corDark} 0%, ${corDark2} 50%, ${cor1} 100%)` }}
                            >
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-3 h-3" style={{ color: "rgba(255,255,255,0.6)" }} />
                                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                                        {igreja?.nome_curto || igreja?.nome || "—"}
                                    </span>
                                </div>
                                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                                    {dataVerificacao}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* ── SELO DE VERIFICAÇÃO (abaixo do cartão) ──────── */}
                {!isError && (
                    <div
                        className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
                        style={{
                            background: isValido ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                            border: `1px solid ${isValido ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                        }}
                    >
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: isValido ? "#10b981" : "#ef4444" }}
                        >
                            {isValido ? <CheckCircle2 className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                            <p className="font-bold text-sm" style={{ color: isValido ? "#d1fae5" : "#fee2e2" }}>
                                {isValido ? "Credencial Verificada" : "Credencial Inválida"}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                                Verificado em {dataVerificacao} às {horaVerificacao}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DataRow({ icon, label, children }) {
    return (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0 bg-white">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] shrink-0">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-[13px] text-gray-800 font-medium text-right">{children}</div>
        </div>
    );
}
