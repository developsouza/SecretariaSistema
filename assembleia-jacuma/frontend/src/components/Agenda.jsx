import { useState, useEffect } from "react";
import { Clock, MapPin, Calendar, ExternalLink } from "lucide-react";

const SLUG = "assembleia-de-deus-em-jacum";
const SAAS_API = import.meta.env.VITE_SAAS_API_URL || "/saas-api";
const AGENDA_PUBLICA_URL = "https://secretariaigreja.g3tsistemas.com.br/agenda/assembleia-de-deus-em-jacum";

const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function EventoItem({ evento }) {
    // A API do SaaS usa data_inicio e hora_inicio
    const data = new Date(evento.data_inicio + "T00:00:00");
    const dia = data.getDate().toString().padStart(2, "0");
    const mes = meses[data.getMonth()];

    return (
        <div className="evento-item">
            <div className="evento-data">
                <span className="evento-dia">{dia}</span>
                <span className="evento-mes">{mes}</span>
            </div>

            <div className="evento-sep" />

            <div className="evento-info">
                <h4>{evento.titulo}</h4>
                <div className="evento-meta">
                    {evento.hora_inicio && !evento.dia_todo && (
                        <span>
                            <Clock size={12} />
                            {evento.hora_inicio}
                        </span>
                    )}
                    {evento.local && (
                        <span>
                            <MapPin size={12} />
                            {evento.local}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Agenda() {
    const [eventos, setEventos] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        fetch(`${SAAS_API}/publico/agenda/${SLUG}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((json) => {
                if (json.eventos) setEventos(json.eventos.slice(0, 6));
            })
            .catch((err) => {
                if (import.meta.env.DEV) console.warn("[Agenda] Erro ao carregar eventos:", err.message);
            })
            .finally(() => setCarregando(false));
    }, []);

    return (
        <section id="agenda" className="agenda">
            <div className="container">
                <div className="agenda-header">
                    <p className="secao-subtitulo">Programação</p>
                    <h2 className="secao-titulo">Próximos Eventos</h2>
                    <div className="divisor-dourado" style={{ margin: "1.2rem auto" }} />
                    <p className="secao-descricao" style={{ margin: "0 auto", textAlign: "center" }}>
                        Fique por dentro de tudo que está acontecendo na nossa comunidade.
                    </p>
                </div>

                {carregando && (
                    <div className="agenda-loading">
                        <Calendar size={32} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
                        Carregando eventos...
                    </div>
                )}

                {!carregando && eventos.length === 0 && <div className="agenda-vazia">Nenhum evento programado no momento.</div>}

                {!carregando && eventos.length > 0 && (
                    <div className="agenda-lista">
                        {eventos.map((ev) => (
                            <EventoItem key={ev.id} evento={ev} />
                        ))}
                    </div>
                )}

                <div className="agenda-rodape">
                    <a href={AGENDA_PUBLICA_URL} target="_blank" rel="noopener noreferrer" className="btn-primario">
                        <span>Ver mais eventos e agendar evento</span>
                        <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </section>
    );
}
