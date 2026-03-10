import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicoAPI } from "../services/api";
import { CheckCircle2, XCircle, Church, ShieldCheck, User, Calendar, Hash, BadgeCheck, AlertTriangle } from "lucide-react";
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo / branding */}
                <div className="text-center mb-6">
                    <div className="inline-flex w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl items-center justify-center mb-3 ring-1 ring-white/20">
                        <Church className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-blue-200 text-xs tracking-widest uppercase">Verificação de Credencial</p>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* Status header */}
                    {isError ? (
                        <div className="bg-amber-500 p-6 text-white text-center">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-90" />
                            <h2 className="text-xl font-bold">QR Code Inválido</h2>
                            <p className="text-sm text-amber-100 mt-1">Este código não pôde ser verificado</p>
                        </div>
                    ) : (
                        <div className={`p-6 text-white text-center ${isValido ? "bg-emerald-600" : "bg-red-600"}`}>
                            <div className="relative inline-block mb-3">
                                {isValido ? <CheckCircle2 className="w-14 h-14 mx-auto" /> : <XCircle className="w-14 h-14 mx-auto" />}
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">{isValido ? "Membro Ativo" : "Membro Inativo"}</h2>
                            {!isValido && <p className="text-sm text-red-100 mt-1">Este membro não está com situação ativa na igreja</p>}
                            {igreja?.nome && <p className="text-sm mt-2 font-medium opacity-90">{igreja.nome}</p>}
                        </div>
                    )}

                    {/* Dados do membro */}
                    {membro && (
                        <div className="p-6">
                            {/* Foto + Nome */}
                            <div className="flex items-center gap-4 mb-5">
                                <div
                                    className={`shrink-0 w-16 h-16 rounded-2xl overflow-hidden ring-2 ${isValido ? "ring-emerald-200" : "ring-red-200"}`}
                                >
                                    {membro.foto_url ? (
                                        <img src={membro.foto_url} alt={membro.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <User className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-900 leading-snug truncate">{membro.nome}</h3>
                                    {membro.cargo && (
                                        <span
                                            className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isValido ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                                        >
                                            {membro.cargo}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Detalhes */}
                            <div className="space-y-2.5 bg-gray-50 rounded-2xl p-4">
                                <InfoRow
                                    icon={<Hash className="w-3.5 h-3.5" />}
                                    label="Nº do Membro"
                                    value={membro.numero ? String(membro.numero).padStart(4, "0") : "—"}
                                />
                                <InfoRow
                                    icon={<Calendar className="w-3.5 h-3.5" />}
                                    label="Membro desde"
                                    value={
                                        membro.membro_desde
                                            ? format(new Date(membro.membro_desde + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                            : "—"
                                    }
                                />
                                <InfoRow
                                    icon={<BadgeCheck className="w-3.5 h-3.5" />}
                                    label="Situação"
                                    value={
                                        <span className={`font-semibold capitalize ${isValido ? "text-emerald-600" : "text-red-500"}`}>
                                            {membro.situacao || "—"}
                                        </span>
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* Rodapé */}
                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            <span>SecretariaSistema</span>
                        </div>
                        <span className="text-xs text-gray-300">{new Date().toLocaleDateString("pt-BR")}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs shrink-0">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-sm text-gray-800 font-medium text-right">{value}</div>
        </div>
    );
}

