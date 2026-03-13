import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
import Navbar from "./components/Navbar";

// Desativa restauração de scroll do browser imediatamente na carga do módulo
if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
}
import Hero from "./components/Hero";
import Sobre from "./components/Sobre";
import Cultos from "./components/Cultos";
import Agenda from "./components/Agenda";
import Localizacao from "./components/Localizacao";
import Contato from "./components/Contato";
import Footer from "./components/Footer";
import CongregacaoPage from "./components/CongregacaoPage";
import { MessageCircle } from "lucide-react";

function PaginaInicial() {
    const location = useLocation();

    useLayoutEffect(() => {
        const secao = location.state?.scrollTo;
        if (secao) {
            const el = document.getElementById(secao);
            if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top, behavior: "smooth" });
            }
        } else {
            window.scrollTo(0, 0);
            // Duplo rAF para garantir após reflows causados por imagens/lazy-load
            requestAnimationFrame(() => {
                requestAnimationFrame(() => window.scrollTo(0, 0));
            });
        }
    }, [location.state]);

    // Garante top no mount mesmo sem state
    useEffect(() => {
        if (!location.state?.scrollTo) {
            window.scrollTo(0, 0);
        }
    }, []);

    return (
        <main>
            <Hero />
            <Sobre />
            <Cultos />
            <Agenda />
            <Localizacao />
            <Contato />
        </main>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Navbar />

            <Routes>
                <Route path="/" element={<PaginaInicial />} />
                <Route path="/congregacao/:slug" element={<CongregacaoPage />} />
            </Routes>

            <Footer />

            {/* Botão flutuante WhatsApp */}
            <a
                href="https://wa.me/5583993346304?text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20mais%20informações."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                style={{
                    position: "fixed",
                    bottom: "2rem",
                    right: "2rem",
                    width: "56px",
                    height: "56px",
                    background: "#25D366",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)",
                    zIndex: 999,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    color: "white",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.boxShadow = "0 6px 28px rgba(37, 211, 102, 0.55)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(37, 211, 102, 0.4)";
                }}
            >
                <MessageCircle size={26} fill="white" />
            </a>
        </BrowserRouter>
    );
}
