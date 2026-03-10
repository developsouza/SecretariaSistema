import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicoAPI } from "../services/api";
import { useTheme } from "../hooks/useTheme";
import { Church, Users, CreditCard, BarChart3, CheckCircle2, ArrowRight, Star, Shield, Zap, Mail, Phone, Sun, Moon, Menu } from "lucide-react";
import { useState } from "react";

const FEATURES = [
    {
        icon: Users,
        title: "Cadastro Completo",
        desc: "Todos os dados do membro: pessoais, eclesiásticos, familiares e endereço.",
        color: "from-blue-500/20 to-blue-600/10 dark:from-blue-500/10 dark:to-blue-600/5",
        iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
        icon: CreditCard,
        title: "Carteira Digital",
        desc: "Gere carteirinhas personalizadas em PDF com QR Code de validação.",
        color: "from-indigo-500/20 to-indigo-600/10 dark:from-indigo-500/10 dark:to-indigo-600/5",
        iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
        icon: BarChart3,
        title: "Relatórios",
        desc: "Estatísticas de crescimento, faixa etária, aniversariantes e muito mais.",
        color: "from-violet-500/20 to-violet-600/10 dark:from-violet-500/10 dark:to-violet-600/5",
        iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
        icon: Shield,
        title: "Seguro e Privado",
        desc: "Dados protegidos com criptografia e acesso por perfil de usuário.",
        color: "from-emerald-500/20 to-emerald-600/10 dark:from-emerald-500/10 dark:to-emerald-600/5",
        iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
        icon: Zap,
        title: "Multi-usuário",
        desc: "Pastor, secretários e visitantes com diferentes níveis de acesso.",
        color: "from-amber-500/20 to-amber-600/10 dark:from-amber-500/10 dark:to-amber-600/5",
        iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
        icon: Star,
        title: "Personalizado",
        desc: "Logo, cores e identidade visual da sua própria igreja.",
        color: "from-pink-500/20 to-pink-600/10 dark:from-pink-500/10 dark:to-pink-600/5",
        iconColor: "text-pink-600 dark:text-pink-400",
    },
];

