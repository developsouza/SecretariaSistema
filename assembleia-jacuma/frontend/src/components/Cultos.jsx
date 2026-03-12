import { BookOpen, Sun, Users, BookMarked } from "lucide-react";

const cultos = [
    {
        icone: <BookOpen size={22} />,
        dia: "Domingo",
        nome: "Escola Bíblica Dominical",
        hora: "09:00",
        desc: "Aprofundamento na Palavra de Deus para todas as idades",
    },
    {
        icone: <Sun size={22} />,
        dia: "Domingo",
        nome: "Culto Evangelístico",
        hora: "19:00",
        desc: "Nosso principal culto semanal de louvor, adoração e evangelismo",
    },
    {
        icone: <Users size={22} />,
        dia: "Quarta-feira",
        nome: "Culto da Família",
        hora: "19:00",
        desc: "Um culto especial dedicado à edificação e união das famílias",
    },
    {
        icone: <BookMarked size={22} />,
        dia: "Sexta-feira",
        nome: "Culto de Ensinamento",
        hora: "19:00",
        desc: "Estudo aprofundado das Escrituras e edificação espiritual",
    },
];

export default function Cultos() {
    return (
        <section id="cultos" className="cultos">
            <div className="cultos-ornamento" />
            <div className="container">
                <div className="cultos-header">
                    <p className="secao-subtitulo">Venha Nos Visitar</p>
                    <h2 className="secao-titulo" style={{ color: "white" }}>
                        Horários dos Cultos
                    </h2>
                    <div className="divisor-dourado" style={{ margin: "1.2rem auto" }} />
                    <p style={{ color: "rgba(255,255,255,0.55)", maxWidth: "500px", margin: "0 auto", fontSize: "0.95rem" }}>
                        Nossas portas estão sempre abertas. Venha como você é — você é bem-vindo aqui.
                    </p>
                </div>

                <div className="cultos-grid">
                    {cultos.map((c, i) => (
                        <div className="culto-card" key={i}>
                            <div className="culto-icone">{c.icone}</div>
                            <div className="culto-nome">{c.nome}</div>
                            <div className="culto-dia">{c.dia}</div>
                            <div className="culto-hora">{c.hora}</div>
                            <p className="culto-desc">{c.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
