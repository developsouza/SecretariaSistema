import { useState } from "react";
import toast from "react-hot-toast";
import { Save, Key } from "lucide-react";
import { superadminAPI } from "../../services/api";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";

export default function SuperAdminConfiguracoes() {
    const { superadmin } = useSuperAdmin();
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmaSenha, setConfirmaSenha] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSenha = async (e) => {
        e.preventDefault();
        if (novaSenha.length < 8) return toast.error("A senha deve ter pelo menos 8 caracteres");
        if (novaSenha !== confirmaSenha) return toast.error("As senhas não coincidem");
        setSaving(true);
        try {
            await superadminAPI.alterarSenha(novaSenha);
            toast.success("Senha alterada com sucesso!");
            setNovaSenha("");
            setConfirmaSenha("");
        } catch (err) {
            toast.error(err.response?.data?.error || "Erro ao alterar senha");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Configurações</h1>
                <p className="text-gray-400 text-sm mt-1">Configurações da conta master</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Info da conta */}
                <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
                    <h2 className="text-base font-bold text-white mb-4">Conta Master</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-700/40">
                            <span className="text-gray-500">Nome</span>
                            <span className="text-gray-200">{superadmin?.nome}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-gray-500">E-mail</span>
                            <span className="text-gray-200">{superadmin?.email}</span>
                        </div>
                    </div>
                </div>

                {/* Alterar senha */}
                <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6 h-fit">
                    <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <Key className="w-4 h-4 text-violet-400" /> Alterar Senha
                    </h2>
                    <form onSubmit={handleSenha} className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-xs mb-1.5 block">Nova senha (mín. 8 caracteres)</label>
                            <input
                                type="password"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                className="w-full h-10 px-3 bg-gray-900/70 border border-gray-600/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs mb-1.5 block">Confirmar nova senha</label>
                            <input
                                type="password"
                                value={confirmaSenha}
                                onChange={(e) => setConfirmaSenha(e.target.value)}
                                className="w-full h-10 px-3 bg-gray-900/70 border border-gray-600/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !novaSenha}
                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                        >
                            {saving ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Salvar nova senha
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
