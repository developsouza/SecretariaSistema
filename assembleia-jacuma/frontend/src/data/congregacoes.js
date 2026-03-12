const cultoscongregacao = [
    { dia: "Terça-feira", horario: "19h00", tipo: "Escola Bíblica Dominical" },
    { dia: "Quinta-feira", horario: "19h00", tipo: "Culto de Ensinamento" },
    { dia: "Domingo", horario: "19h00", tipo: "Culto Evangelístico" },
];

export const congregacoes = [
    // ── TEMPLO SEDE ───────────────────────────────────────────────────────────
    {
        slug: "jacuma",
        nome: "Jacumã",
        subtitulo: "Templo Sede",
        bairro: "Jacumã",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Jacumã, Conde/PB",
        telefone: "(83) 9 9999-0001",
        whatsapp: "5583999990001",
        pastor: "Pr. João da Silva",
        coPastor: null,
        fundacao: "1993",
        membros: "320+",
        descricao: `O Templo Sede em Jacumã é o coração da nossa obra no litoral sul da Paraíba.
Fundada em 1993, tem sido fonte de avivamento, cura e restauração para centenas de famílias
ao longo das últimas décadas. Nossa visão é clara: pregar o Evangelho e fazer discípulos que
transformem a nação.`,
        descricao2: `Com uma comunidade vibrante e acolhedora, o Templo Sede realiza cultos de
louvor, escola bíblica dominical, ministério de jovens e crianças, além de ações sociais que
impactam toda a região de Jacumã e arredores.`,
        imagem: "https://images.unsplash.com/photo-1548625149-720754860504?w=900&q=80",
        cultos: [
            { dia: "Domingo", horario: "09h00", tipo: "Escola Bíblica Dominical" },
            { dia: "Domingo", horario: "19h00", tipo: "Culto Evangelístico" },
            { dia: "Quarta-feira", horario: "19h00", tipo: "Culto da Família" },
            { dia: "Sexta-feira", horario: "19h00", tipo: "Culto de Ensinamento" },
        ],
        coordenadas: { lat: -7.3505, lng: -34.7943 },
        cor: "#1b3a5c",
    },

    // ── CONGREGAÇÕES ─────────────────────────────────────────────────────────
    {
        slug: "coqueirinho",
        nome: "Coqueirinho",
        subtitulo: "Congregação",
        bairro: "Coqueirinho",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Coqueirinho, Conde/PB",
        telefone: "(83) 9 9999-0002",
        whatsapp: "5583999990002",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação de Coqueirinho está situada numa das mais belas praias do litoral
paraibano. Seu trabalho é voltado para alcançar moradores e visitantes com a mensagem do Evangelho,
sendo um ponto de luz na comunidade litorânea.`,
        descricao2: `A congregação desenvolve atividades com crianças, jovens e famílias, promovendo
comunhão, crescimento espiritual e impacto social na localidade de Coqueirinho.`,
        imagem: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.3621, lng: -34.8012 },
        cor: "#1b6b3a",
    },
    {
        slug: "tabatinga",
        nome: "Tabatinga",
        subtitulo: "Congregação",
        bairro: "Tabatinga",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Tabatinga, Conde/PB",
        telefone: "(83) 9 9999-0003",
        whatsapp: "5583999990003",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação de Tabatinga surgiu do coração missionário de irmãos que sentiram
o chamado de Deus para plantar uma obra nessa localidade litorânea. Com fidelidade, tem crescido
e se tornado referência de fé na comunidade.`,
        descricao2: `A congregação destaca-se pelo trabalho com famílias, oferecendo não apenas
o pão espiritual, mas também apoio prático através de ações de cuidado e amor ao próximo.`,
        imagem: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.372, lng: -34.81 },
        cor: "#7a3b1e",
    },
    {
        slug: "carapibus",
        nome: "Carapibus",
        subtitulo: "Congregação",
        bairro: "Carapibus",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Carapibus, Conde/PB",
        telefone: "(83) 9 9999-0004",
        whatsapp: "5583999990004",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação de Carapibus serve de refúgio espiritual para moradores e
veranistas na bela praia de Carapibus. Plantada como fruto da visão missionária do Templo Sede
em Jacumã, impacta vidas com o amor de Cristo.`,
        descricao2: `Com grupo fiel e comprometido, a congregação desenvolve trabalhos com
crianças, adolescentes e a terceira idade, além de eventos evangelísticos na orla durante
a temporada de verão.`,
        imagem: "https://images.unsplash.com/photo-1529516548873-9ce57c8f155e?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.383, lng: -34.815 },
        cor: "#2a6049",
    },
    {
        slug: "sao-bento",
        nome: "São Bento",
        subtitulo: "Congregação",
        bairro: "São Bento",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — São Bento, Conde/PB",
        telefone: "(83) 9 9999-0005",
        whatsapp: "5583999990005",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação de São Bento está estabelecida numa comunidade rural do
município de Conde, levando a Palavra de Deus a famílias que buscam fé, esperança e
transformação de vida.`,
        descricao2: `Com dedicação e amor, a liderança local cuida do rebanho e desenvolve
um trabalho sólido de evangelização e discipulado na região de São Bento.`,
        imagem: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.395, lng: -34.825 },
        cor: "#1565c0",
    },
    {
        slug: "dona-antonia",
        nome: "Dona Antônia",
        subtitulo: "Congregação",
        bairro: "Dona Antônia",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Dona Antônia, Conde/PB",
        telefone: "(83) 9 9999-0006",
        whatsapp: "5583999990006",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação de Dona Antônia é um ponto de encontro com Deus para a
comunidade local. Firme na Palavra e no amor ao próximo, tem crescido como testemunho
vivo do poder transformador do Evangelho.`,
        descricao2: `A congregação conta com uma equipe engajada que realiza cultos, visitas
e ações de cuidado pastoral, fortalecendo famílias e alcançando novos convertidos na região.`,
        imagem: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.405, lng: -34.835 },
        cor: "#6a1b9a",
    },
    {
        slug: "nova-canaa",
        nome: "Nova Canaã",
        subtitulo: "Congregação",
        bairro: "Nova Canaã",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Nova Canaã, Conde/PB",
        telefone: "(83) 9 9999-0007",
        whatsapp: "5583999990007",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação de Nova Canaã carrega em seu nome a promessa de uma terra
abençoada por Deus. Servindo a comunidade com o Evangelho, tem sido instrumento de cura,
restauração e esperança para muitas famílias.`,
        descricao2: `Com cultos cheios de fé e adoração, a congregação de Nova Canaã avança
na missão de alcançar almas e edificar vidas com a Palavra de Deus.`,
        imagem: "https://images.unsplash.com/photo-1468276311594-df7cb65d8df6?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.415, lng: -34.845 },
        cor: "#e65100",
    },
    {
        slug: "village",
        nome: "Village",
        subtitulo: "Congregação",
        bairro: "Village",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Village, Conde/PB",
        telefone: "(83) 9 9999-0008",
        whatsapp: "5583999990008",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação do Village está presente em um bairro residencial em crescimento,
levando o Evangelho a famílias que chegam em busca de uma vida nova. Um trabalho jovem e
cheio de propósito.`,
        descricao2: `A congregação se destaca pela evangelização no bairro e pelo cuidado com
as famílias locais, construindo uma comunidade de fé sólida e acolhedora no Village.`,
        imagem: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.348, lng: -34.788 },
        cor: "#37474f",
    },
    {
        slug: "gurugi",
        nome: "Gurugi",
        subtitulo: "Congregação",
        bairro: "Gurugi",
        cidade: "Conde — PB",
        endereco: "Rua Principal, s/n — Gurugi, Conde/PB",
        telefone: "(83) 9 9999-0009",
        whatsapp: "5583999990009",
        pastor: "Pb. —",
        coPastor: null,
        fundacao: "—",
        membros: "—",
        descricao: `A Congregação do Gurugi serve a uma comunidade de pescadores e moradores
do litoral, levando a mensagem de salvação e esperança em Cristo Jesus. Uma obra marcada
pela simplicidade e pela fé genuína do povo.`,
        descricao2: `Com um povo humilde e dedicado, a congregação do Gurugi cresce na graça
e no conhecimento do Senhor, sendo luz e sal em sua comunidade.`,
        imagem: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=900&q=80",
        cultos: cultoscongregacao,
        coordenadas: { lat: -7.335, lng: -34.782 },
        cor: "#880e4f",
    },
];
