import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, Component } from "react";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { SuperAdminProvider, useSuperAdmin } from "./hooks/useSuperAdmin";

// Páginas públicas (carregadas imediatamente — lightweight)
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PreCadastroPublico from "./pages/PreCadastroPublico";
import RegistroPage from "./pages/RegistroPage";
import VerificarMembro from "./pages/VerificarMembro";
import EsqueciSenhaPage from "./pages/EsqueciSenha";
import RedefinirSenhaPage from "./pages/RedefinirSenha";
import VerificarEmailPage from "./pages/VerificarEmail";

// Layouts carregados de forma síncrona (necessários para estrutura)
import DashboardLayout from "./layouts/DashboardLayout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";

// Dashboard — carregamento lazy
const ResumoDash = lazy(() => import("./pages/dashboard/Resumo"));
const MembrosLista = lazy(() => import("./pages/dashboard/membros/Lista"));
const MembroForm = lazy(() => import("./pages/dashboard/membros/Form"));
const MembroDetalhe = lazy(() => import("./pages/dashboard/membros/Detalhe"));
const CarteirasPage = lazy(() => import("./pages/dashboard/Carteiras"));
const PlanosPage = lazy(() => import("./pages/dashboard/Planos"));
const ConfigPage = lazy(() => import("./pages/dashboard/Configuracoes"));
const RelatoriosPage = lazy(() => import("./pages/dashboard/Relatorios"));
const UsuariosPage = lazy(() => import("./pages/dashboard/Usuarios"));
const CongregacoesPage = lazy(() => import("./pages/dashboard/Congregacoes"));
const CongregacaoDetalhe = lazy(() => import("./pages/dashboard/CongregacaoDetalhe"));
const AniversariosPage = lazy(() => import("./pages/dashboard/Aniversarios"));
const PreCadastrosPage = lazy(() => import("./pages/dashboard/PreCadastros"));
const AgendaPage = lazy(() => import("./pages/dashboard/Agenda"));

// Super Admin — carregamento lazy
const SuperAdminLogin = lazy(() => import("./pages/super-admin/Login"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const SuperAdminIgrejas = lazy(() => import("./pages/super-admin/Igrejas"));
const SuperAdminIgrejaDetalhe = lazy(() => import("./pages/super-admin/IgrejaDetalhe"));
const SuperAdminPlanos = lazy(() => import("./pages/super-admin/Planos"));
const SuperAdminUsuarios = lazy(() => import("./pages/super-admin/Usuarios"));
const SuperAdminConfiguracoes = lazy(() => import("./pages/super-admin/Configuracoes"));

// Spinner de carregamento para Suspense
function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

// Error Boundary — captura erros de renderização sem derrubar o app inteiro
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900 gap-4">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Algo deu errado ao carregar esta página.</p>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm" onClick={() => this.setState({ hasError: false })}>
                        Tentar novamente
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function PrivateRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function SuperAdminRoute({ children }) {
    const { isAuthenticated, loading } = useSuperAdmin();
    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        );
    return isAuthenticated ? children : <Navigate to="/super-admin/login" replace />;
}

export default function App() {
    return (
        <ThemeProvider>
            <SuperAdminProvider>
                <BrowserRouter>
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                {/* Público */}
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/registro" element={<RegistroPage />} />
                                <Route path="/verificar/:slug/:membroId" element={<VerificarMembro />} />
                                <Route path="/pre-cadastro/:slug" element={<PreCadastroPublico />} />
                                <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
                                <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
                                <Route path="/verificar-email" element={<VerificarEmailPage />} />

                                {/* Dashboard (privado) */}
                                <Route
                                    path="/dashboard"
                                    element={
                                        <PrivateRoute>
                                            <DashboardLayout />
                                        </PrivateRoute>
                                    }
                                >
                                    <Route index element={<Navigate to="resumo" replace />} />
                                    <Route path="resumo" element={<ResumoDash />} />
                                    <Route path="membros" element={<MembrosLista />} />
                                    <Route path="membros/novo" element={<MembroForm />} />
                                    <Route path="membros/:id" element={<MembroDetalhe />} />
                                    <Route path="membros/:id/editar" element={<MembroForm />} />
                                    <Route path="congregacoes" element={<CongregacoesPage />} />
                                    <Route path="congregacoes/:id" element={<CongregacaoDetalhe />} />
                                    <Route path="aniversarios" element={<AniversariosPage />} />
                                    <Route path="carteiras" element={<CarteirasPage />} />
                                    <Route path="relatorios" element={<RelatoriosPage />} />
                                    <Route path="planos" element={<PlanosPage />} />
                                    <Route path="usuarios" element={<UsuariosPage />} />
                                    <Route path="configuracoes" element={<ConfigPage />} />
                                    <Route path="pre-cadastros" element={<PreCadastrosPage />} />
                                    <Route path="agenda" element={<AgendaPage />} />
                                </Route>

                                {/* Painel Master (Super Admin) */}
                                <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                                <Route
                                    path="/super-admin"
                                    element={
                                        <SuperAdminRoute>
                                            <SuperAdminLayout />
                                        </SuperAdminRoute>
                                    }
                                >
                                    <Route index element={<SuperAdminDashboard />} />
                                    <Route path="igrejas" element={<SuperAdminIgrejas />} />
                                    <Route path="igrejas/:id" element={<SuperAdminIgrejaDetalhe />} />
                                    <Route path="planos" element={<SuperAdminPlanos />} />
                                    <Route path="usuarios" element={<SuperAdminUsuarios />} />
                                    <Route path="configuracoes" element={<SuperAdminConfiguracoes />} />
                                </Route>

                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </BrowserRouter>
            </SuperAdminProvider>
        </ThemeProvider>
    );
}
