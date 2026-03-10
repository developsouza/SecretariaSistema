import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
    LayoutDashboard,
    Users,
    CreditCard,
    FileText,
    Settings,
    LogOut,
    Church,
    Menu,
    X,
    Bell,
    UserCog,
    BarChart3,
    Shield,
    Sun,
    Moon,
    AlertTriangle,
    Download,
    Cake,
    ClipboardList,
    CalendarDays,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import clsx from "clsx";
import NotificationBell from "../components/NotificationBell";
import api from "../services/api";

const mainNavItems = [
    { to: "/dashboard/resumo", icon: LayoutDashboard, label: "Painel" },
    { to: "/dashboard/membros", icon: Users, label: "Membros" },
    { to: "/dashboard/congregacoes", icon: Church, label: "Congregações" },
    { to: "/dashboard/aniversarios", icon: Cake, label: "Aniversários" },
    { to: "/dashboard/agenda", icon: CalendarDays, label: "Agenda" },
    { to: "/dashboard/pre-cadastros", icon: ClipboardList, label: "Pré-Cadastros" },
    { to: "/dashboard/carteiras", icon: CreditCard, label: "Carteiras" },
    { to: "/dashboard/relatorios", icon: BarChart3, label: "Relatórios" },
];

const accountNavItems = [
    { to: "/dashboard/usuarios", icon: UserCog, label: "Usuários", adminOnly: true },
    { to: "/dashboard/planos", icon: Shield, label: "Plano / Cobrança" },
    { to: "/dashboard/configuracoes", icon: Settings, label: "Configurações" },
];

function NavItem({ item, onClick }) {
    return (
        <NavLink
            to={item.to}
            onClick={onClick}
            className={({ isActive }) =>
                clsx(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 overflow-hidden",
                    isActive
                        ? "bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary-300 font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-gray-100",
                )
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary dark:bg-primary-300 rounded-full" />
                    )}
                    <item.icon
                        className={clsx(
                            "w-[18px] h-[18px] flex-shrink-0",
                            isActive ? "text-primary dark:text-primary-300" : "text-gray-400 dark:text-gray-500",
                        )}
                    />
                    {item.label}
                </>
            )}
        </NavLink>
    );
}

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { usuario, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();

    const gracePeriod = usuario?.igreja?.grace_period;
    const graceDaysLeft = usuario?.igreja?.grace_days_left ?? 0;
    const trialEnd = usuario?.igreja?.trial_end;
    const trialDaysLeft = trialEnd ? Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const trialExpirando = usuario?.igreja?.stripe_status === "trialing" && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 7;

    const handleExportarCSV = async () => {
        try {
            const res = await api.get("/membros/exportar", { responseType: "blob" });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `membros_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Erro ao exportar dados.");
        }
    };

    const stripeStatus = usuario?.igreja?.stripe_status;
    const statusLabel = stripeStatus === "active" ? "Ativo" : stripeStatus === "trialing" ? "Trial" : "Inativo";
    const statusColor =
        stripeStatus === "active"
            ? "bg-emerald-500/20 text-emerald-400"
            : stripeStatus === "trialing"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-red-500/20 text-red-400";

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-dark-900 overflow-hidden transition-colors duration-200">
            {/* Overlay mobile */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* ── Sidebar ─────────────────────────────────── */}
            <aside
                className={clsx(
                    "fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 ease-in-out",
                    "bg-white dark:bg-dark-800 border-r border-gray-100 dark:border-gray-700/50",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                    "lg:static lg:translate-x-0",
                )}
            >
                {/* Marca */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center shadow-glow-sm flex-shrink-0 overflow-hidden">
                        {usuario?.igreja?.logo_url ? (
                            <img
                                src={usuario.igreja.logo_url}
                                alt={usuario.igreja.nome_curto || usuario.igreja.nome}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Church className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">
                            {usuario?.igreja?.nome_curto || usuario?.igreja?.nome || "SecretariaSistema"}
                        </p>
                        <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <button
                        className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Navegação */}
                <nav className="flex-1 px-3 py-3 overflow-y-auto">
                    <div className="space-y-0.5">
                        {mainNavItems
                            .filter((n) => !n.adminOnly || usuario?.perfil === "admin")
                            .map((item) => (
                                <NavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
                            ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 space-y-0.5">
                        <p className="nav-label">Conta</p>
                        {accountNavItems.map((item) => (
                            <NavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
                        ))}
                    </div>
                </nav>

                {/* Usuário + toggle tema */}
                <div className="border-t border-gray-100 dark:border-gray-700/50 p-3 space-y-1">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all"
                    >
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                        <span>{isDark ? "Modo claro" : "Modo escuro"}</span>
                    </button>
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary dark:text-primary-300 font-bold text-sm">{usuario?.nome?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{usuario?.nome}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{usuario?.perfil}</p>
                        </div>
                        <button
                            onClick={logout}
                            title="Sair"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Conteúdo principal ───────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar mobile */}
                <header className="bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-gray-700/50 px-4 py-3 flex items-center gap-3 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center overflow-hidden">
                        {usuario?.igreja?.logo_url ? (
                            <img
                                src={usuario.igreja.logo_url}
                                alt={usuario.igreja.nome_curto || usuario.igreja.nome}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Church className="w-4 h-4 text-white" />
                        )}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm flex-1 truncate">
                        {usuario?.igreja?.nome_curto || usuario?.igreja?.nome || "SecretariaSistema"}
                    </span>
                    <button onClick={toggleTheme} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                    </button>
                    <NotificationBell />
                </header>

                {/* Topbar desktop */}
                <header className="hidden lg:flex items-center justify-between gap-2 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-gray-700/50 px-6 py-2.5">
                    <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <NotificationBell />
                        <div className="w-px h-5 bg-gray-100 dark:bg-gray-700 mx-1" />
                        <div className="flex items-center gap-2 pl-1">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center flex-shrink-0">
                                <span className="text-primary dark:text-primary-300 font-bold text-xs">{usuario?.nome?.[0]?.toUpperCase()}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                                {usuario?.nome?.split(" ")[0]}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
                    {/* Banner de Grace Period */}
                    {gracePeriod && (
                        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-4 py-3 text-sm">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-red-700 dark:text-red-400">Assinatura cancelada — período de carência ativo</p>
                                <p className="text-red-600 dark:text-red-300 mt-0.5">
                                    Você tem mais{" "}
                                    <strong>
                                        {graceDaysLeft} dia{graceDaysLeft !== 1 ? "s" : ""}
                                    </strong>{" "}
                                    para exportar seus dados. Após isso o acesso será bloqueado.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={handleExportarCSV}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" /> Exportar dados
                                </button>
                                <NavLink
                                    to="/dashboard/planos"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                    Reativar agora
                                </NavLink>
                            </div>
                        </div>
                    )}
                    {/* Banner de trial expirando */}
                    {trialExpirando && (
                        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-sm">
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-amber-700 dark:text-amber-400">
                                    {trialDaysLeft === 0
                                        ? "Seu trial expira hoje!"
                                        : `Seu trial expira em ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""}!`}
                                </p>
                                <p className="text-amber-600 dark:text-amber-300 mt-0.5">
                                    Escolha um plano para continuar usando o SecretariaSistema sem interrupções.
                                </p>
                            </div>
                            <NavLink
                                to="/dashboard/planos"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
                            >
                                Escolher plano
                            </NavLink>
                        </div>
                    )}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
