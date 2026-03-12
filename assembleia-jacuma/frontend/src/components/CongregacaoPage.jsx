import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Phone, Clock, Users, Calendar, ArrowLeft, MessageCircle, User, ChevronLeft, ChevronRight } from "lucide-react";
import { congregacoes } from "../data/congregacoes";

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function CongregacaoPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const congregacao = congregacoes.find((c) => c.slug === slug);

    const outras = useMemo(() => shuffle(congregacoes.filter((c) => c.slug !== slug)), [slug]);
    const [idx, setIdx] = useState(0);
    const trackRef = useRef(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setIdx(0);
        if (trackRef.current) trackRef.current.scrollLeft = 0;
    }, [slug]);

    useEffect(() => {
        if (!trackRef.current || !trackRef.current.children[idx]) return;
        const card = trackRef.current.children[idx];
        const offset = card.offsetLeft - trackRef.current.offsetLeft;
        trackRef.current.scrollTo({ left: offset, behavior: "smooth" });
    }, [idx]);

    const prev = () => setIdx((i) => (i === 0 ? outras.length - 1 : i - 1));
    const next = () => setIdx((i) => (i === outras.length - 1 ? 0 : i + 1));

    if (!congregacao) {
        return (
            <div className="congregacao-nao-encontrada">
                <h2>Congregação não encontrada</h2>
                <p>A congregação que você está procurando não existe.</p>
                <Link to="/" className="btn-primario">
                    <span>Voltar ao Início</span>
                </Link>
            </div>
        );
    }

    const { nome, subtitulo, cidade, endereco, telefone, whatsapp, pastor, coPastor, fundacao, membros, descricao, descricao2, imagem, cultos, cor } =
        congregacao;

    return (
        <div className="congregacao-page">
            {/* Hero da Congregação */}
            <section className="congregacao-hero" style={{ "--cor-congregacao": cor }}>
                <div className="congregacao-hero-imagem">
                    <img src={imagem} alt={`Congregação ${nome}`} />
                    <div className="congregacao-hero-overlay" />
                </div>
                <div className="container congregacao-hero-content">
                    <button className="btn-voltar" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                        <span>Voltar</span>
                    </button>
                    <div className="congregacao-badge">{subtitulo}</div>
                    <h1 className="congregacao-titulo">
                        Congregação
                        <br />
                        {nome}
                    </h1>
                    <p className="congregacao-cidade">
                        <MapPin size={16} />
                        {cidade}
                    </p>
                </div>
            </section>

            {/* Barra de informações rápidas */}
            <section className="congregacao-info-bar">
                <div className="container">
                    <div className="info-bar-grid">
                        <div className="info-bar-item">
                            <User size={20} />
                            <div>
                                <span className="info-bar-label">Líder</span>
                                <span className="info-bar-valor">{pastor}</span>
                            </div>
                        </div>
                        <div className="info-bar-item">
                            <Calendar size={20} />
                            <div>
                                <span className="info-bar-label">Fundada em</span>
                                <span className="info-bar-valor">{fundacao}</span>
                            </div>
                        </div>
                        <div className="info-bar-item">
                            <Users size={20} />
                            <div>
                                <span className="info-bar-label">Membros</span>
                                <span className="info-bar-valor">{membros}</span>
                            </div>
                        </div>
                        <div className="info-bar-item">
                            <Phone size={20} />
                            <div>
                                <span className="info-bar-label">Telefone</span>
                                <span className="info-bar-valor">{telefone}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sobre a congregação */}
            <section className="congregacao-sobre">
                <div className="container congregacao-sobre-grid">
                    <div className="congregacao-sobre-texto">
                        <p className="secao-subtitulo">Nossa History</p>
                        <h2 className="secao-titulo">
                            Sobre a<br />
                            Congregação {nome}
                        </h2>
                        <div className="divisor-dourado" />
                        <p className="secao-descricao">{descricao}</p>
                        <p className="secao-descricao">{descricao2}</p>

                        {coPastor && (
                            <div className="congregacao-lideranca">
                                <div className="lideranca-item">
                                    <div className="lideranca-icone">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <span className="lideranca-cargo">Pastor Titular</span>
                                        <span className="lideranca-nome">{pastor}</span>
                                    </div>
                                </div>
                                <div className="lideranca-item">
                                    <div className="lideranca-icone">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <span className="lideranca-cargo">Co-Pastor</span>
                                        <span className="lideranca-nome">{coPastor}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <a
                            href={`https://wa.me/${whatsapp}?text=Olá!%20Vim%20pelo%20site%20e%20gostaria%20de%20mais%20informações%20sobre%20a%20Congregação%20${encodeURIComponent(nome)}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-whatsapp-congregacao"
                        >
                            <MessageCircle size={18} />
                            <span>Falar com a Liderança</span>
                        </a>
                    </div>

                    {/* Cultos */}
                    <div className="congregacao-cultos-card">
                        <div className="cultos-card-header" style={{ background: cor }}>
                            <Clock size={22} />
                            <h3>Horários de Culto</h3>
                        </div>
                        <ul className="cultos-card-lista">
                            {cultos.map((culto, i) => (
                                <li key={i} className="culto-card-item">
                                    <div className="culto-card-dia" style={{ color: cor }}>
                                        {culto.dia}
                                    </div>
                                    <div className="culto-card-info">
                                        <span className="culto-card-tipo">{culto.tipo}</span>
                                        <span className="culto-card-horario">{culto.horario}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="cultos-card-footer">
                            <MapPin size={14} />
                            <span>{endereco}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Outras Congregações */}
            <section className="outras-congregacoes">
                <div className="container">
                    <p className="secao-subtitulo" style={{ textAlign: "center" }}>
                        Explore
                    </p>
                    <h2 className="secao-titulo" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                        Outras Congregações
                    </h2>
                    <div className="divisor-dourado" style={{ margin: "1rem auto 2.5rem" }} />

                    <div className="carousel-outer">
                        <button className="carousel-btn" onClick={prev} aria-label="Anterior">
                            <ChevronLeft size={20} />
                        </button>

                        <div className="carousel-wrapper">
                            <div className="carousel-track" ref={trackRef}>
                                {outras.map((c) => (
                                    <Link key={c.slug} to={`/congregacao/${c.slug}`} className="outra-card">
                                        <div className="outra-card-imagem">
                                            <img src={c.imagem} alt={c.nome} loading="lazy" />
                                            <div className="outra-card-overlay" style={{ background: c.cor }} />
                                        </div>
                                        <div className="outra-card-info">
                                            <span className="outra-card-subtitulo">{c.subtitulo}</span>
                                            <h3 className="outra-card-nome">{c.nome}</h3>
                                            <span className="outra-card-cidade">{c.cidade}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <button className="carousel-btn" onClick={next} aria-label="Próximo">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="carousel-dots">
                        {outras.map((_, i) => (
                            <button
                                key={i}
                                className={`carousel-dot${i === idx ? " ativo" : ""}`}
                                onClick={() => setIdx(i)}
                                aria-label={`Ir para congregação ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