function PlanCard({ plano, destaque }) {
    return (
        <div
            className={`rounded-3xl p-8 border-2 relative flex flex-col transition-all duration-300 hover:-translate-y-1 ${destaque ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-glow-sm" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-card-hover"}`}
        >
            {destaque && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-glow-sm">
                    MAIS POPULAR
                </span>
            )}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plano.nome}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{plano.descricao}</p>
            <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">R$ {plano.preco_mensal.toFixed(2).replace(".", ",")}</span>
                <span className="text-gray-400 dark:text-gray-500">/mês</span>
            </div>
            <ul className="space-y-2.5 flex-1">
                <li className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {plano.limite_membros >= 999999 ? "Membros ilimitados" : `Até ${plano.limite_membros} membros`}
                </li>
                {plano.recursos?.carteiras && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        Carteiras em PDF
                    </li>
                )}
                {plano.recursos?.qrcode && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        QR Code de validação
                    </li>
                )}
                {plano.recursos?.email && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        Notificações por e-mail
                    </li>
                )}
                {plano.recursos?.relatorios_avancados && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        Relatórios avançados
                    </li>
                )}
                {plano.recursos?.suporte_prioritario && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        Suporte prioritário
                    </li>
                )}
            </ul>
            <Link
                to="/registro"
                className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] ${destaque ? "bg-primary hover:bg-primary-700 text-white shadow-glow hover:shadow-glow" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"}`}
            >
                Começar grátis <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

export default function LandingPage() {
    const { isDark, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { data: planos = [] } = useQuery({ queryKey: ["planos-publico"], queryFn: () => publicoAPI.planos().then((r) => r.data) });

    return (
        <div className="min-h-screen bg-white dark:bg-dark-900 transition-colors duration-200">
            <header className="sticky top-0 z-50 bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center shadow-glow-sm">
                            <Church className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">SecretariaSistema</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
                        <a href="#funcionalidades" className="hover:text-primary dark:hover:text-primary-300 transition-colors">
                            Funcionalidades
                        </a>
                        <a href="#planos" className="hover:text-primary dark:hover:text-primary-300 transition-colors">
                            Planos
                        </a>
                        <a href="#contato" className="hover:text-primary dark:hover:text-primary-300 transition-colors">
                            Contato
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                        </button>
                        <Link to="/login" className="btn btn-secondary text-sm hidden sm:inline-flex">
                            Entrar
                        </Link>
                        <Link to="/registro" className="btn btn-primary text-sm hidden sm:inline-flex shadow-glow-sm hover:shadow-glow">
                            14 dias grátis
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2 bg-white dark:bg-dark-900">
                        <a href="#funcionalidades" className="block py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                            Funcionalidades
                        </a>
                        <a href="#planos" className="block py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                            Planos
                        </a>
                        <a href="#contato" className="block py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                            Contato
                        </a>
                        <div className="flex gap-2 pt-2">
                            <Link to="/login" className="btn btn-secondary text-sm flex-1 justify-center">
                                Entrar
                            </Link>
                            <Link to="/registro" className="btn btn-primary text-sm flex-1 justify-center">
                                14 dias grátis
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-950 text-white py-28 px-4">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
                </div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-8">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        14 dias grátis · Sem cartão de crédito · Cancele quando quiser
                    </span>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
                        Gestão de membros
                        <br />
                        <span className="bg-gradient-to-r from-primary-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                            para igrejas evangélicas
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Cadastre membros, gere carteirinhas personalizadas, acompanhe relatórios e organize sua secretaria — tudo em um só lugar.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/registro"
                            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all duration-200 shadow-2xl active:scale-[0.98] text-base"
                        >
                            Começar gratuitamente
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-200 backdrop-blur-sm text-base"
                        >
                            Já tenho conta
                        </Link>
                    </div>
                    <div className="mt-16 grid grid-cols-3 gap-8 max-w-sm mx-auto text-center">
                        {[
                            ["500+", "Igrejas"],
                            ["50k+", "Membros"],
                            ["99.9%", "Uptime"],
                        ].map(([v, l]) => (
                            <div key={l}>
                                <p className="text-3xl font-extrabold text-white">{v}</p>
                                <p className="text-white/50 text-sm mt-1">{l}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="funcionalidades" className="py-24 px-4 bg-gray-50 dark:bg-dark-800">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold text-primary dark:text-primary-400 uppercase tracking-widest mb-3">
                            Funcionalidades
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                            Tudo que sua secretaria precisa
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                            Desenvolvido especialmente para igrejas evangélicas, com os campos e funcionalidades que fazem sentido para vocês.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="group bg-white dark:bg-gray-800 rounded-3xl p-7 shadow-card border border-gray-100 dark:border-gray-700/50 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5`}>
                                    <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">{f.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="planos" className="py-24 px-4 bg-white dark:bg-dark-900">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold text-primary dark:text-primary-400 uppercase tracking-widest mb-3">
                            Planos
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                            Para todos os tamanhos
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">Comece grátis por 14 dias. Sem cartão de crédito.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {planos.map((plano, i) => (
                            <PlanCard key={plano.id} plano={plano} destaque={i === 1} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 to-indigo-800 py-24 px-4 text-white text-center">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Pronto para organizar sua secretaria?</h2>
                    <p className="text-white/60 mb-8 text-lg">Junte-se a mais de 500 igrejas que já confiam no SecretariaSistema.</p>
                    <Link
                        to="/registro"
                        className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all duration-200 shadow-2xl active:scale-[0.98] text-base"
                    >
                        Criar conta grátis
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </section>

            <footer id="contato" className="bg-gray-950 text-gray-400 py-16 px-4">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center">
                                <Church className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-white">SecretariaSistema</span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-500">
                            O sistema de gestão de membros feito para igrejas evangélicas brasileiras.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-4">Links</h4>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link to="/login" className="hover:text-white transition-colors">
                                    Entrar
                                </Link>
                            </li>
                            <li>
                                <Link to="/registro" className="hover:text-white transition-colors">
                                    Criar conta
                                </Link>
                            </li>
                            <li>
                                <a href="#planos" className="hover:text-white transition-colors">
                                    Planos
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-4">Contato</h4>
                        <ul className="space-y-2.5 text-sm">
                            <li className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                contato@secretariasistema.com.br
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                (11) 9 9999-9999
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto mt-10 pt-8 border-t border-gray-800 text-center text-sm text-gray-600">
                    &copy; {new Date().getFullYear()} SecretariaSistema. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
}
