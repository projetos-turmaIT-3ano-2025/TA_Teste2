const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const routes = require('../routes');

// Inicializa o aplicativo Express
const app = express();
// Cria o servidor HTTP
const server = http.createServer(app);
// Inicializa o Socket.IO 
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware para parsing de JSON
app.use(express.json());
// Arquivos estáticos da pasta raiz
app.use(express.static(path.join(__dirname, './public')));
// Middleware de logging para requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  // Emite evento de monitoramento de página
  io.emit('pageActivity', {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  next();
});

// Define as rotas da API
app.use('/api', routes);

// Mapa para armazenar usuários online (userId ou guestName -> { socketId, username })
const onlineUsers = new Map();
// Mapa para rastrear número de mensagens por usuário
const messageCounts = new Map();

// Evento de conexão do Socket.IO
io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  // Registra usuário logado ou visitante
  socket.on('registerUser', ({ userId, guestName, username }) => {
    const identifier = userId && userId !== 'anonymous' ? userId : `guest_${guestName}`;
    onlineUsers.set(identifier, { socketId: socket.id, username: username || guestName });
    if (!messageCounts.has(identifier)) {
      messageCounts.set(identifier, 0);
    }
    console.log(`Usuário registrado: ${identifier}, username=${username || guestName}`);
    // Emite lista de usuários online com nomes
    io.emit('updateUserList', {
      online: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, username: data.username })),
      offline: []
    });
  });

  // Recebe mensagens do chat
  socket.on('chatMessage', (msg) => {
    const identifier = Object.keys(onlineUsers).find(id => onlineUsers.get(id).socketId === socket.id);
    if (identifier && !msg.user.includes('Bot') && !msg.user.includes('Administrador') && !msg.user.includes('Sistema')) {
      const count = (messageCounts.get(identifier) || 0) + 1;
      messageCounts.set(identifier, count);
      if (count === 6) {
        // Notifica o administrador para iniciar conversa
        io.to('adminRoom').emit('userQuery', {
          userId: identifier,
          username: onlineUsers.get(identifier)?.username,
          query: 'Usuário atingiu o limite de 6 mensagens. Inicie a conversa.'
        });
      }
    }
    // Retransmite a mensagem para todos os clientes
    io.emit('chatMessage', msg);
  });

  // Admin entra na sala de administração
  socket.on('adminJoin', () => {
    socket.join('adminRoom');
    socket.emit('chatMessage', { user: 'Sistema', text: 'Administrador conectado.' });
  });

  // Admin envia mensagem para um usuário específico
  socket.on('adminMessage', ({ userId, text }) => {
    const target = onlineUsers.get(userId);
    if (target) {
      // Envia mensagem ao usuário
      io.to(target.socketId).emit('chatMessage', { user: 'Administrador', text });
      // Confirma ao admin
      socket.emit('chatMessage', { user: 'Administrador', text: `Para ${target.username}: ${text}` });
    } else {
      socket.emit('notification', { type: 'error', message: 'Usuário offline ou não encontrado.' });
    }
  });

  // Admin responde a uma dúvida
  socket.on('adminResponse', ({ userId, text }) => {
    const target = onlineUsers.get(userId);
    if (target) {
      // Envia resposta ao usuário
      io.to(target.socketId).emit('chatMessage', { user: 'Administrador', text });
      // Notifica o admin
      socket.emit('chatMessage', { user: 'Sistema', text: `Resposta enviada para ${target.username}` });
    }
  });

  // Recebe atualizações de relatórios
  socket.on('reportUpdate', (report) => {
    io.emit('reportUpdate', report);
  });

  // Recebe dúvidas enviadas ao admin
  socket.on('userQuery', (query) => {
    io.to('adminRoom').emit('userQuery', query);
  });

  // Emite notificações genéricas
  socket.on('notification', (notification) => {
    socket.emit('notification', notification);
  });

  // Evento de desconexão
  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
    for (let [userId, data] of onlineUsers) {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
        messageCounts.delete(userId);
        io.emit('updateUserList', {
          online: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, username: data.username })),
          offline: []
        });
        break;
      }
    }
  });
});

// Inicia o servidor na porta especificada
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`Servidor a correr na porta ${PORT}`));