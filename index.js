require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const Database = require('./database');
const { config } = require('./config');
const HydrusService = require('./hydrus-service');
const ErrorLogger = require('./error-logger');
const authRoutes = require('./routes/auth');
const creatorRoutes = require('./routes/creators');
const { router: staffRoutes, setSocketIO } = require('./routes/staff');
const DiscordBot = require('./discord-bot');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Inicializar sistema de logs
const errorLogger = new ErrorLogger();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de logs de erro
app.use(errorLogger.errorHandler());
app.use(errorLogger.validationErrorHandler());
app.use(errorLogger.databaseErrorHandler());
app.use(errorLogger.networkErrorHandler());

// Inicializar banco de dados primeiro
async function initializeApp() {
  try {
    const db = new Database();
    await db.init();
    await db.initVrpPool();
    
    // Disponibilizar instância do banco globalmente
    global.database = db;
    console.log('✅ Banco de dados inicializado com sucesso!');
    
    // Log de sucesso
    errorLogger.logSuccess('Banco de dados inicializado com sucesso', {
      endpoint: 'INITIALIZATION',
      user: 'SYSTEM'
    });
    
    // Testar conexão com Hydrus.gg
    const hydrusService = new HydrusService();
    hydrusService.testConnection()
      .then(connected => {
        if (connected) {
          console.log('🛍️ Integração com Hydrus.gg ativa');
          global.hydrusService = hydrusService;
          errorLogger.logSuccess('Integração com Hydrus.gg ativa', {
            endpoint: 'HYDRUS_CONNECTION',
            user: 'SYSTEM'
          });
        } else {
          console.log('⚠️ Integração com Hydrus.gg não disponível');
          global.hydrusService = null;
          errorLogger.logWarning('Integração com Hydrus.gg não disponível', {
            endpoint: 'HYDRUS_CONNECTION',
            user: 'SYSTEM'
          });
        }
      })
      .catch(error => {
        console.error('❌ Erro ao testar conexão com Hydrus.gg:', error);
        global.hydrusService = null;
        errorLogger.logError(error, {
          endpoint: 'HYDRUS_CONNECTION',
          user: 'SYSTEM'
        });
      });
    
    // Configurar Socket.IO para staff routes
    setSocketIO(io);
    
    // Carregar rotas após o banco estar pronto
    app.use('/api/auth', authRoutes);
    app.use('/api/creators', creatorRoutes);
    app.use('/api/creator', creatorRoutes); // Rotas para o novo painel
    app.use('/api/staff', staffRoutes);
    app.use('/api/admin', require('./routes/admin'));
    
    // Rota principal
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Rotas para páginas de recuperação de senha
    app.get('/forgot-password', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
    });
    
    app.get('/reset-password', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
    });
    
    // Rota para login do criador
    app.get('/creator-login', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'creator-login.html'));
    });
    
    // Rota para testar webhook
    app.get('/api/test-webhook', async (req, res) => {
      try {
        const result = await errorLogger.webhook.testWebhook();
        if (result) {
          res.json({ success: true, message: 'Webhook testado com sucesso' });
        } else {
          res.json({ success: false, message: 'Falha no teste do webhook' });
        }
      } catch (error) {
        res.json({ success: false, message: `Erro: ${error.message}` });
      }
    });

    // Rotas para testar diferentes tipos de log
    app.post('/api/test-log/error', async (req, res) => {
      try {
        await errorLogger.logError(new Error('Erro de teste gerado manualmente'), {
          endpoint: 'POST /api/test-log/error',
          user: 'TESTE',
          requestData: { teste: true }
        });
        res.json({ success: true, message: 'Log de erro enviado com sucesso' });
      } catch (error) {
        res.json({ success: false, message: `Erro: ${error.message}` });
      }
    });

    app.post('/api/test-log/warning', async (req, res) => {
      try {
        await errorLogger.logWarning('Warning de teste gerado manualmente', {
          endpoint: 'POST /api/test-log/warning',
          user: 'TESTE',
          requestData: { teste: true }
        });
        res.json({ success: true, message: 'Log de warning enviado com sucesso' });
      } catch (error) {
        res.json({ success: false, message: `Erro: ${error.message}` });
      }
    });

    app.post('/api/test-log/info', async (req, res) => {
      try {
        await errorLogger.logInfo('Informação de teste gerada manualmente', {
          endpoint: 'POST /api/test-log/info',
          user: 'TESTE',
          requestData: { teste: true }
        });
        res.json({ success: true, message: 'Log de info enviado com sucesso' });
      } catch (error) {
        res.json({ success: false, message: `Erro: ${error.message}` });
      }
    });

    app.post('/api/test-log/success', async (req, res) => {
      try {
        await errorLogger.logSuccess('Sucesso de teste gerado manualmente', {
          endpoint: 'POST /api/test-log/success',
          user: 'TESTE',
          requestData: { teste: true }
        });
        res.json({ success: true, message: 'Log de sucesso enviado com sucesso' });
      } catch (error) {
        res.json({ success: false, message: `Erro: ${error.message}` });
      }
    });
    
    // Middleware de tratamento de erros para APIs
    app.use('/api/*', (req, res, next) => {
      res.status(404).json({ 
        error: 'Endpoint não encontrado',
        path: req.path,
        method: req.method 
      });
    });
    
    // Middleware de tratamento de erros geral
    app.use((err, req, res, next) => {
      console.error('Erro no servidor:', err);
      
      // Se for uma requisição para API, retornar JSON
      if (req.path.startsWith('/api/')) {
        return res.status(500).json({ 
          error: 'Erro interno do servidor',
          message: err.message 
        });
      }
      
      // Para outras requisições, retornar página de erro
      res.status(500).send('Erro interno do servidor');
    });
    
    // Socket.IO para atualizações em tempo real
    io.on('connection', (socket) => {
      console.log('Usuário conectado:', socket.id);
      
      socket.on('join-staff-room', () => {
        socket.join('staff-room');
        console.log('Staff conectado ao painel de aprovação');
      });
      
      socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
      });
    });
    
    // Inicializar bot do Discord
    let discordBot = null;
    if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID && process.env.DISCORD_BOT_TOKEN !== 'seu_token_do_bot_aqui') {
        discordBot = new DiscordBot();
        discordBot.connect(process.env.DISCORD_BOT_TOKEN, process.env.DISCORD_GUILD_ID)
            .then(() => {
                console.log('🤖 Bot do Discord inicializado com sucesso');
                // Disponibilizar bot do Discord globalmente após conexão
                global.discordBot = discordBot;
                errorLogger.logSuccess('Bot do Discord inicializado com sucesso', {
                  endpoint: 'DISCORD_BOT',
                  user: 'SYSTEM'
                });
            })
            .catch((error) => {
                console.error('❌ Erro ao inicializar bot do Discord:', error.message);
                console.log('⚠️ A aplicação continuará funcionando sem o bot do Discord');
                global.discordBot = null;
                errorLogger.logError(error, {
                  endpoint: 'DISCORD_BOT',
                  user: 'SYSTEM'
                });
            });
    } else {
        console.log('⚠️ Bot do Discord não configurado - funcionalidades do Discord não estarão disponíveis');
        console.log('💡 Para configurar, consulte o arquivo DISCORD_SETUP.md');
        errorLogger.logWarning('Bot do Discord não configurado', {
          endpoint: 'DISCORD_BOT',
          user: 'SYSTEM'
        });
    }
    
    const PORT = config.server.port;
    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse: http://${config.server.host}:${PORT}`);
      
      errorLogger.logSuccess(`Servidor iniciado na porta ${PORT}`, {
        endpoint: 'SERVER_START',
        user: 'SYSTEM'
      });
    });
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    errorLogger.logError(error, {
      endpoint: 'DATABASE_INIT',
      user: 'SYSTEM'
    });
    process.exit(1);
  }
}

// Disponibilizar errorLogger globalmente
global.errorLogger = errorLogger;

// Inicializar aplicação
initializeApp();

module.exports = { app, io }; 