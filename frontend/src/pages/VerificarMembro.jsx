import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicoAPI } from "../services/api";
import { CheckCircle2, XCircle, Church, ShieldCheck, User, Calendar, Hash, AlertTriangle, Building2, BadgeCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    const corPrimaria = igreja?.cor_primaria || "#1a56db";
    const corSecundaria = igreja?.cor_secundaria || "#6366f1";

    const agora = new Date();
    const dataVerificacao = format(agora, "dd/MM/yyyy", { locale: ptBR });
    const horaVerificacao = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Topo — branding do app */}
                <div className="text-center mb-5">
                    <div className="inline-flex w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl items-center justify-center mb-2.5 ring-1 ring-white/20">
                        <Church className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-blue-200 text-xs tracking-widest uppercase">Verificação de Credencial</p>
                </div>

                {/* ── CARTEIRINHA ─────────────────────────────────────────── */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* Erro de QR code */}
                    {isError ? (
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-10 h-10 text-amber-500" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">QR Code Inválido</h2>
                            <p className="text-sm text-gray-500 mt-1">Este código não pôde ser verificado.</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Cabeçalho da carteirinha (gradiente da igreja) ── */}
                            <div
                                className="relative px-5 pt-5 pb-16 overflow-hidden"
                                style={{ background: `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)` }}
                            >
                                {/* Círculos decorativos */}
                                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
                                <div className="absolute right-4 top-12 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

                                {/* Logo e nome da igreja */}
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                                        {igreja?.logo_url ? (
                                            <img src={igreja.logo_url} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <Church className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white/70 text-[10px] uppercase tracking-wider font-medium">Carteira de Membro</p>
                                        <p className="text-white font-bold text-sm leading-tight truncate">{igreja?.nome || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Foto do membro (sobreposta ao cabeçalho) ── */}
                            <div className="relative flex justify-center -mt-12">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl bg-gray-100">
                                        {membro?.foto_url ? (
                                            <img src={membro.foto_url} alt={membro.nome} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-12 h-12 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Badge de situação no canto da foto */}
                                    <div
                                        className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white shadow-md
                                            ${isValido ? "bg-emerald-500" : "bg-red-500"}`}
                                    >
                                        {isValido ? <CheckCircle2 className="w-4 h-4 text-white" /> : <XCircle className="w-4 h-4 text-white" />}
                                    </div>
                                </div>
                            </div>

                            {/* ── Nome e cargo ── */}
                            <div className="text-center px-5 pt-3 pb-4">
                                <h2 className="font-bold text-gray-900 text-base leading-snug">{membro?.nome || "—"}</h2>
                                {membro?.cargo && (
                                    <span
                                        className="inline-block mt-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                                        style={{ backgroundColor: `${corPrimaria}18`, color: corPrimaria }}
                                    >
                                        {membro.cargo}
                                    </span>
                                )}
                            </div>

                            {/* ── Dados da carteirinha ── */}
                            <div className="mx-4 mb-3 bg-gray-50 rounded-2xl divide-y divide-gray-100">
                                <CardRow
                                    icon={<Hash className="w-3.5 h-3.5" />}
                                    label="Nº do Membro"
                                    value={
                                        <span className="font-mono font-bold tracking-widest text-gray-800">
                                            {membro?.numero ? String(membro.numero).padStart(4, "0") : "—"}
                                        </span>
                                    }
                                />
                                <CardRow
                                    icon={<Calendar className="w-3.5 h-3.5" />}
                                    label="Membro desde"
                                    value={
                                        membro?.membro_desde
                                            ? format(new Date(membro.membro_desde + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                            : "—"
                                    }
                                />
                                {membro?.congregacao && (
                                    <CardRow icon={<Building2 className="w-3.5 h-3.5" />} label="Congregação" value={membro.congregacao} />
                                )}
                                <CardRow
                                    icon={<BadgeCheck className="w-3.5 h-3.5" />}
                                    label="Situação"
                                    value={
                                        <span className={`font-semibold capitalize ${isValido ? "text-emerald-600" : "text-red-500"}`}>
                                            {membro?.situacao || "—"}
                                        </span>
                                    }
                                />
                            </div>

                            {/* ── Selo de verificação ── */}
                            <div
                                className={`mx-4 mb-4 rounded-2xl p-4 flex items-center gap-3.5
                                    ${isValido ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}
                            >
                                <div
                                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                                        ${isValido ? "bg-emerald-500" : "bg-red-500"}`}
                                >
                                    {isValido ? <CheckCircle2 className="w-6 h-6 text-white" /> : <XCircle className="w-6 h-6 text-white" />}
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${isValido ? "text-emerald-700" : "text-red-700"}`}>
                                        {isValido ? "Credencial Verificada" : "Credencial Inválida"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Verificado em {dataVerificacao} às {horaVerificacao}
                                    </p>
                                </div>
                            </div>

                            {/* ── Rodapé ── */}
                            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                    <span>SecretariaSistema</span>
                                </div>
                                <span className="text-xs text-gray-300">{dataVerificacao}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function CardRow({ icon, label, value }) {
    return (
        <div className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs shrink-0">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-sm text-gray-800 font-medium text-right">{value}</div>
        </div>
    );
}
