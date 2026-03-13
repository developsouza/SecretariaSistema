import { Heart, BookOpen, Users, Star } from "lucide-react";

const features = [
    {
        icone: <BookOpen size={16} />,
        titulo: "Pregação Fiel",
        desc: "Fundados na Palavra de Deus em sua totalidade",
    },
    {
        icone: <Heart size={16} />,
        titulo: "Amor ao Próximo",
        desc: "Servindo a comunidade com graça e compaixão",
    },
    {
        icone: <Users size={16} />,
        titulo: "Comunidade Viva",
        desc: "Um povo unido pelo amor de Cristo",
    },
    {
        icone: <Star size={16} />,
        titulo: "Adoração Genuína",
        desc: "Louvor que transforma e glorifica a Deus",
    },
];

export default function Sobre() {
    return (
        <section id="sobre" className="bem-vindo">
            <div className="container">
                <div className="bem-vindo-grid">
                    {/* Coluna da imagem */}
                    <div className="bem-vindo-imagem">
                        <img className="bem-vindo-foto" src="/culto.png" alt="Culto na Assembleia de Deus em Jacumã" loading="lazy" />
                        <div className="bem-vindo-ornamento" />
                        <div className="bem-vindo-badge-img">
                            <span className="badge-ano">+30</span>
                            <span className="badge-texto">Anos servindo</span>
                            <span className="badge-texto">a Deus e ao povo</span>
                        </div>
                    </div>

                    {/* Coluna do texto */}
                    <div>
                        <p className="secao-subtitulo">Nossa História</p>
                        <h2 className="secao-titulo">
                            Uma Igreja
                            <br />
                            de Propósito
                        </h2>
                        <div className="divisor-dourado" />

                        <p className="secao-descricao">
                            A Assembleia de Deus em Jacumã é uma comunidade de fé que há mais de três décadas vem impactando vidas no litoral sul da
                            Paraíba. Nossa missão é simples: amar a Deus e ao próximo, proclamar o Evangelho e fazer discípulos.
                        </p>
                        <p className="secao-descricao">
                            Somos uma igreja pentecostal, alicerçada nas Sagradas Escrituras, onde todos são bem-vindos para encontrar salvação, cura
                            e restauração em Jesus Cristo.
                        </p>

                        <div className="bem-vindo-features">
                            {features.map((f, i) => (
                                <div className="feature-item" key={i}>
                                    <div className="feature-icone">{f.icone}</div>
                                    <div>
                                        <div className="feature-titulo">{f.titulo}</div>
                                        <div className="feature-desc">{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: "2.5rem" }}>
                            <a
                                href="#contato"
                                className="btn-primario"
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.querySelector("#contato")?.scrollIntoView({ behavior: "smooth" });
                                }}
                            >
                                <span>Fale Conosco</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
