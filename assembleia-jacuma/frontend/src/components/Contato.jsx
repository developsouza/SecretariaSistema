import { useState } from "react";
import { Send, Heart, BookOpen, Users } from "lucide-react";

const SLUG = "assembleia-jacuma";
const SAAS_API = import.meta.env.VITE_SAAS_API_URL || "/saas-api";

const pilares = [
    { icone: <BookOpen size={20} />, titulo: "Fundados na Bíblia", desc: "A Palavra de Deus é nossa única regra de fé e prática." },
    { icone: <Heart size={20} />, titulo: "Movidos pelo Amor", desc: "Servimos a Deus e ao próximo com amor incondicional." },
    { icone: <Users size={20} />, titulo: "Somos Família", desc: "Aqui você encontrará irmãos em Cristo para caminhar juntos." },
];

export default function Contato() {
    const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "" });
    const [status, setStatus] = useState(null); // null | 'enviando' | 'sucesso' | 'erro'
    const [msgFeedback, setMsgFeedback] = useState("");

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("enviando");
        try {
            const res = await fetch(`${SAAS_API}/publico/contato/${SLUG}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (json.sucesso) {
                setStatus("sucesso");
                setMsgFeedback(json.mensagem || "Mensagem enviada com sucesso!");
                setForm({ nome: "", email: "", telefone: "", mensagem: "" });
            } else {
                setStatus("erro");
                setMsgFeedback(json.erro || "Erro ao enviar. Tente novamente.");
            }
        } catch (err) {
            setStatus("erro");
            setMsgFeedback("Erro ao enviar. Tente novamente.");
        }
    };

    return (
        <section id="contato" className="contato">
            <div className="container">
                <div className="contato-grid">
                    {/* Info */}
                    <div>
                        <p className="secao-subtitulo">Entre em Contato</p>
                        <h2 className="secao-titulo">
                            Fale com
                            <br />a Nossa Igreja
                        </h2>
                        <div className="divisor-dourado" />
                        <p className="secao-descricao">
                            Tem alguma dúvida? Precisa de oração? Quer saber mais sobre nossas atividades? Estamos aqui para ajudar.
                        </p>

                        <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {pilares.map((p, i) => (
                                <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                                    <div
                                        style={{
                                            width: "44px",
                                            height: "44px",
                                            borderRadius: "50%",
                                            background: "linear-gradient(135deg, #C9A84C, #E2C97E)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#0D1B2A",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {p.icone}
                                    </div>
                                    <div>
                                        <div
                                            style={{
                                                fontFamily: "Cormorant Garamond, serif",
                                                fontSize: "1.1rem",
                                                fontWeight: 600,
                                                color: "#0D1B2A",
                                                marginBottom: "0.2rem",
                                            }}
                                        >
                                            {p.titulo}
                                        </div>
                                        <div style={{ fontSize: "0.88rem", color: "#8A8A8A", lineHeight: 1.6 }}>{p.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="contato-form">
                        <h3 className="form-titulo">Envie uma Mensagem</h3>
                        <p className="form-subtitulo">Responderemos em até 24 horas úteis</p>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="form-row">
                                <div className="form-grupo">
                                    <label className="form-label" htmlFor="nome">
                                        Nome *
                                    </label>
                                    <input
                                        id="nome"
                                        name="nome"
                                        type="text"
                                        className="form-input"
                                        placeholder="Seu nome completo"
                                        value={form.nome}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-grupo">
                                    <label className="form-label" htmlFor="telefone">
                                        Telefone
                                    </label>
                                    <input
                                        id="telefone"
                                        name="telefone"
                                        type="tel"
                                        className="form-input"
                                        placeholder="(83) 9 9999-9999"
                                        value={form.telefone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-grupo">
                                <label className="form-label" htmlFor="email">
                                    E-mail *
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className="form-input"
                                    placeholder="seu@email.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-grupo">
                                <label className="form-label" htmlFor="mensagem">
                                    Mensagem *
                                </label>
                                <textarea
                                    id="mensagem"
                                    name="mensagem"
                                    className="form-textarea"
                                    placeholder="Como podemos ajudá-lo? Escreva sua mensagem aqui..."
                                    value={form.mensagem}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="form-submit" disabled={status === "enviando"}>
                                {status === "enviando" ? (
                                    "Enviando..."
                                ) : (
                                    <>
                                        <Send size={15} style={{ display: "inline", marginRight: "0.5rem" }} />
                                        Enviar Mensagem
                                    </>
                                )}
                            </button>

                            {status === "sucesso" && <div className="form-sucesso">🙏 {msgFeedback}</div>}
                            {status === "erro" && <div className="form-erro">⚠️ {msgFeedback}</div>}
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
