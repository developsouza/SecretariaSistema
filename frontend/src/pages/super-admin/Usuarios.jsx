import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { superadminAPI } from "../../services/api";

export default function SuperAdminUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const LIMIT = 30;

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await superadminAPI.listarUsuarios({ search, page, limit: LIMIT });
            setUsuarios(data.usuarios);
            setTotal(data.total);
        } catch {
            toast.error("Erro ao carregar usuários");
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => {
        const t = setTimeout(carregar, 300);
        return () => clearTimeout(t);
    }, [carregar]);

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Usuários</h1>
                <p className="text-gray-400 text-sm mt-1">
                    {total} usuário{total !== 1 ? "s" : ""} em todas as igrejas
                </p>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou e-mail…"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="w-full h-10 pl-9 pr-4 bg-gray-800/70 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition"
                />
            </div>

            {/* Tabela */}
            <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 border-b border-gray-700/60 text-left">
                                    <th className="px-4 py-3 font-medium">Usuário</th>
                                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Igreja</th>
                                    <th className="px-4 py-3 font-medium">Perfil</th>
                                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Último acesso</th>
                                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Cadastro</th>
                                    <th className="px-4 py-3 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/40">
                                {usuarios.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-700/20 transition">
                                        <td className="px-4 py-3">
                                            <p className="text-white font-medium">{u.nome}</p>
                                            <p className="text-gray-500 text-xs">{u.email}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <Link
                                                to={`/super-admin/igrejas/${u.igreja_id}`}
                                                className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-xs transition"
                                            >
                                                {u.igreja_nome} <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                    u.perfil === "admin"
                                                        ? "bg-violet-500/15 text-violet-400"
                                                        : u.perfil === "secretario"
                                                          ? "bg-blue-500/15 text-blue-400"
                                                          : "bg-gray-700 text-gray-400"
                                                }`}
                                            >
                                                {u.perfil}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                                            {u.ultimo_login ? new Date(u.ultimo_login).toLocaleDateString("pt-BR") : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                                            {new Date(u.created_at).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                                            >
                                                {u.ativo ? "ativo" : "inativo"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {usuarios.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-gray-500">
                                            Nenhum usuário encontrado
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/60">
                        <p className="text-gray-500 text-sm">
                            Página {page} de {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700/60 text-gray-400 hover:bg-gray-600 disabled:opacity-30 transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700/60 text-gray-400 hover:bg-gray-600 disabled:opacity-30 transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
