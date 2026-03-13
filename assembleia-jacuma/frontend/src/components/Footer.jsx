import { MapPin, Phone, Mail, Instagram, Facebook, Youtube } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const linksRapidos = [
    { href: "#inicio", label: "Início" },
    { href: "#sobre", label: "Sobre Nós" },
    { href: "#cultos", label: "Horários dos Cultos" },
    { href: "#agenda", label: "Agenda" },
    { href: "#contato", label: "Contato" },
];

export default function Footer() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLink = (e, href) => {
        e.preventDefault();
        const secao = href.replace("#", "");
        if (location.pathname !== "/") {
            navigate("/", { state: { scrollTo: secao } });
        } else {
            const el = document.querySelector(href);
            if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top, behavior: "smooth" });
            }
        }
    };

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    {/* Marca */}
                    <div className="footer-brand">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                            <img src="/logo.png" alt="Logo Assembleia de Deus" style={{ height: "95px", width: "auto" }} />
                        </div>

                        <p>
                            Uma comunidade de fé, amor e esperança no coração do litoral sul da Paraíba. Há mais de 30 anos proclamando o Evangelho de
                            Jesus Cristo.
                        </p>

                        <div className="footer-redes">
                            <a
                                href="https://www.instagram.com/ad.jacuma/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rede-btn"
                                aria-label="Instagram"
                            >
                                <Instagram size={16} />
                            </a>
                            <a
                                href="https://www.facebook.com/ad.jacuma/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rede-btn"
                                aria-label="Facebook"
                            >
                                <Facebook size={16} />
                            </a>
                            <a
                                href="https://www.youtube.com/@ad.jacuma"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rede-btn"
                                aria-label="YouTube"
                            >
                                <Youtube size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Links Rápidos */}
                    <div>
                        <h4 className="footer-titulo">Links Rápidos</h4>
                        <div className="footer-links">
                            {linksRapidos.map((link) => (
                                <a key={link.href} href={link.href} onClick={(e) => handleLink(e, link.href)}>
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Contato */}
                    <div>
                        <h4 className="footer-titulo">Contato</h4>
                        <div className="footer-contato-item">
                            <MapPin size={14} />
                            <span>
                                Rua Abilio dos Santos Ribeiro, s/n — Jacumã
                                <br />
                                Conde, PB – CEP 58.320-000
                            </span>
                        </div>
                        <div className="footer-contato-item">
                            <Phone size={14} />
                            <span>(83) 99334-6304</span>
                        </div>
                        <div className="footer-contato-item">
                            <Mail size={14} />
                            <span>adjacumasecretaria@gmail.com</span>
                        </div>

                        <a
                            href="https://wa.me/55839993346304?text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20mais%20informações."
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginTop: "1rem",
                                padding: "0.55rem 1.25rem",
                                background: "#25D366",
                                color: "white",
                                borderRadius: "2px",
                                fontSize: "0.82rem",
                                fontWeight: 700,
                            }}
                        >
                            WhatsApp
                        </a>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>© {new Date().getFullYear()} Assembleia de Deus em Jacumã. Todos os direitos reservados.</span>
                    <span>Desenvolvido com ❤️ por G3T Sistemas para a Glória de Deus</span>
                </div>
            </div>
        </footer>
    );
}
