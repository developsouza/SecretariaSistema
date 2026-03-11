import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, Church, Shield, Users, LogOut, Menu, X, ChevronRight, Settings } from "lucide-react";
import { useSuperAdmin } from "../hooks/useSuperAdmin";
import clsx from "clsx";

const navItems = [
    { to: "/super-admin", icon: LayoutDashboard, label: "Visão Geral", end: true },
    { to: "/super-admin/igrejas", icon: Church, label: "Igrejas / Tenants" },
    { to: "/super-admin/planos", icon: Shield, label: "Planos SaaS" },
    { to: "/super-admin/usuarios", icon: Users, label: "Usuários" },
    { to: "/super-admin/configuracoes", icon: Settings, label: "Configurações" },
];

function NavItem({ item, onClick }) {
    return (
        <NavLink
            to={item.to}
            end={item.end}
            onClick={onClick}
            className={({ isActive }) =>
                clsx(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 overflow-hidden",
                    isActive ? "bg-violet-600/15 text-violet-300 font-semibold" : "text-gray-400 hover:bg-gray-700/60 hover:text-gray-100",
                )
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-violet-400 rounded-full" />}
                    <item.icon className={clsx("w-[18px] h-[18px] flex-shrink-0", isActive ? "text-violet-400" : "text-gray-500")} />
                    {item.label}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400/60" />}
                </>
            )}
        </NavLink>
    );
}

export default function SuperAdminLayout() {
    const [open, setOpen] = useState(false);
    const { superadmin, logout } = useSuperAdmin();

    return (
        <div className="min-h-screen flex bg-gray-950 text-white">
            {/* ── Sidebar Desktop ── */}
            <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800/80">
                {/* Logo */}
                <div className="px-4 py-5 border-b border-gray-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-violet-600/20 border border-violet-500/30 rounded-xl flex items-center justify-center shadow-sm">
                            <Shield className="w-4.5 h-4.5 text-violet-400" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm tracking-tight leading-tight">Painel Master</p>
                            <p className="text-gray-500 text-[10px]">Gestão Secretaria</p>
                        </div>
                    </div>
                </div>

                {/* Badge de aviso */}
                <div className="mx-3 mt-3 px-3 py-2 bg-violet-950/60 border border-violet-700/30 rounded-xl">
                    <p className="text-violet-300 text-[10px] font-semibold uppercase tracking-wider">Acesso Restrito</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">Ambiente de administração do SaaS</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavItem key={item.to} item={item} />
                    ))}
                </nav>

                {/* Perfil */}
                <div className="px-3 py-4 border-t border-gray-800/80">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-800/50">
                        <div className="w-8 h-8 bg-violet-700/30 border border-violet-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-violet-300 font-bold text-xs uppercase">{superadmin?.nome?.charAt(0) || "M"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">{superadmin?.nome}</p>
                            <p className="text-gray-500 text-[10px] truncate">{superadmin?.email}</p>
                        </div>
                        <button onClick={logout} title="Sair" className="ml-auto text-gray-500 hover:text-red-400 transition flex-shrink-0">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Sidebar Mobile Overlay ── */}
            {open && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
                        <div className="px-4 py-5 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Shield className="w-5 h-5 text-violet-400" />
                                <span className="text-white font-bold text-sm">Painel Master</span>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                            {navItems.map((item) => (
                                <NavItem key={item.to} item={item} onClick={() => setOpen(false)} />
                            ))}
                        </nav>
                        <div className="px-3 py-4 border-t border-gray-800">
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm transition"
                            >
                                <LogOut className="w-4 h-4" /> Sair
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* ── Main ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar mobile */}
                <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
                    <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white transition">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-violet-400" />
                        <span className="text-white font-bold text-sm">Painel Master</span>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
