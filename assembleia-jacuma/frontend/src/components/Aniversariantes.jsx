import { useState, useEffect } from "react";
import { Cake, Clock, MapPin, ExternalLink, PartyPopper } from "lucide-react";

const SLUG = "assembleia-de-deus-em-jacum";
const SAAS_API = import.meta.env.VITE_SAAS_API_URL || "/saas-api";
const AGENDA_PUBLICA_URL = "https://secretariaigreja.g3tsistemas.com.br/agenda/assembleia-de-deus-em-jacum";
const ANIVERSARIOS_PUBLICOS_URL = "https://secretariaigreja.g3tsistemas.com.br/aniversarios/assembleia-de-deus-em-jacum";

const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function calcularIdade(dataNasc) {
    const hoje = new Date();
    const nasc = new Date(dataNasc + "T00:00:00");
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
}

function EventoItem({ evento }) {
    const data = new Date(evento.data_inicio + "T00:00:00");
    const dia = data.getDate().toString().padStart(2, "0");
    const mes = meses[data.getMonth()];

    return (
        <div className="aniv-evento-item">
            <div className="aniv-evento-data">
                <span className="aniv-evento-dia">{dia}</span>
                <span className="aniv-evento-mes">{mes}</span>
            </div>
            <div className="aniv-evento-sep" />
            <div className="aniv-evento-info">
                <h4>{evento.titulo}</h4>
                <div className="aniv-evento-meta">
                    {evento.hora_inicio && !evento.dia_todo && (
                        <span>
                            <Clock size={11} />
                            {evento.hora_inicio}
                        </span>
                    )}
                    {evento.local && (
                        <span>
                            <MapPin size={11} />
                            {evento.local}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function AniversarianteItem({ membro, destaque }) {
    const data = new Date(membro.data_nascimento + "T00:00:00");
    const dia = data.getDate().toString().padStart(2, "0");
    const mes = meses[data.getMonth()];
    const idade = calcularIdade(membro.data_nascimento) + (destaque ? 0 : 1);

    return (
        <div className={`aniv-membro-item${destaque ? " aniv-membro-hoje" : ""}`}>
            <div className="aniv-membro-data">
                <span className="aniv-membro-dia">{dia}</span>
                <span className="aniv-membro-mes">{mes}</span>
            </div>
            <div className="aniv-evento-sep" />
            <div className="aniv-membro-info">
                <h4>{membro.nome_completo}</h4>
                <div className="aniv-membro-meta">
                    {membro.cargo && membro.cargo !== "Membro" && <span className="aniv-membro-cargo">{membro.cargo}</span>}
                    {membro.congregacao && <span>{membro.congregacao}</span>}
                    {destaque && (
                        <span className="aniv-badge-hoje">
                            <PartyPopper size={10} /> Hoje!
                        </span>
                    )}
                    {!destaque && <span className="aniv-idade">Fará {idade} anos</span>}
                </div>
            </div>
        </div>
    );
}

export default function Aniversariantes() {
    const [eventos, setEventos] = useState([]);
    const [hoje, setHoje] = useState([]);
    const [proximos, setProximos] = useState([]);
    const [mesSelecionado, setMesSelecionado] = useState(null);
    const [carregandoEventos, setCarregandoEventos] = useState(true);
    const [carregandoAniv, setCarregandoAniv] = useState(true);

    // Eventos
    useEffect(() => {
        fetch(`${SAAS_API}/publico/agenda/${SLUG}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((json) => {
                if (json.eventos) setEventos(json.eventos.slice(0, 6));
            })
            .catch(() => {})
            .finally(() => setCarregandoEventos(false));
    }, []);

    // Aniversariantes
    useEffect(() => {
        const agora = new Date();
        const mes = agora.getMonth() + 1;
        const ano = agora.getFullYear();
        setMesSelecionado(mes);

        fetch(`${SAAS_API}/publico/aniversarios/${SLUG}?mes=${mes}&ano=${ano}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((json) => {
                setHoje(json.hoje || []);
                setProximos(json.proximos || []);
            })
            .catch(() => {})
            .finally(() => setCarregandoAniv(false));
    }, []);

    const listaAniversariantes = [...hoje.map((m) => ({ ...m, _hoje: true })), ...proximos.filter((p) => !hoje.find((h) => h.id === p.id))];

    return (
        <section id="aniversariantes" className="aniversariantes">
            <div className="container">
                <div className="aniv-header">
                    <p className="secao-subtitulo">Agenda & Comunidade</p>
                    <h2 className="secao-titulo">Eventos e Aniversariantes</h2>
                    <div className="divisor-dourado" style={{ margin: "1.2rem auto" }} />
                    <p className="secao-descricao" style={{ margin: "0 auto", textAlign: "center" }}>
                        Fique por dentro dos próximos eventos e celebre com os nossos irmãos.
                    </p>
                </div>

                <div className="aniv-grid">
                    {/* ── Coluna: Eventos ── */}
                    <div className="aniv-coluna">
                        <div className="aniv-coluna-titulo">
                            <span className="aniv-coluna-badge">Programação</span>
                            <h3>Próximos Eventos</h3>
                        </div>

                        {carregandoEventos && <div className="aniv-loading">Carregando eventos...</div>}
                        {!carregandoEventos && eventos.length === 0 && <div className="aniv-vazio">Nenhum evento programado no momento.</div>}
                        {!carregandoEventos && eventos.length > 0 && (
                            <div className="aniv-lista">
                                {eventos.map((ev) => (
                                    <EventoItem key={ev.id} evento={ev} />
                                ))}
                            </div>
                        )}

                        <div className="aniv-rodape">
                            <a href={AGENDA_PUBLICA_URL} target="_blank" rel="noopener noreferrer" className="btn-primario">
                                <span>Ver agenda completa</span>
                                <ExternalLink size={15} />
                            </a>
                        </div>
                    </div>

                    {/* ── Coluna: Aniversariantes ── */}
                    <div className="aniv-coluna">
                        <div className="aniv-coluna-titulo">
                            <span className="aniv-coluna-badge aniv-badge-dourado">
                                <Cake size={13} /> {mesSelecionado ? MESES_NOME[mesSelecionado - 1] : ""}
                            </span>
                            <h3>Aniversariantes</h3>
                        </div>

                        {carregandoAniv && <div className="aniv-loading">Carregando aniversariantes...</div>}
                        {!carregandoAniv && listaAniversariantes.length === 0 && (
                            <div className="aniv-vazio">Nenhum aniversariante nos próximos dias.</div>
                        )}
                        {!carregandoAniv && listaAniversariantes.length > 0 && (
                            <div className="aniv-lista">
                                {listaAniversariantes.map((m) => (
                                    <AniversarianteItem key={m.id} membro={m} destaque={!!m._hoje} />
                                ))}
                            </div>
                        )}

                        <div className="aniv-rodape">
                            <a href={ANIVERSARIOS_PUBLICOS_URL} target="_blank" rel="noopener noreferrer" className="btn-aniversarios">
                                <Cake size={15} />
                                <span>Ver todos os aniversariantes</span>
                                <ExternalLink size={15} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
