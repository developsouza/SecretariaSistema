import { useState, useEffect } from "react";
import { ChevronDown, Play, MapPin } from "lucide-react";

const REFERENCIAS = [
    { ref: "john 3:16", display: "João 3:16" },
    { ref: "john 14:6", display: "João 14:6" },
    { ref: "john 15:13", display: "João 15:13" },
    { ref: "matthew 6:33", display: "Mateus 6:33" },
    { ref: "matthew 11:28", display: "Mateus 11:28" },
    { ref: "matthew 28:19", display: "Mateus 28:19" },
    { ref: "mark 16:15", display: "Marcos 16:15" },
    { ref: "luke 4:18", display: "Lucas 4:18" },
    { ref: "acts 1:8", display: "Atos 1:8" },
    { ref: "romans 1:16", display: "Romanos 1:16" },
    { ref: "romans 5:8", display: "Romanos 5:8" },
    { ref: "romans 8:28", display: "Romanos 8:28" },
    { ref: "romans 8:31", display: "Romanos 8:31" },
    { ref: "romans 10:13", display: "Romanos 10:13" },
    { ref: "1 corinthians 10:13", display: "1 Coríntios 10:13" },
    { ref: "1 corinthians 15:57", display: "1 Coríntios 15:57" },
    { ref: "2 corinthians 5:17", display: "2 Coríntios 5:17" },
    { ref: "2 corinthians 9:8", display: "2 Coríntios 9:8" },
    { ref: "2 corinthians 12:9", display: "2 Coríntios 12:9" },
    { ref: "galatians 2:20", display: "Gálatas 2:20" },
    { ref: "ephesians 2:8", display: "Efésios 2:8" },
    { ref: "ephesians 3:20", display: "Efésios 3:20" },
    { ref: "ephesians 6:10", display: "Efésios 6:10" },
    { ref: "philippians 4:4", display: "Filipenses 4:4" },
    { ref: "philippians 4:7", display: "Filipenses 4:7" },
    { ref: "philippians 4:13", display: "Filipenses 4:13" },
    { ref: "philippians 4:19", display: "Filipenses 4:19" },
    { ref: "colossians 3:23", display: "Colossenses 3:23" },
    { ref: "2 timothy 1:7", display: "2 Timóteo 1:7" },
    { ref: "hebrews 11:1", display: "Hebreus 11:1" },
    { ref: "james 4:7", display: "Tiago 4:7" },
    { ref: "1 peter 5:7", display: "1 Pedro 5:7" },
    { ref: "1 john 4:8", display: "1 João 4:8" },
    { ref: "1 john 4:19", display: "1 João 4:19" },
    { ref: "psalm 23:1", display: "Salmos 23:1" },
    { ref: "psalm 27:1", display: "Salmos 27:1" },
    { ref: "psalm 34:8", display: "Salmos 34:8" },
    { ref: "psalm 37:4", display: "Salmos 37:4" },
    { ref: "psalm 46:1", display: "Salmos 46:1" },
    { ref: "psalm 91:1", display: "Salmos 91:1" },
    { ref: "psalm 103:2", display: "Salmos 103:2" },
    { ref: "psalm 119:105", display: "Salmos 119:105" },
    { ref: "proverbs 3:5", display: "Provérbios 3:5" },
    { ref: "proverbs 18:21", display: "Provérbios 18:21" },
    { ref: "isaiah 40:31", display: "Isaías 40:31" },
    { ref: "isaiah 41:10", display: "Isaías 41:10" },
    { ref: "isaiah 43:19", display: "Isaías 43:19" },
    { ref: "isaiah 53:5", display: "Isaías 53:5" },
    { ref: "jeremiah 29:11", display: "Jeremias 29:11" },
    { ref: "jeremiah 33:3", display: "Jeremias 33:3" },
    { ref: "lamentations 3:22", display: "Lamentações 3:22" },
    { ref: "joshua 1:9", display: "Josué 1:9" },
    { ref: "deuteronomy 31:6", display: "Deuteronômio 31:6" },
    { ref: "malachi 3:10", display: "Malaquias 3:10" },
];

const FALLBACK = {
    texto: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.",
    referencia: "João 3:16",
};

export default function Hero() {
    const [verso, setVerso] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const item = REFERENCIAS[Math.floor(Math.random() * REFERENCIAS.length)];
        fetch(`https://bible-api.com/${encodeURIComponent(item.ref)}?translation=almeida`)
            .then((r) => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then((data) => setVerso({ texto: data.text.trim().replace(/\n/g, " "), referencia: item.display }))
            .catch(() => setVerso(FALLBACK))
            .finally(() => setCarregando(false));
    }, []);

    const scrollToSobre = (e) => {
        e.preventDefault();
        document.querySelector("#sobre")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <section id="inicio" className="hero">
            <div className="hero-bg" />
            <div className="hero-ornamento" />
            <div className="hero-grid" />

            <div className="container">
                <div className="hero-conteudo">
                    <h1 className="hero-titulo hero-anim" style={{ animationDelay: "0.25s" }}>
                        <em>Assembleia</em> de Deus
                    </h1>

                    <p className="hero-local hero-anim" style={{ animationDelay: "0.4s" }}>
                        em Jacumã
                    </p>

                    <div className="hero-divisor hero-anim" style={{ animationDelay: "0.5s" }} />

                    <blockquote
                        className={`hero-verso hero-anim ${carregando ? "hero-verso-loading" : "hero-verso-loaded"}`}
                        style={{ animationDelay: "0.55s" }}
                    >
                        {carregando ? (
                            <>
                                <span className="hero-verso-shimmer" />
                                <span className="hero-verso-shimmer hero-verso-shimmer--curto" />
                            </>
                        ) : (
                            <>
                                "{verso.texto}"
                                <br />
                                <span className="hero-verso-ref">— {verso.referencia}</span>
                            </>
                        )}
                    </blockquote>

                    <div className="hero-acoes hero-anim" style={{ animationDelay: "0.7s" }}>
                        <a
                            href="#cultos"
                            className="btn-primario"
                            onClick={(e) => {
                                e.preventDefault();
                                document.querySelector("#cultos")?.scrollIntoView({ behavior: "smooth" });
                            }}
                        >
                            <span>Horários dos Cultos</span>
                        </a>
                        <a href="#sobre" className="btn-secundario" onClick={scrollToSobre}>
                            <Play size={14} fill="currentColor" />
                            Conheça Nossa Igreja
                        </a>
                    </div>

                    <div className="hero-stats hero-anim" style={{ animationDelay: "0.85s" }}>
                        <div className="hero-stat">
                            <span className="hero-stat-num">+30</span>
                            <span className="hero-stat-label">Anos de História</span>
                        </div>
                        <div className="hero-stats-sep" />
                        <div className="hero-stat">
                            <span className="hero-stat-num">+500</span>
                            <span className="hero-stat-label">Membros</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hero-scroll">
                <span>Explorar</span>
                <div className="scroll-mouse" />
                <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
        </section>
    );
}
