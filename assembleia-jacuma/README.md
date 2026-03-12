# 🕊️ Site da Assembleia de Deus em Jacumã

Site moderno e profissional para a Assembleia de Deus em Jacumã, Paraíba.  
Construído com **React + Vite** (frontend) e **Node.js + Express + SQLite** (backend).

---

## 📁 Estrutura do Projeto

```
assembleia-jacuma/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/   # Navbar, Hero, Sobre, Cultos, etc.
│   │   ├── hooks/        # useApi (chamadas ao backend)
│   │   └── index.css     # Design System completo
│   └── package.json
├── backend/           # Node.js + Express + SQLite
│   ├── src/
│   │   ├── routes/       # eventos, contato, ministerios
│   │   ├── database/     # SQLite (better-sqlite3)
│   │   └── index.js      # Servidor principal
│   └── package.json
└── README.md
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### 1. Backend

```bash
cd backend
npm install
npm run dev
# Rodando em http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Rodando em http://localhost:5173
```

---

## 🌐 Deploy em Servidor Linux (Produção)

### 1. Build do Frontend

```bash
cd frontend
npm run build
# Gera a pasta dist/
```

### 2. Variáveis de Ambiente (backend)

Crie o arquivo `backend/.env`:

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://seudominio.com.br
```

### 3. Configurar Nginx

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    # Redirecionar para HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name seudominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    # Servir frontend (React build)
    root /var/www/assembleia-jacuma/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para o backend Node.js
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Rodar o Backend com PM2

```bash
npm install -g pm2

cd /var/www/assembleia-jacuma/backend
npm install --production

pm2 start src/index.js --name "adjacuma-api"
pm2 save
pm2 startup
```

### 5. Certificado SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br
```

---

## 🔗 API Endpoints

| Método | Endpoint             | Descrição                      |
|--------|----------------------|-------------------------------|
| GET    | /api/eventos         | Lista próximos eventos         |
| GET    | /api/eventos/:id     | Detalhes de um evento          |
| POST   | /api/eventos         | Criar evento (admin)           |
| DELETE | /api/eventos/:id     | Deletar evento (admin)         |
| GET    | /api/ministerios     | Lista todos os ministérios     |
| POST   | /api/contato         | Enviar mensagem de contato     |
| GET    | /api/health          | Status do servidor             |

---

## 🎨 Design System

- **Fontes**: Cormorant Garamond (display) + Nunito (corpo)
- **Azul Profundo**: `#0D1B2A`
- **Dourado Sagrado**: `#C9A84C`
- **Creme**: `#F8F4ED`

---

## ✏️ Personalizações Necessárias

Antes de publicar, edite os seguintes arquivos:

### `frontend/src/components/Localizacao.jsx`
- Substitua o link do Google Maps pelo endereço real da igreja
- Atualize endereço, telefone e e-mail

### `frontend/src/components/Navbar.jsx`
- Atualize o número do WhatsApp (`5583999999999`)

### `frontend/src/components/Hero.jsx`
- Ajuste a contagem de anos, membros e ministérios

### `frontend/src/components/Footer.jsx`
- Atualize os links das redes sociais (Instagram, Facebook, YouTube)

---

## 📦 Tecnologias

| Tecnologia     | Uso              |
|---------------|-----------------|
| React 18      | Interface web    |
| Vite 5        | Build tool       |
| Lucide React  | Ícones           |
| Node.js       | Servidor backend |
| Express 4     | Framework HTTP   |
| better-sqlite3| Banco de dados   |
| Nginx         | Servidor web     |
| PM2           | Processo manager |

---

*Desenvolvido para a Glória de Deus 🙏*
