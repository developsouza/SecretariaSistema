import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { congregacoes } from "../data/congregacoes";

const links = [
    { href: "#inicio", label: "Início" },
    { href: "#sobre", label: "Sobre" },
    { href: "#cultos", label: "Cultos" },
    { href: "#agenda", label: "Agenda" },
    { href: "#contato", label: "Contato" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuAberto, setMenuAberto] = useState(false);
    const [dropdownAberto, setDropdownAberto] = useState(false);
    const [mobileCongsAberto, setMobileCongsAberto] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const isPaginaCongregacao = location.pathname.startsWith("/congregacao");

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const handleClickFora = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownAberto(false);
            }
        };
        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, []);

    // Nas páginas de congregação, a navbar fica sempre com fundo escuro
    const navbarScrolled = scrolled || isPaginaCongregacao;

    const handleLinkClick = (e, href) => {
        e.preventDefault();
        setMenuAberto(false);
        setDropdownAberto(false);
        if (isPaginaCongregacao) {
            navigate("/");
            setTimeout(() => {
                const el = document.querySelector(href);
                if (el) {
                    const offset = 80;
                    const top = el.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top, behavior: "smooth" });
                }
            }, 300);
        } else {
            const el = document.querySelector(href);
            if (el) {
                const offset = 80;
                const top = el.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: "smooth" });
            }
        }
    };

    return (
        <>
            <nav className={`navbar ${navbarScrolled ? "scrolled" : ""}`}>
                <div className="container navbar-inner">
                    <Link to="/" className="navbar-logo">
                        <img src="/logo.png" alt="Logo Assembleia de Deus" style={{ height: "120px", width: "auto" }} />
                    </Link>

                    <div className="navbar-links">
                        {links.map((link) => (
                            <a key={link.href} href={link.href} onClick={(e) => handleLinkClick(e, link.href)}>
                                {link.label}
                            </a>
                        ))}

                        {/* Dropdown Congregações — temporariamente desabilitado
                        <div className="nav-dropdown" ref={dropdownRef}>
                            <button className="nav-dropdown-trigger" onClick={() => setDropdownAberto((v) => !v)} aria-expanded={dropdownAberto}>
                                Congregações
                                <ChevronDown size={14} className={`dropdown-chevron ${dropdownAberto ? "aberto" : ""}`} />
                            </button>
                            {dropdownAberto && (
                                <div className="nav-dropdown-menu">
                                    {congregacoes.map((c) => (
                                        <Link
                                            key={c.slug}
                                            to={`/congregacao/${c.slug}`}
                                            className="nav-dropdown-item"
                                            onClick={() => setDropdownAberto(false)}
                                        >
                                            <span
                                                className={`dropdown-badge ${c.subtitulo === "Templo Sede" ? "dropdown-badge--sede" : "dropdown-badge--congregacao"}`}
                                            >
                                                {c.subtitulo}
                                            </span>
                                            <span className="dropdown-nome">{c.nome}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                        */}
                    </div>

                    <button className="menu-mobile" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </nav>

            {/* Menu Mobile */}
            <div className={`mobile-menu ${menuAberto ? "aberto" : ""}`}>
                <button className="fechar-menu" onClick={() => setMenuAberto(false)}>
                    ×
                </button>
                {links.map((link) => (
                    <a key={link.href} href={link.href} onClick={(e) => handleLinkClick(e, link.href)}>
                        {link.label}
                    </a>
                ))}

                {/* Congregações no mobile — temporariamente desabilitado
                <button className="mobile-menu-dropdown-trigger" onClick={() => setMobileCongsAberto((v) => !v)}>
                    Congregações
                    <ChevronDown size={16} className={`dropdown-chevron ${mobileCongsAberto ? "aberto" : ""}`} />
                </button>
                {mobileCongsAberto && (
                    <div className="mobile-congregacoes-lista">
                        {congregacoes.map((c) => (
                            <Link
                                key={c.slug}
                                to={`/congregacao/${c.slug}`}
                                className="mobile-congregacao-item"
                                onClick={() => {
                                    setMenuAberto(false);
                                    setMobileCongsAberto(false);
                                }}
                            >
                                {c.nome}
                            </Link>
                        ))}
                    </div>
                )}
                */}
            </div>
        </>
    );
}
