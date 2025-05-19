# Desenvolvimento_de_Pagina_Web_com_Integracao_de_Tecnologias_web_Modernas


# Educação Financeira

Uma aplicação web para educação financeira, permitindo aos usuários gerenciar finanças, interagir com um bot financeiro, conversar com administradores, e aos administradores gerenciar usuários e dúvidas.

## Tecnologias Utilizadas
- **Front-end**: HTML5, CSS3, JavaScript, Bootstrap 5.3.0
- **Back-end**: Node.js, Express.js
- **WebSocket**: Socket.IO 4.5.0
- **Outras bibliotecas**: UUID
- **Hospedagem**: Render

## Pré-requisitos
- Node.js 18.x ou superior
- npm 8.x ou superior
- Git
- Navegador moderno (Chrome, Firefox, Edge)

## Instalação

1. Instale as dependências:
  
   npm install
   
3. Crie o arquivo `server/data/database.json`:
   
   {
     "users": [],
     "financialData": [],
     "savings": [],
     "reports": [],
     "definitions": [],
     "queries": []
   }
   
4. Configure as variáveis de ambiente em `.env`:
   env
   PORT=3001
   NODE_ENV=development
   

## Como Executar
- Inicie o servidor:
  
  npm start
  
- Acesse em `http://localhost:3000`.

## Estrutura do Projeto

projeto-pagina-web/
├── public/
│   ├── index.html            Página inicial
│   ├── savings.html          Página de poupança
│   ├── reports.html          Página de relatórios
│   ├── chat.html             Página de chat
│   ├── admin.html            Painel administrativo
│   ├── login.html            Página de login
│   ├── register.html         Página de cadastro
│   └── estilo.css
├── server/
│   ├── app.js                Configuração do servidor Express e Socket.IO
│   ├── routes.js             Definição das rotas da API
│   └── data/
│       └── database.json     Banco de dados JSON       # Estilos personalizados
├── package.json              Configuração do projeto
└── README.md                 Instruções do projeto


## Funcionalidades
- **Login e Cadastro**: Autenticação de usuários com email e senha, com redirecionamento para o painel administrativo (administradores) ou página inicial (usuários comuns).
- **Chat**: Interação com um bot financeiro por até 6 mensagens, seguida por conversa com o administrador para usuários logados. Persistência do contador de mensagens e histórico no `localStorage`.
- **Painel Administrativo**: Exibe mensagem de boas-vindas por 5 segundos, permite gerenciar usuários (promover/excluir), administradores (adicionar/editar/excluir), dúvidas e monitorar atividades.
- **Poupança**: Cálculo e salvamento de planos de poupança no `database.json`.
- **Relatórios**: Criação e visualização de metas financeiras, salvas no `database.json`.
- **Responsividade**: Interface adaptável a dispositivos móveis e desktops com Bootstrap.

## Hospedagem
A aplicação está hospedada no Render. Para implantar:
1. Envie o projeto ao GitHub:
   
   git init
   git add .
   git commit -m "primeiro commit"
   git remote add origin https://github.com/Tobias0036/Desenvolvimento_de_pagina_Web_com_Integracao_de_Tecnologias_Web_Modernas.git 
   git push -u origin main
   
2. No Render, criei um Web Service:
   - Conecte ao repositório GitHub.
   - Configuracao:
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Environment Variables: `PORT=3001`, `NODE_ENV=production`
3. Habilite Auto-Deploy para atualizações no branch `main`.
4. Acesse via `https://desenvolvimento-de–pagina-web-com.pe26.onrender.com`.

## Testes
- Testes manuais realizados para validar login, cadastro, chat, painel administrativo, poupança, relatórios e persistência de dados.

## Licença
MIT License