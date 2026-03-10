import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { igrejasAPI } from "../../services/api";
import { UserPlus, X, UserCog } from "lucide-react";

const PERFIS = [
    { value: "admin", label: "Administrador", desc: "Acesso total" },
    { value: "secretario", label: "Secretário", desc: "Gerencia membros" },
    { value: "visitante", label: "Visitante", desc: "Somente leitura" },
];

export default function UsuariosPage() {
    const [showForm, setShowForm] = useState(false);
    const qc = useQueryClient();

    const { data: usuarios = [], isLoading } = useQuery({ queryKey: ["usuarios"], queryFn: () => igrejasAPI.usuarios().then((r) => r.data) });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm();

    const criarMut = useMutation({
        mutationFn: (data) => igrejasAPI.criarUsuario(data),
        onSuccess: () => {
            toast.success("Usuário criado!");
            qc.invalidateQueries({ queryKey: ["usuarios"] });
            setShowForm(false);
            reset();
        },
        onError: (e) => toast.error(e.response?.data?.error || "Erro ao criar usuário"),
    });

    return (
        <div className="space-y-5">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Usuários</h1>
                    <p className="page-subtitle">Gerencie quem tem acesso ao sistema</p>
                </div>
                <button onClick={() => setShowForm((v) => !v)} className="btn btn-primary">
                    {showForm ? (
                        <>
                            <X className="w-4 h-4" /> Cancelar
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4" /> Novo usuário
                        </>
                    )}
                </button>
            </div>

            {/* Formulário */}
            {showForm && (
                <div className="card border-2 border-primary/20 dark:border-primary/10">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Novo Usuário</h3>
                    <form onSubmit={handleSubmit(criarMut.mutate)} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Nome completo *</label>
                                <input className="input" {...register("nome", { required: "Obrigatório" })} />
                                {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                            </div>
                            <div>
                                <label className="label">E-mail *</label>
                                <input
                                    type="email"
                                    className="input"
                                    {...register("email", {
                                        required: "Obrigatório",
                                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" },
                                    })}
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                            </div>
                            <div>
                                <label className="label">Senha temporária *</label>
                                <input
                                    type="password"
                                    className="input"
                                    {...register("senha", { required: "Obrigatório", minLength: { value: 8, message: "Mínimo 8 caracteres" } })}
                                />
                                {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
                            </div>
                            <div>
                                <label className="label">Perfil *</label>
                                <select className="input" {...register("perfil", { required: "Obrigatório" })}>
                                    {PERFIS.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    reset();
                                }}
                                className="btn btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                                {isSubmitting ? (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <UserPlus className="w-4 h-4" />
                                )}
                                Criar usuário
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lista */}
            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <UserCog className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Nenhum usuário cadastrado</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="table-header">
                            <tr>
                                {["Usuário", "Perfil", "Status", "Último acesso"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {usuarios.map((u) => (
                                <tr key={u.id} className="table-row">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                    {u.nome?.[0]?.toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{u.nome}</p>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 capitalize">
                                        <span className="badge badge-blue">{u.perfil}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`badge ${u.ativo ? "badge-green" : "badge-gray"}`}>{u.ativo ? "Ativo" : "Inativo"}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-xs">
                                        {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString("pt-BR") : "Nunca"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
