import { MapPin, Phone, Mail, Clock } from "lucide-react";

const infos = [
    {
        icone: <MapPin size={18} />,
        label: "Endereço",
        valor: "Rua Abílio dos Santos Ribeiro, s/n — Jacumã\nConde, Paraíba — CEP 58.320-000",
    },
    {
        icone: <Phone size={18} />,
        label: "Telefone / WhatsApp",
        valor: "(83) 99334-6304",
    },
    {
        icone: <Mail size={18} />,
        label: "E-mail",
        valor: "adjacumasecretaria@gmail.com",
    },
    {
        icone: <Clock size={18} />,
        label: "Secretaria — Atendimento",
        valor: "Segunda a Sexta: 08h às 12h\nSegunda a Sexta: 14h às 17h",
    },
];

export default function Localizacao() {
    return (
        <section id="localizacao" className="localizacao">
            <div className="container">
                <div className="localizacao-grid">
                    <div>
                        <p className="secao-subtitulo">Como Chegar</p>
                        <h2 className="secao-titulo">Venha nos Visitar</h2>
                        <div className="divisor-dourado" />

                        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
                            Estamos localizados em Jacumã, litoral sul da Paraíba. Nossa igreja está de portas abertas para recebê-lo!
                        </p>

                        <div className="info-contato-lista">
                            {infos.map((info, i) => (
                                <div className="info-item" key={i}>
                                    <div className="info-icone">{info.icone}</div>
                                    <div>
                                        <div className="info-label">{info.label}</div>
                                        <div className="info-valor" style={{ whiteSpace: "pre-line" }}>
                                            {info.valor}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mapa do Google */}
                    <div className="mapa-container">
                        <iframe
                            src="https://maps.google.com/maps?q=P59V%2B5P+Jacum%C3%A3%2C+Conde+-+PB&output=embed&hl=pt-BR"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Localização da Assembleia de Deus em Jacumã"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
