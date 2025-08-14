const express = require('express');
const Database = require('../database');
const jwt = require('jsonwebtoken');
const HydrusService = require('../hydrus-service');
const router = express.Router();
const multer = require('multer');
const DiscordWebhook = require('../discord-webhook');

// Configurar multer com limites específicos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    fieldSize: 10 * 1024 * 1024, // 10MB por campo
    files: 2, // Máximo 2 arquivos
    fields: 10 // Máximo 10 campos
  }
});

// Middleware para tratar erros do multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Erro do Multer:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'Arquivo muito grande. Tamanho máximo permitido: 10MB' 
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ 
        error: 'Muitos arquivos. Máximo permitido: 2 arquivos' 
      });
    }
    
    if (error.code === 'LIMIT_FIELD_COUNT') {
      return res.status(413).json({ 
        error: 'Muitos campos. Máximo permitido: 10 campos' 
      });
    }
    
    return res.status(413).json({ 
      error: 'Erro no upload do arquivo. Verifique o tamanho e formato.' 
    });
  }
  next(error);
};

const discordWebhook = new DiscordWebhook();

// Chave secreta para JWT (em produção, use uma variável de ambiente)
const JWT_SECRET = 'bot-criador-secret-key-2024';

// Middleware para verificar se o banco de dados está disponível
router.use((req, res, next) => {
  if (!global.database) {
    console.error('❌ Banco de dados não está disponível');
    return res.status(503).json({ 
      error: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.' 
    });
  }
  next();
});

// Obter todas as áreas disponíveis
router.get('/areas', async (req, res) => {
  try {
    console.log('🔍 Buscando áreas no banco de dados...');
    const areas = await global.database.getAreas();
    console.log('📋 Áreas encontradas:', areas.length);
    
    // Log detalhado de cada área
    areas.forEach((area, index) => {
      console.log(`Área ${index + 1}:`, {
        id: area.id,
        nome: area.nome,
        descricao: area.descricao,
        perguntas_tipo: typeof area.perguntas,
        perguntas_valor: area.perguntas ? area.perguntas.substring(0, 100) + '...' : 'null'
      });
    });
    
    res.json(areas);
  } catch (error) {
    console.error('❌ Erro ao buscar áreas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter URL da loja
router.get('/store-url', async (req, res) => {
  try {
    const storeUrl = process.env.STORE_URL || 'https://vip.altoastralrp.com/categories/339970';
    res.json({ url: storeUrl });
  } catch (error) {
    console.error('❌ Erro ao obter URL da loja:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter área específica com perguntas
router.get('/areas/:id', async (req, res) => {
  try {
    const area = await global.database.getAreaById(req.params.id);
    if (!area) {
      return res.status(404).json({ error: 'Área não encontrada' });
    }
    res.json(area);
  } catch (error) {
    console.error('Erro ao buscar área:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Testar conexão com Hydrus.gg
router.get('/test-hydrus', async (req, res) => {
  try {
    const hydrusService = new HydrusService();
    const connected = await hydrusService.testConnection();
    
    if (connected) {
      res.json({ 
        success: true, 
        message: 'Conexão com Hydrus.gg estabelecida com sucesso' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Erro na conexão com Hydrus.gg' 
      });
    }
  } catch (error) {
    console.error('Erro ao testar Hydrus.gg:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao testar conexão com Hydrus.gg',
      error: error.message 
    });
  }
});

// Cadastrar novo criador (agora com upload de arquivo)
router.post('/cadastro', upload.single('profile_image'), handleMulterError, async (req, res) => {
  try {
    console.log('=== INÍCIO DO CADASTRO ===');
    console.log('📁 Arquivo recebido:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    } : 'Nenhum arquivo');
    console.log('Body recebido:', {
      ...req.body,
      password: '[PROTEGIDO]',
      profile_image: req.file ? '[ARQUIVO]' : '[AUSENTE]'
    });
    
    const { nome, email, telefone, discord_id, game_id, password, areas_ids, respostas, cupom_desconto } = req.body;

    // Validações básicas
    if (!nome || !email || !discord_id || !game_id || !password || !areas_ids || !respostas) {
      console.log('❌ VALIDAÇÃO FALHOU - Campos obrigatórios:', {
        nome: !!nome,
        email: !!email,
        discord_id: !!discord_id,
        game_id: !!game_id,
        password: !!password,
        areas_ids: !!areas_ids,
        respostas: !!respostas
      });
      
      // Log de warning para validação falhada
      if (global.errorLogger) {
        global.errorLogger.logWarning('Validação de cadastro falhou - campos obrigatórios ausentes', {
          endpoint: 'POST /api/creators/cadastro',
          user: email || discord_id || 'Desconhecido',
          requestData: {
            nome: !!nome,
            email: !!email,
            discord_id: !!discord_id,
            game_id: !!game_id,
            password: !!password,
            areas_ids: !!areas_ids,
            respostas: !!respostas
          }
        });
      }
      
      return res.status(400).json({ 
        error: 'Nome, email, Discord ID, ID do jogo, senha, áreas e respostas são obrigatórios' 
      });
    }

    // Validar se a imagem foi fornecida
    if (!req.file) {
      console.log('❌ VALIDAÇÃO FALHOU - Imagem ausente');
      
      if (global.errorLogger) {
        global.errorLogger.logWarning('Validação de cadastro falhou - imagem ausente', {
          endpoint: 'POST /api/creators/cadastro',
          user: email || discord_id || 'Desconhecido'
        });
      }
      
      return res.status(400).json({ 
        error: 'Print do perfil é obrigatório' 
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ VALIDAÇÃO FALHOU - Email inválido:', email);
      
      if (global.errorLogger) {
        global.errorLogger.logWarning('Validação de cadastro falhou - email inválido', {
          endpoint: 'POST /api/creators/cadastro',
          user: email || discord_id || 'Desconhecido',
          requestData: { email }
        });
      }
      
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
      console.log('❌ VALIDAÇÃO FALHOU - Senha muito curta');
      
      if (global.errorLogger) {
        global.errorLogger.logWarning('Validação de cadastro falhou - senha muito curta', {
          endpoint: 'POST /api/creators/cadastro',
          user: email || discord_id || 'Desconhecido'
        });
      }
      
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    console.log('✅ Validações básicas passaram');

    // Verificar se os dados já existem
    console.log('🔍 Verificando dados duplicados...');
    
    const emailExists = await global.database.checkEmailExists(email);
    if (emailExists) {
      console.log('❌ Email já cadastrado:', email);
      
      if (global.errorLogger) {
        global.errorLogger.logWarning('Tentativa de cadastro com email já existente', {
          endpoint: 'POST /api/creators/cadastro',
          user: email || discord_id || 'Desconhecido',
          requestData: { email }
        });
      }
      
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    const discordExists = await global.database.checkDiscordIdExists(discord_id);
    if (discordExists) {
      console.log('❌ Discord ID já cadastrado:', discord_id);
      
      if (global.errorLogger) {
        global.errorLogger.logWarning('Tentativa de cadastro com Discord ID já existente', {
          endpoint: 'POST /api/creators/cadastro',
          user: email || discord_id || 'Desconhecido',
          requestData: { discord_id }
        });
      }
      
      return res.status(400).json({ error: 'Este Discord ID já está cadastrado' });
    }

    const gameIdExists = await global.database.checkGameIdExists(game_id);
    if (gameIdExists) {
      console.log('❌ Game ID já cadastrado:', game_id);
      
      if (global.errorLogger) {
        global.errorLogger.logWarning('Tentativa de cadastro com Game ID já existente', {
          endpoint: 'POST /api/creators/cadastro',
          user: email || discord_id || 'Desconhecido',
          requestData: { game_id }
        });
      }
      
      return res.status(400).json({ error: 'Este ID do jogo já está cadastrado' });
    }

    if (telefone) {
      const telefoneExists = await global.database.checkTelefoneExists(telefone);
      if (telefoneExists) {
        console.log('❌ Telefone já cadastrado:', telefone);
        
        if (global.errorLogger) {
          global.errorLogger.logWarning('Tentativa de cadastro com telefone já existente', {
            endpoint: 'POST /api/creators/cadastro',
            user: email || discord_id || 'Desconhecido',
            requestData: { telefone }
          });
        }
        
        return res.status(400).json({ error: 'Este telefone já está cadastrado' });
      }
    }

    console.log('✅ Dados únicos verificados');

    // Verificar se as áreas existem
    let areasIds;
    try {
      // Se areas_ids for string JSON, fazer parse
      if (typeof areas_ids === 'string') {
        areasIds = JSON.parse(areas_ids);
      } else if (Array.isArray(areas_ids)) {
        areasIds = areas_ids;
      } else {
        areasIds = [areas_ids];
      }
    } catch (parseError) {
      console.log('❌ Erro ao fazer parse das áreas:', areas_ids, parseError);
      return res.status(400).json({ error: 'Formato de áreas inválido' });
    }
    
    console.log('🔍 Verificando áreas:', areasIds);
    
    for (const areaId of areasIds) {
      const area = await global.database.getAreaById(areaId);
      if (!area) {
        console.log('❌ Área não encontrada:', areaId);
        
        if (global.errorLogger) {
          global.errorLogger.logWarning('Validação de cadastro falhou - área não encontrada', {
            endpoint: 'POST /api/creators/cadastro',
            user: email || discord_id || 'Desconhecido',
            requestData: { areaId }
          });
        }
        
        return res.status(400).json({ error: `Área ID ${areaId} inválida` });
      }
    }
    
    console.log('✅ Áreas validadas');

    // Enviar imagem para Discord
    console.log('📤 Enviando imagem para Discord...');
    let imageUrl = null;
    try {
      imageUrl = await discordWebhook.sendFile(req.file.buffer, req.file.originalname, `Avatar de cadastro - ${nome}`);
      console.log('🔗 URL retornada do Discord:', imageUrl);
      
      if (!imageUrl) {
        console.log('❌ Falha ao enviar imagem para Discord');
        return res.status(500).json({ error: 'Falha ao enviar imagem para Discord' });
      }
    } catch (error) {
      console.error('❌ Erro ao enviar imagem para Discord:', error);
      return res.status(500).json({ error: 'Erro ao processar imagem' });
    }

    // Criar criador no banco de dados (sem cupom por enquanto)
    console.log('👤 Criando criador no banco de dados...');
    const creatorId = await global.database.createCreator({
      nome,
      email,
      telefone,
      discord_id,
      game_id,
      password,
      areas_ids: areasIds,
      respostas,
      profile_image: imageUrl, // Agora salva o link do Discord
      cupom_desconto: null, // Cupom será criado posteriormente
      cupom_id: null
    });
    
    console.log('✅ Criador criado com sucesso, ID:', creatorId);

    console.log('=== CADASTRO CONCLUÍDO COM SUCESSO ===');
    
    // Log de sucesso
    if (global.errorLogger) {
      global.errorLogger.logSuccess('Novo criador cadastrado com sucesso', {
        endpoint: 'POST /api/creators/cadastro',
        user: email || discord_id || 'Desconhecido',
        requestData: { 
          nome,
          email,
          discord_id,
          game_id,
          areas_ids: areasIds,
          cupom_desconto,
          creatorId,
          imageUrl
        }
      });
    }
    
    res.status(201).json({
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação.',
      id: creatorId
    });
  } catch (error) {
    console.error('❌ ERRO NO CADASTRO:', error);
    console.error('Stack trace:', error.stack);
    
    // Log de erro para Discord
    if (global.errorLogger) {
      global.errorLogger.logError(error, {
        endpoint: 'POST /api/creators/cadastro',
        user: req.body?.email || req.body?.discord_id || 'Desconhecido',
        requestData: {
          ...req.body,
          password: '[PROTEGIDO]',
          profile_image: req.file ? '[ARQUIVO]' : '[AUSENTE]'
        }
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login do criador
router.post('/login', async (req, res) => {
  try {
    const { game_id, password } = req.body;

    if (!game_id || !password) {
      return res.status(400).json({ error: 'ID do jogo e senha são obrigatórios' });
    }

    // Autenticar criador por ID do jogo e senha
    const criador = await global.database.authenticateCreator(game_id, password);
    
    if (!criador) {
      return res.status(401).json({ error: 'ID do jogo ou senha incorretos' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: criador.id, 
        game_id: criador.game_id,
        nome: criador.nome 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      creator: {
        id: criador.id,
        nome: criador.nome,
        game_id: criador.game_id
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar cupom de desconto
router.post('/cupom', authenticateCreator, async (req, res) => {
  try {
    const { nome } = req.body;
    const creatorId = req.creator.id;

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome do cupom é obrigatório' });
    }

    // Validar formato do nome do cupom
    const cupomRegex = /^[A-Za-z0-9]+$/;
    if (!cupomRegex.test(nome)) {
      return res.status(400).json({ error: 'O nome do cupom deve conter apenas letras e números, sem espaços' });
    }

    // Verificar se o criador já tem um cupom
    const existingCreator = await global.database.getCreatorById(creatorId);
    if (existingCreator.cupom_desconto) {
      return res.status(400).json({ error: 'Você já possui um cupom de desconto' });
    }

    // Criar cupom na Hydrus.gg
    console.log('🛍️ Criando cupom na Hydrus.gg...');
    let couponResult;
    try {
      const hydrusService = new HydrusService();
      couponResult = await hydrusService.verifyAndCreateCoupon(nome, existingCreator.nome);
      console.log('Resultado da criação do cupom:', couponResult);
      
      if (!couponResult.success) {
        // Verificar se é erro de nome já existente
        if (couponResult.error && (
          couponResult.error.includes('já existe') || 
          couponResult.error.includes('already been taken') ||
          couponResult.error.includes('422')
        )) {
          return res.status(400).json({
            error: `Este nome de cupom já está sendo usado por outro criador. Escolha outro nome.`
          });
        }
        return res.status(400).json({ error: couponResult.error });
      }
      
      console.log('✅ Cupom criado com sucesso na Hydrus.gg');
    } catch (error) {
      console.error('❌ Erro ao criar cupom na Hydrus.gg:', error);
      
      if (global.errorLogger) {
        global.errorLogger.logError(error, {
          endpoint: 'POST /api/creators/cupom',
          user: existingCreator.email || existingCreator.discord_id || 'Desconhecido',
          requestData: { nome }
        });
      }
      
      return res.status(500).json({ error: 'Erro ao criar cupom na Hydrus.gg', details: error.message });
    }

    // Atualizar criador no banco de dados
    await global.database.updateCreatorCupom(creatorId, {
      cupom_desconto: nome,
      cupom_id: couponResult.coupon.id
    });

    console.log('✅ Cupom atualizado no banco de dados');

    // Log de sucesso
    if (global.errorLogger) {
      global.errorLogger.logSuccess('Cupom de desconto criado com sucesso', {
        endpoint: 'POST /api/creators/cupom',
        user: existingCreator.email || existingCreator.discord_id || 'Desconhecido',
        requestData: { nome, desconto: 10, uso_maximo: null, cupom_id: couponResult.coupon.id }
      });
    }

    res.json({
      message: 'Cupom criado com sucesso',
      cupom: {
        nome: nome,
        desconto: 10,
        uso_maximo: null,
        id: couponResult.coupon.id
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar cupom:', error);
    
    if (global.errorLogger) {
      global.errorLogger.logError(error, {
        endpoint: 'POST /api/creators/cupom',
        user: req.creator?.email || req.creator?.discord_id || 'Desconhecido',
        requestData: req.body
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token do criador
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    
    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar criador atualizado
    const criador = await global.database.getCreatorById(decoded.id);
    
    if (!criador) {
      return res.status(401).json({ error: 'Criador não encontrado' });
    }

    res.json({
      message: 'Token válido',
      creator: {
        id: criador.id,
        nome: criador.nome,
        discord_id: criador.discord_id
      }
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter perfil completo do criador
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    
    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar criador com todas as informações
    const criador = await global.database.getCreatorById(decoded.id);
    
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }

    // Buscar todas as áreas do criador
    const areasIds = criador.areas_ids ? JSON.parse(criador.areas_ids) : [];
    const areas = [];
    
    for (const areaId of areasIds) {
      const area = await global.database.getAreaById(areaId);
      if (area) {
        areas.push(area);
      }
    }
    
    // Buscar respostas
    const respostas = await global.database.getCreatorResponses(criador.id);
    
    // Buscar apenas conteúdos aprovados
    const conteudosAprovados = await global.database.getConteudosAprovadosByCriador(criador.id);

    // Calcular XP necessário
    const xp_necessario = Math.max(areas.length, 1) * 1000;
    // Removida obrigação dos 30 dias - sempre pode upar quando atingir o XP
    const dias_restantes = 0;

    res.json({
      id: criador.id,
      nome: criador.nome,
      email: criador.email,
      telefone: criador.telefone,
      discord_id: criador.discord_id,
      game_id: criador.game_id,
      areas_ids: areasIds,
      areas: areas,
      area_nome: areas.length > 0 ? areas.map(area => area.nome).join(', ') : 'Nenhuma área selecionada',
      status: criador.status,
      contratado: criador.contratado || 0,
      observacoes: criador.observacoes,
      profile_image: criador.profile_image,
      cupom_desconto: criador.cupom_desconto,
      created_at: criador.created_at,
      indicados: criador.indicados || 0,
      nivel: criador.nivel || 1,
      horas_live: criador.horas_live || 0,
      bonus_acumulado: criador.bonus_acumulado || 0,
      dias_restantes,
      ultimo_up_nivel: criador.ultimo_up_nivel,
      respostas: respostas,
      conteudos: conteudosAprovados
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo conteúdo (agora aceita upload de arquivos)
router.post('/conteudo', upload.fields([
  { name: 'print_foto', maxCount: 1 },
  { name: 'print_video', maxCount: 1 }
]), handleMulterError, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const { tipo, tempo_live, observacoes, visualizacoes, likes, link_video, link_foto } = req.body;
    
    // Logs de debug
    console.log('📝 Dados recebidos:', {
      tipo,
      tempo_live,
      observacoes
    });
    console.log('📝 Tipo de tempo_live:', typeof tempo_live);
    console.log('📝 Valor de tempo_live:', tempo_live);
    
    // Log dos arquivos recebidos
    console.log('📁 Arquivos recebidos:', req.files ? {
      print_foto: req.files['print_foto'] ? {
        count: req.files['print_foto'].length,
        files: req.files['print_foto'].map(f => ({
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size
        }))
      } : 'Nenhum arquivo',
      print_video: req.files['print_video'] ? {
        count: req.files['print_video'].length,
        files: req.files['print_video'].map(f => ({
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size
        }))
      } : 'Nenhum arquivo'
    } : 'Nenhum arquivo');
    

    
    // Validações básicas
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo é obrigatório' });
    }
    
    const tiposValidos = ['video', 'fotos', 'live'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }
    
    // Validações específicas para vídeo
    if (tipo === 'video') {
      if (!visualizacoes || visualizacoes === '' || visualizacoes === '0' || visualizacoes === 0) {
        return res.status(400).json({ error: 'Visualizações é obrigatório para vídeo' });
      }
      
      if (!likes || likes === '' || likes === '0' || likes === 0) {
        return res.status(400).json({ error: 'Likes é obrigatório para vídeo' });
      }
    }
    

    
    // Validação melhorada para tempo_live
    if (tipo === 'live') {
      console.log('🎥 Validando tempo da live...');
      console.log('🎥 tempo_live original:', tempo_live);
      
      // Verificar se tempo_live existe e tem valor
      if (!tempo_live || tempo_live === '' || tempo_live === '0' || tempo_live === 0) {
        console.log('❌ Tempo da live inválido:', tempo_live);
        return res.status(400).json({ error: 'Tempo da live é obrigatório para live' });
      }
      
      // Tentar converter para número
      const tempoLiveValue = parseFloat(tempo_live);
      if (isNaN(tempoLiveValue) || tempoLiveValue <= 0) {
        console.log('❌ Tempo da live não é um número válido:', tempo_live);
        return res.status(400).json({ error: 'Tempo da live deve ser um número maior que zero' });
      }
      
      console.log('✅ Tempo da live válido:', tempoLiveValue);
    }
    // Validar prints obrigatórios
    let printFotoUrl = null;
    let printVideoUrl = null;
    
    console.log('🔍 === INÍCIO DA VALIDAÇÃO DE PRINTS ===');
    console.log('🔍 Tipo de conteúdo:', tipo);
    console.log('🔍 req.files existe?', !!req.files);
    console.log('🔍 req.files keys:', req.files ? Object.keys(req.files) : 'N/A');
    
    console.log('🔍 Verificando arquivos para tipo:', tipo);
    
    if (tipo === 'video' && req.files['print_video']) {
      console.log('📹 === PROCESSANDO VÍDEO ===');
      console.log('📹 req.files[print_video] existe:', !!req.files['print_video']);
      console.log('📹 Quantidade de arquivos:', req.files['print_video'].length);
      
      const file = req.files['print_video'][0];
      console.log('📹 Arquivo de vídeo:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferExists: !!file.buffer,
        bufferLength: file.buffer ? file.buffer.length : 0
      });
      console.log('📹 Chamando discordWebhook.sendFile...');
      
      try {
        printVideoUrl = await discordWebhook.sendFile(file.buffer, file.originalname, `Print vídeo de ${decoded.id}`);
        console.log('📹 Resultado do sendFile:', printVideoUrl);
        console.log('📹 Tipo do resultado:', typeof printVideoUrl);
        console.log('📹 Resultado é null?', printVideoUrl === null);
        console.log('📹 Resultado é undefined?', printVideoUrl === undefined);
        
        if (!printVideoUrl) {
          console.log('❌ sendFile retornou null/undefined');
          return res.status(500).json({ error: 'Falha ao enviar print do vídeo para Discord' });
        }
        console.log('✅ URL do print de vídeo salva:', printVideoUrl);
      } catch (error) {
        console.log('❌ Erro no sendFile:', error.message);
        return res.status(500).json({ error: 'Erro ao enviar print do vídeo para Discord' });
      }
    } else if (tipo === 'video') {
      console.log('❌ Tipo é vídeo mas não há arquivo print_video');
      console.log('❌ req.files existe?', !!req.files);
      console.log('❌ req.files[print_video] existe?', req.files ? !!req.files['print_video'] : 'N/A');
    }
    
    if (tipo === 'fotos' && req.files['print_foto']) {
      console.log('📸 === PROCESSANDO FOTOS ===');
      console.log('📸 req.files[print_foto] existe:', !!req.files['print_foto']);
      console.log('📸 Quantidade de arquivos:', req.files['print_foto'].length);
      
      const file = req.files['print_foto'][0];
      console.log('📸 Arquivo de foto:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferExists: !!file.buffer,
        bufferLength: file.buffer ? file.buffer.length : 0
      });
      console.log('📸 Chamando discordWebhook.sendFile...');
      
      try {
        printFotoUrl = await discordWebhook.sendFile(file.buffer, file.originalname, `Print foto de ${decoded.id}`);
        console.log('📸 Resultado do sendFile:', printFotoUrl);
        console.log('📸 Tipo do resultado:', typeof printFotoUrl);
        console.log('📸 Resultado é null?', printFotoUrl === null);
        console.log('📸 Resultado é undefined?', printFotoUrl === undefined);
        
        if (!printFotoUrl) {
          console.log('❌ sendFile retornou null/undefined');
          return res.status(500).json({ error: 'Falha ao enviar print da foto para Discord' });
        }
        console.log('✅ URL do print de foto salva:', printFotoUrl);
      } catch (error) {
        console.log('❌ Erro no sendFile:', error.message);
        return res.status(500).json({ error: 'Erro ao enviar print da foto para Discord' });
      }
    } else if (tipo === 'fotos') {
      console.log('❌ Tipo é fotos mas não há arquivo print_foto');
      console.log('❌ req.files existe?', !!req.files);
      console.log('❌ req.files[print_foto] existe?', req.files ? !!req.files['print_foto'] : 'N/A');
    }
    
    if (tipo === 'live' && req.files['print_video']) {
      console.log('🎥 === PROCESSANDO LIVE ===');
      console.log('🎥 req.files[print_video] existe:', !!req.files['print_video']);
      console.log('🎥 Quantidade de arquivos:', req.files['print_video'].length);
      
      const file = req.files['print_video'][0];
      console.log('🎥 Arquivo de live:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferExists: !!file.buffer,
        bufferLength: file.buffer ? file.buffer.length : 0
      });
      console.log('🎥 Chamando discordWebhook.sendFile...');
      
      try {
        printVideoUrl = await discordWebhook.sendFile(file.buffer, file.originalname, `Print vídeo (live) de ${decoded.id}`);
        console.log('🎥 Resultado do sendFile:', printVideoUrl);
        console.log('🎥 Tipo do resultado:', typeof printVideoUrl);
        console.log('🎥 Resultado é null?', printVideoUrl === null);
        console.log('🎥 Resultado é undefined?', printVideoUrl === undefined);
        
        if (!printVideoUrl) {
          console.log('❌ sendFile retornou null/undefined');
          return res.status(500).json({ error: 'Falha ao enviar print do vídeo (live) para Discord' });
        }
        console.log('✅ URL do print de live salva:', printVideoUrl);
      } catch (error) {
        console.log('❌ Erro no sendFile:', error.message);
        return res.status(500).json({ error: 'Erro ao enviar print do vídeo (live) para Discord' });
      }
    } else if (tipo === 'live') {
      console.log('❌ Tipo é live mas não há arquivo print_video');
      console.log('❌ req.files existe?', !!req.files);
      console.log('❌ req.files[print_video] existe?', req.files ? !!req.files['print_video'] : 'N/A');
    }
    
    console.log('🔍 === FIM DA VALIDAÇÃO DE PRINTS ===');
    console.log('🔍 printFotoUrl final:', printFotoUrl);
    console.log('🔍 printVideoUrl final:', printVideoUrl);
    // Buscar criador e áreas (mantém as validações existentes)
    const criador = await global.database.getCreatorById(decoded.id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }
    
    console.log('👤 Criador encontrado:', {
      id: criador.id,
      nome: criador.nome,
      areas_ids: criador.areas_ids
    });
    
    const areasIds = criador.areas_ids ? JSON.parse(criador.areas_ids) : [];
    console.log('📋 IDs das áreas do criador:', areasIds);
    
    const areas = [];
    for (const areaId of areasIds) {
      const area = await global.database.getAreaById(areaId);
      if (area) {
        areas.push(area);
        console.log('✅ Área encontrada:', { id: area.id, nome: area.nome });
      } else {
        console.log('❌ Área não encontrada:', areaId);
      }
    }
    
    console.log('📋 Todas as áreas do criador:', areas.map(a => ({ id: a.id, nome: a.nome })));
    
    const tiposPermitidos = [];
    areas.forEach(area => {
      const nome = area.nome.toLowerCase();
      console.log('🔍 Verificando área:', nome);
      
      // Remover acentos para comparação
      const nomeSemAcentos = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      console.log('🔍 Nome sem acentos:', nomeSemAcentos);
      
      if (nomeSemAcentos.includes('foto')) {
        tiposPermitidos.push('fotos');
        console.log('✅ Adicionado tipo: fotos');
      }
      if (nomeSemAcentos.includes('video')) {
        tiposPermitidos.push('video');
        console.log('✅ Adicionado tipo: video');
      }
      if (nomeSemAcentos.includes('live')) {
        tiposPermitidos.push('live');
        console.log('✅ Adicionado tipo: live');
      }
    });
    
    console.log('🎯 Tipos permitidos para o criador:', tiposPermitidos);
    console.log('🎯 Tipo solicitado:', tipo);
    console.log('🎯 Tipo está permitido?', tiposPermitidos.includes(tipo));
    
    if (!tiposPermitidos.includes(tipo)) {
      console.log('❌ VALIDAÇÃO FALHOU - Tipo não permitido');
      console.log('❌ Tipos permitidos:', tiposPermitidos);
      console.log('❌ Tipo solicitado:', tipo);
      console.log('❌ Áreas do criador:', areas.map(a => a.nome));
      
      return res.status(403).json({ error: 'Você não pode cadastrar conteúdo para esta categoria.' });
    }
    // Preparar dados para o banco
    console.log('💾 === PREPARANDO DADOS PARA O BANCO ===');
    console.log('💾 Valores antes da preparação:');
    console.log('  - print_video:', printVideoUrl);
    console.log('  - print_foto:', printFotoUrl);
    console.log('  - tipo:', tipo);
    console.log('  - tempo_live:', tempo_live);
    
    const conteudoData = {
      criador_id: decoded.id,
      tipo,
      visualizacoes: tipo === 'video' ? parseInt(visualizacoes) : 0,
      likes: tipo === 'video' ? parseInt(likes) : 0,
      comentarios: 0, // Valor padrão
      tempo_live: tipo === 'live' ? parseFloat(tempo_live) : null,
      print_video: printVideoUrl || null,
      print_foto: printFotoUrl || null,
      observacoes: observacoes || null,
      link_video: tipo === 'video' ? link_video : null,
      link_foto: tipo === 'fotos' ? link_foto : null
    };
    
    console.log('💾 Dados finais para salvar no banco:', conteudoData);
    console.log('💾 print_video no objeto:', conteudoData.print_video);
    console.log('💾 print_foto no objeto:', conteudoData.print_foto);
    console.log('💾 print_video é null?', conteudoData.print_video === null);
    console.log('💾 print_foto é null?', conteudoData.print_foto === null);
    
    // Criar o conteúdo
    console.log('💾 Chamando database.createConteudo...');
    const conteudoId = await global.database.createConteudo(conteudoData);
    console.log('💾 Conteúdo criado com ID:', conteudoId);
    res.status(201).json({
      message: 'Conteúdo registrado com sucesso! Aguarde a aprovação.',
      id: conteudoId
    });
  } catch (error) {
    console.error('Erro ao registrar conteúdo:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conteúdos do criador
router.get('/conteudos', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const conteudos = await global.database.getConteudosByCriador(decoded.id);
    
    res.json(conteudos);
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas do criador
router.get('/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      console.error('❌ Erro na verificação do JWT na rota /stats:', jwtError.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    
    // Buscar criador para obter indicados e bônus
    const criador = await global.database.getCreatorById(decoded.id);
    
    // Verificar se o criador existe
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }

    // Buscar áreas
    let areasIds = [];
    try {
        if (criador.areas_ids) {
            areasIds = JSON.parse(criador.areas_ids);
            if (!Array.isArray(areasIds)) {
                areasIds = [];
            }
        }
    } catch (error) {
        console.error('❌ API - Erro ao fazer parse das áreas:', error);
        areasIds = [];
    }
    
    const areas = [];
    for (const areaId of areasIds) {
      const area = await global.database.getAreaById(areaId);
      if (area) areas.push(area);
    }
    // Buscar estatísticas de conteúdos
    const aprovados = await global.database.getConteudosAprovadosByCriador(decoded.id);
    const pendentes = await global.database.getConteudosPendentesByCriador(decoded.id);
    const todosConteudos = await global.database.getConteudosByCriador(decoded.id);
    
    // Calcular valor ganho com conteúdo monetizado (apenas para criadores contratados)
    let valorGanhoConteudo = 0;
    if (criador.contratado === 1 || criador.contratado === true) {
      valorGanhoConteudo = await global.database.getValorGanhoConteudoMonetizado(decoded.id);
    }
    // Buscar dados do cupom na Hydrus.gg
    let cupomData = {
      valor_vendido: 0,
      nome_cupom: criador.cupom_desconto || 'N/A'
    };
    if (criador.cupom_id) {
      try {
        const hydrusService = new HydrusService();
        const cupom = await hydrusService.getCouponById(criador.cupom_id);
        if (cupom) {
          cupomData = {
            valor_vendido: parseFloat(cupom.orders_sum_total || 0),
            nome_cupom: cupom.name || criador.cupom_desconto || 'N/A',
            id_cupom: cupom.id
          };
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar dados do cupom na Hydrus:', error.message);
        
        // Se o cupom não existe mais na API, limpar o cupom_id
        if (error.message.includes('404')) {
          console.log(`🗑️ Cupom ${criador.cupom_id} não existe mais na API, limpando cupom_id`);
          await global.database.pool.execute(
            'UPDATE criadores SET cupom_id = NULL WHERE id = ?',
            [decoded.id]
          );
          cupomData = {
            valor_vendido: 0,
            nome_cupom: criador.cupom_desconto || 'N/A'
          };
        }
      }
    }
    // Calcular XP necessário
    const xp_necessario = Math.max(areas.length, 1) * 1000;
    // Removida obrigação dos 30 dias - sempre pode upar quando atingir o XP
    const dias_restantes = 0;
    const stats = {
      aprovados: aprovados.length,
      pendentes: pendentes.length,
      nivel: parseInt(criador.nivel || 1),
      bonus: parseFloat(criador.bonus_acumulado || 0),
      horas_live: parseFloat(criador.horas_live || 0),
      fotos_aprovadas: parseInt(criador.fotos_aprovadas || 0),
      videos_aprovados: parseInt(criador.videos_aprovados || 0),
      visualizacoes: parseInt(criador.visualizacoes || 0),
      dias_restantes,
      ultimo_up_nivel: criador.ultimo_up_nivel,
      indicados: parseInt(criador.indicados || 0),
      cupom: cupomData,
      todosConteudos: todosConteudos,
      areas: areas,
      areas_ids: areasIds, // Adicionar areas_ids na resposta
      valor_ganho_conteudo: valorGanhoConteudo,
      // Metas personalizadas do criador
      meta_horas_live: parseFloat(criador.meta_horas_live || 0),
      meta_fotos: parseFloat(criador.meta_fotos || 0),
      meta_videos: parseFloat(criador.meta_videos || 0)
    };
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Solicitar saque
router.post('/saque', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar criador
    const criador = await global.database.getCreatorById(decoded.id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }
    
    // Verificar se é contratado
    if (!criador.contratado) {
      return res.status(403).json({ error: 'Apenas criadores contratados podem solicitar saque' });
    }
    
    // Verificar se bateu todas as metas das áreas que o criador tem
    const areasIds = criador.areas_ids ? JSON.parse(criador.areas_ids) : [];
    
    // Se não tem áreas definidas, não pode fazer saque
    if (areasIds.length === 0) {
      return res.status(403).json({ error: 'Você precisa ter áreas definidas para solicitar um saque' });
    }
    
    const areas = [];
    for (const areaId of areasIds) {
      const area = await global.database.getAreaById(areaId);
      if (area) areas.push(area);
    }
    
    const metaHorasLive = parseFloat(criador.meta_horas_live || 0);
    const metaFotos = parseFloat(criador.meta_fotos || 0);
    const metaVideos = parseFloat(criador.meta_videos || 0);
    
    const horasLive = parseFloat(criador.horas_live || 0);
    const fotosAprovadas = parseInt(criador.fotos_aprovadas || 0);
    const videosAprovados = parseInt(criador.videos_aprovados || 0);
    
    // Verificar apenas as metas das áreas que o criador tem
    let metasCompletas = true;
    const metasFaltando = {};
    
    // Verificar meta de horas live (se tem área LIVE - ID 3)
    if (areasIds.includes(3)) {
      const horasCompletas = metaHorasLive > 0 ? horasLive >= metaHorasLive : true;
      if (!horasCompletas) {
        metasCompletas = false;
        metasFaltando.horas_live = Math.max(0, metaHorasLive - horasLive);
      }
    }
    
    // Verificar meta de fotos (se tem área FOTOS - ID 1)
    if (areasIds.includes(1)) {
      const fotosCompletas = metaFotos > 0 ? fotosAprovadas >= metaFotos : true;
      if (!fotosCompletas) {
        metasCompletas = false;
        metasFaltando.fotos = Math.max(0, metaFotos - fotosAprovadas);
      }
    }
    
    // Verificar meta de vídeos (se tem área VIDEO - ID 2)
    if (areasIds.includes(2)) {
      const videosCompletos = metaVideos > 0 ? videosAprovados >= metaVideos : true;
      if (!videosCompletos) {
        metasCompletas = false;
        metasFaltando.videos = Math.max(0, metaVideos - videosAprovados);
      }
    }
    
    if (!metasCompletas) {
      return res.status(403).json({ 
        error: 'Você precisa bater todas as metas das suas áreas antes de solicitar um saque',
        metas_faltando: metasFaltando
      });
    }
    
    // Calcular valor disponível para saque
    const valorGanhoConteudo = await global.database.getValorGanhoConteudoMonetizado(decoded.id);
    
    if (valorGanhoConteudo <= 0) {
      return res.status(400).json({ error: 'Não há valor disponível para saque' });
    }
    
    // Validar dados do formulário
    const { tipo_chave, chave_pix, nome_beneficiario } = req.body;
    
    if (!tipo_chave || !chave_pix || !nome_beneficiario) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    // Validar tipo de chave
    const tiposValidos = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];
    if (!tiposValidos.includes(tipo_chave)) {
      return res.status(400).json({ error: 'Tipo de chave PIX inválido' });
    }
    
    // Criar solicitação de saque
    const saqueData = {
      criador_id: decoded.id,
      valor_solicitado: valorGanhoConteudo,
      tipo_chave: tipo_chave,
      chave_pix: chave_pix,
      nome_beneficiario: nome_beneficiario,
      status: 'pendente',
      data_solicitacao: new Date()
    };
    
    // Buscar valor das vendas do cupom da API da Hydrus
    let valorVendasCupom = 0;
    let cupomIdSaque = criador.cupom_id;
    
    console.log(`🔍 DEBUG: Criador cupom_id = ${criador.cupom_id}`);
    console.log(`🔍 DEBUG: Criador cupom_desconto = ${criador.cupom_desconto}`);
    console.log(`🔍 DEBUG: Criador nome = ${criador.nome}`);
    
    if (criador.cupom_id) {
      try {
        console.log(`🔍 DEBUG: Buscando cupom ${criador.cupom_id} na API Hydrus...`);
        const cupom = await global.hydrusService.getCouponById(criador.cupom_id);
        console.log(`🔍 DEBUG: Resposta da API Hydrus:`, cupom);
        
        if (cupom && cupom.orders_sum_total) {
          valorVendasCupom = parseFloat(cupom.orders_sum_total);
          console.log(`🔍 DEBUG: Valor vendas cupom = ${valorVendasCupom}`);
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar vendas do cupom ${criador.cupom_id}:`, error.message);
        
        // Se o cupom não existe mais na API, limpar o cupom_id
        if (error.message.includes('404')) {
          console.log(`🗑️ Cupom ${criador.cupom_id} não existe mais na API, limpando cupom_id`);
          await global.database.pool.execute(
            'UPDATE criadores SET cupom_id = NULL WHERE id = ?',
            [decoded.id]
          );
          cupomIdSaque = null;
        }
        
        valorVendasCupom = 0;
      }
    } else {
      console.log(`🔍 DEBUG: Criador não tem cupom_id`);
    }

    // Adicionar informações do criador ao saqueData
    saqueData.horas_live_saque = criador.horas_live || 0;
    saqueData.indicados_saque = criador.indicados || 0;
    saqueData.fotos_aprovadas_saque = criador.fotos_aprovadas || 0;
    saqueData.videos_aprovados_saque = criador.videos_aprovados || 0;
    saqueData.visualizacoes_saque = criador.visualizacoes || 0;
    saqueData.valor_vendas_cupom_saque = valorVendasCupom;
    saqueData.cupom_id_saque = cupomIdSaque;

    console.log(`🔍 DEBUG: saqueData antes de criar:`, saqueData);

    const saqueId = await global.database.createSaque(saqueData);
    
    if (saqueId) {
      // Zerar os progressos do criador
      await global.database.pool.execute(
        `UPDATE criadores SET 
          horas_live = 0,
          fotos_aprovadas = 0,
          videos_aprovados = 0,
          indicados = 0,
          visualizacoes = 0
        WHERE id = ?`,
        [decoded.id]
      );

      // Aumentar 1 nível para criadores contratados
      if (criador.contratado) {
        try {
          const novoNivel = parseInt(criador.nivel || 1) + 1;
          await global.database.pool.execute(
            'UPDATE criadores SET nivel = ? WHERE id = ?',
            [novoNivel, decoded.id]
          );
          console.log(`✅ Nível aumentado para ${novoNivel} após saque do criador contratado ${criador.nome}`);
        } catch (error) {
          console.error('❌ Erro ao aumentar nível:', error);
        }
      }

      // Recriar o cupom (mesmo processo de quando o criador é contratado)
      console.log(`🔍 DEBUG: Iniciando recriação do cupom. cupomIdSaque = ${cupomIdSaque}`);
      
      if (cupomIdSaque) {
        try {
          // Buscar informações do cupom antes de deletar
          let nomeCupom = criador.cupom_desconto;
          console.log(`🔍 DEBUG: Nome inicial do cupom = ${nomeCupom}`);
          
          try {
            console.log(`🔍 DEBUG: Buscando informações do cupom ${cupomIdSaque} antes de deletar...`);
            const cupomInfo = await global.hydrusService.getCouponById(cupomIdSaque);
            console.log(`🔍 DEBUG: Informações do cupom recuperadas:`, cupomInfo);
            
            if (cupomInfo && cupomInfo.name) {
              nomeCupom = cupomInfo.name;
              console.log(`📋 Nome do cupom recuperado: ${nomeCupom}`);
            } else {
              console.log(`🔍 DEBUG: Cupom não tem nome, usando fallback`);
            }
          } catch (error) {
            console.warn(`⚠️ Não foi possível buscar informações do cupom ${cupomIdSaque}:`, error.message);
            nomeCupom = criador.cupom_desconto || `CUPOM_${criador.nome.replace(/\s+/g, '_')}_${Date.now()}`;
            console.log(`🔍 DEBUG: Usando nome fallback: ${nomeCupom}`);
          }
          
          console.log(`🔍 DEBUG: Nome final do cupom para recriar: ${nomeCupom}`);
          
          // Deletar cupom antigo da Hydrus
          console.log(`🔍 DEBUG: Deletando cupom ${cupomIdSaque}...`);
          await global.hydrusService.deleteCoupon(cupomIdSaque);
          console.log(`🗑️ Cupom ${cupomIdSaque} deletado da Hydrus`);
          
          // Aguardar 2 segundos antes de criar o novo
          console.log(`🔍 DEBUG: Aguardando 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Criar novo cupom com o mesmo nome
          console.log(`🔍 DEBUG: Criando novo cupom com nome: ${nomeCupom}`);
          console.log(`🔍 DEBUG: Tipo do nome: ${typeof nomeCupom}`);
          
          // Garantir que o nome seja uma string
          const nomeCupomString = String(nomeCupom);
          console.log(`🔍 DEBUG: Nome convertido para string: ${nomeCupomString}`);
          
          const novoCupom = await global.hydrusService.createCoupon(nomeCupomString, criador.nome);
          
          console.log(`🔍 DEBUG: Resposta da criação do cupom:`, novoCupom);
          
          if (novoCupom && novoCupom.id) {
            // Atualizar cupom_id e cupom_desconto no banco
            console.log(`🔍 DEBUG: Atualizando banco com cupom_id = ${novoCupom.id} e nome = ${nomeCupom}`);
            await global.database.pool.execute(
              'UPDATE criadores SET cupom_id = ?, cupom_desconto = ? WHERE id = ?',
              [novoCupom.id, nomeCupom, decoded.id]
            );
            console.log(`✅ Novo cupom ${novoCupom.id} criado para criador ${decoded.id}`);
          } else {
            console.log(`🔍 DEBUG: Novo cupom não foi criado corretamente`);
          }
        } catch (error) {
          console.error('❌ Erro ao recriar cupom:', error);
          // Não falhar o processo se o cupom não puder ser recriado
        }
              } else {
          // Se não tinha cupom válido, criar um novo
          console.log(`🔍 DEBUG: Criando cupom novo (sem cupom anterior)`);
          try {
            const nomeCupom = criador.cupom_desconto || `CUPOM_${criador.nome.replace(/\s+/g, '_')}_${Date.now()}`;
            console.log(`🔍 DEBUG: Nome do novo cupom: ${nomeCupom}`);
            console.log(`🔍 DEBUG: Tipo do nome: ${typeof nomeCupom}`);
            
            // Garantir que o nome seja uma string
            const nomeCupomString = String(nomeCupom);
            console.log(`🔍 DEBUG: Nome convertido para string: ${nomeCupomString}`);
            
            const novoCupom = await global.hydrusService.createCoupon(nomeCupomString, criador.nome);
          
          if (novoCupom && novoCupom.id) {
            // Atualizar cupom_id e cupom_desconto no banco
            await global.database.pool.execute(
              'UPDATE criadores SET cupom_id = ?, cupom_desconto = ? WHERE id = ?',
              [novoCupom.id, nomeCupom, decoded.id]
            );
            console.log(`✅ Novo cupom ${novoCupom.id} criado para criador ${decoded.id} (sem cupom anterior)`);
          }
        } catch (error) {
          console.error('❌ Erro ao criar novo cupom:', error);
          // Não falhar o processo se o cupom não puder ser criado
        }
      }
      
      console.log(`✅ Saque solicitado com sucesso para criador ${criador.nome}: R$ ${valorGanhoConteudo.toFixed(2)}`);
      console.log(`🔍 DEBUG: saqueId retornado: ${saqueId}`);
      
      res.json({
        success: true,
        message: 'Saque solicitado com sucesso',
        saque_id: saqueId,
        valor_solicitado: `R$ ${valorGanhoConteudo.toFixed(2).replace('.', ',')}`,
        chave_pix: chave_pix,
        nome_beneficiario: nome_beneficiario,
        prazo_estimado: '10 dias úteis'
      });
    } else {
      res.status(500).json({ error: 'Erro ao processar solicitação de saque' });
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar saque:', error);
    console.error('🔍 DEBUG: Stack trace completo:', error.stack);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar avatar do criador (agora aceita upload de arquivo)
router.post('/update-avatar', upload.single('profile_image'), async (req, res) => {
  try {
    console.log('🔄 Iniciando upload de avatar...');
    console.log('📁 Arquivo recebido:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    } : 'Nenhum arquivo');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('👤 Criador autenticado:', decoded.id);
    
    let imageUrl = null;
    if (req.file) {
      console.log('📤 Enviando arquivo para Discord...');
      // Enviar para Discord
      imageUrl = await discordWebhook.sendFile(req.file.buffer, req.file.originalname, `Avatar de ${decoded.id}`);
      console.log('🔗 URL retornada do Discord:', imageUrl);
      
      if (!imageUrl) {
        console.log('❌ Falha ao enviar imagem para Discord');
        return res.status(500).json({ error: 'Falha ao enviar imagem para Discord' });
      }
    } else {
      console.log('❌ Nenhum arquivo recebido');
      return res.status(400).json({ error: 'Imagem do perfil é obrigatória' });
    }
    
    console.log('💾 Atualizando avatar no banco de dados...');
    // Atualizar avatar no banco
    await global.database.updateCreatorAvatar(decoded.id, imageUrl);
    
    console.log('✅ Avatar atualizado com sucesso');
    res.json({
      message: 'Avatar atualizado com sucesso',
      profile_image: imageUrl
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar avatar:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ativar live e conceder cargo no Discord
router.post('/activate-live', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se o criador é da categoria live
    const criador = await global.database.getCreatorWithArea(decoded.id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }
    
    // Verificar se o criador tem a área "live"
    const temAreaLive = criador.areas && criador.areas.some(area => 
      area.nome.toLowerCase().includes('live')
    );
    
    if (!temAreaLive) {
      return res.status(403).json({ error: 'Apenas criadores da categoria live podem ativar lives' });
    }
    
    // Verificar se o bot do Discord está disponível
    if (!global.discordBot) {
      return res.status(503).json({ error: 'Bot do Discord não está disponível' });
    }
    
    try {
      // Conceder cargo no Discord
      const result = await global.discordBot.addLiveRole(criador.discord_id);
      
      console.log(`🎥 Live ativada para criador ${criador.nome} (Discord ID: ${criador.discord_id})`);
      console.log(`🎭 Cargo ${process.env.DISCORD_LIVE_ROLE_ID} concedido por 1 hora`);
      
      res.json({
        message: 'Live ativada com sucesso',
        discord_id: criador.discord_id,
        role_id: process.env.DISCORD_LIVE_ROLE_ID,
        duration: '1 hora',
        endTime: result.endTime
      });
      
    } catch (discordError) {
      console.error('❌ Erro ao conceder cargo no Discord:', discordError);
      res.status(500).json({ 
        error: 'Erro ao conceder cargo no Discord',
        details: discordError.message 
      });
    }
  } catch (error) {
    console.error('Erro ao ativar live:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar status da live
router.get('/live-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se o bot do Discord está disponível
    if (!global.discordBot) {
      return res.status(503).json({ error: 'Bot do Discord não está disponível' });
    }
    
    // Buscar criador
    const criador = await global.database.getCreatorById(decoded.id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }
    
    // Verificar status da live
    const liveStatus = await global.discordBot.getLiveStatus(criador.discord_id);
    
    res.json({
      active: liveStatus.active,
      timeRemaining: liveStatus.timeRemaining,
      endTime: liveStatus.endTime
    });
    
  } catch (error) {
    console.error('Erro ao verificar status da live:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar códigos de WL
router.post('/generate-wl-codes', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: 'Quantidade deve ser entre 1 e 50' });
    }

    // Gerar códigos
    const codes = await global.database.generateWLCodes(decoded.id, quantity);

    res.json({
      message: 'Códigos gerados com sucesso',
      codes: codes,
      quantity: quantity
    });
    
  } catch (error) {
    console.error('Erro ao gerar códigos WL:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para solicitar recuperação de senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { discord_id, game_id } = req.body;

    let criador = null;

    // Buscar criador por Discord ID ou Game ID
    if (discord_id) {
      criador = await global.database.getCreatorByDiscordId(discord_id);
    } else if (game_id) {
      criador = await global.database.getCreatorByGameId(game_id);
    } else {
      return res.status(400).json({ error: 'Discord ID ou ID da Cidade é obrigatório' });
    }

    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }

    // Verificar se o criador tem Discord ID
    if (!criador.discord_id) {
      return res.status(400).json({ 
        error: 'Este criador não possui Discord vinculado. Entre em contato com a equipe através do Discord da cidade.' 
      });
    }

    // Criar token de recuperação
    const token = await global.database.createPasswordResetToken(criador.id);
    
    // URL para resetar senha
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${token}`;

    // Enviar mensagem no Discord
    if (global.discordBot && global.discordBot.client) {
      try {
        const embed = {
          color: 0x0099FF, // Azul
          title: '🔐 Recuperação de Senha - Bot Criador',
          description: `Olá **${criador.nome}**! Você solicitou a recuperação de senha da sua conta.`,
          fields: [
            {
              name: '👤 Seus Dados',
              value: `**Nome:** ${criador.nome}\n**ID Game:** ${criador.game_id || 'N/A'}\n**Email:** ${criador.email}`,
              inline: false
            },
            {
              name: '🔗 Link para Resetar Senha',
              value: `[Clique aqui para resetar sua senha](${resetUrl})\n\n⚠️ **Este link expira em 1 hora!**`,
              inline: false
            },
            {
              name: '⚠️ Importante',
              value: '• Não compartilhe este link com ninguém\n• Se você não solicitou esta recuperação, ignore esta mensagem\n• O link só pode ser usado uma vez',
              inline: false
            }
          ],
          footer: {
            text: 'Bot Criador - Sistema de Recuperação de Senha'
          },
          timestamp: new Date()
        };

        await global.discordBot.sendDirectEmbed(criador.discord_id, embed);
        
        res.json({ 
          message: 'Link de recuperação enviado para seu Discord! Verifique suas mensagens privadas.',
          discordSent: true
        });
        
      } catch (discordError) {
        console.error('❌ Erro ao enviar mensagem no Discord:', discordError);
        
        // Se falhar no Discord, retornar erro com instruções
        res.status(500).json({ 
          error: 'Não foi possível enviar a mensagem no Discord. Entre em contato com a equipe através do Discord da cidade.',
          discordError: true
        });
      }
    } else {
      // Se o bot do Discord não estiver disponível
      res.status(500).json({ 
        error: 'Sistema de Discord temporariamente indisponível. Entre em contato com a equipe através do Discord da cidade.',
        discordUnavailable: true
      });
    }

  } catch (error) {
    console.error('❌ Erro na recuperação de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para resetar senha com token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar token
    const resetToken = await global.database.getPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Atualizar senha
    await global.database.updateCreatorPassword(resetToken.criador_id, newPassword);
    
    // Marcar token como usado
    await global.database.markPasswordResetTokenAsUsed(token);

    // Buscar dados do criador para notificar no Discord
    const criador = await global.database.getCreatorById(resetToken.criador_id);
    
    if (criador && criador.discord_id && global.discordBot && global.discordBot.client) {
      try {
        const embed = {
          color: 0x00FF00, // Verde
          title: '✅ Senha Alterada com Sucesso',
          description: `Sua senha foi alterada com sucesso!`,
          fields: [
            {
              name: '👤 Conta',
              value: `**Nome:** ${criador.nome}\n**ID Game:** ${criador.game_id || 'N/A'}`,
              inline: true
            },
            {
              name: '⏰ Data/Hora',
              value: new Date().toLocaleString('pt-BR'),
              inline: true
            }
          ],
          footer: {
            text: 'Bot Criador - Sistema de Recuperação de Senha'
          },
          timestamp: new Date()
        };

        await global.discordBot.sendDirectEmbed(criador.discord_id, embed);
      } catch (discordError) {
        console.error('❌ Erro ao enviar confirmação no Discord:', discordError);
      }
    }

    res.json({ message: 'Senha alterada com sucesso!' });

  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Usar código WL (rota pública)
router.post('/use-wl-code', async (req, res) => {
  try {
    const { code, playerId, playerName, discordUserId } = req.body;
    
    if (!code || !playerId || !playerName) {
      return res.status(400).json({ error: 'Código, ID e nome são obrigatórios' });
    }

    // Verificar se o jogador existe no banco vrp_users e se whitelisted = 0
    const playerData = await global.database.checkPlayerExists(playerId);
    if (!playerData) {
      return res.status(400).json({ error: 'ID não encontrado no banco de dados ou whitelist já liberada' });
    }

    // Usar o código
    const result = await global.database.useWLCode(code, playerId, playerName, discordUserId);
    console.log(`🎫 Código usado com sucesso - Criador ID: ${result.criador_id}`);
    
    // Atualizar WL e nome no banco vrp_users
    await global.database.updatePlayerWL(playerId, playerName);

    console.log(`🎮 Atualizando WL para jogador ${playerId} com nome ${playerName}`);

    res.json({
      message: 'WL liberada com sucesso!',
      playerName: playerName,
      playerId: playerId
    });
    
  } catch (error) {
    console.error('Erro ao usar código WL:', error);
    
    if (error.message === 'Código inválido ou já usado' || 
        error.message === 'ID não encontrado no banco de dados' ||
        error.message === 'Whitelist já está liberada para este jogador' ||
        error.message.includes('não podem ser usados entre 00:00 e 07:00')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resgatar bônus - gerar cupom Hydrus de uso único válido por 3 dias
router.post('/redeem-bonus', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const { valor } = req.body;
    if (!valor || isNaN(valor) || valor <= 0) {
      return res.status(400).json({ error: 'Valor inválido para resgate' });
    }
    // Buscar criador
    const criador = await global.database.getCreatorById(decoded.id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }
    const bonusAtual = parseFloat(criador.bonus_acumulado || 0);
    if (valor > bonusAtual) {
      return res.status(400).json({ error: 'Valor maior que bônus disponível' });
    }
    // Criar cupom na Hydrus
    const HydrusService = require('../hydrus-service');
    const hydrusService = new HydrusService();
    // Parâmetros do cupom
    const now = new Date();
    const expires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
    const couponName = `RESGATE${criador.id}${Date.now().toString().slice(-5)}`;
    const couponPayload = {
      name: couponName,
      value: valor,
      is_flat: true,
      minimum: 0,
      remaining: 1,
      is_ephemeral: false,
      partner_commission: 0,
      starts_at: now.toISOString(),
      ends_at: expires.toISOString()
    };
    const coupon = await hydrusService.createCoupon(couponPayload);
    if (!coupon || !coupon.id) {
      return res.status(500).json({ error: 'Erro ao criar cupom na Hydrus.gg' });
    }
    // Descontar bônus
    const novoBonus = bonusAtual - valor;
    await global.database.pool.execute(
      'UPDATE criadores SET bonus_acumulado = ? WHERE id = ?',
      [novoBonus, criador.id]
    );
    // Retornar cupom
    res.json({
      message: 'Cupom gerado com sucesso!',
      coupon: {
        id: coupon.id,
        name: coupon.name,
        value: coupon.value,
        expires: coupon.ends_at
      },
      novoBonus
    });
  } catch (error) {
    console.error('Erro ao resgatar bônus:', error);
    res.status(500).json({ error: 'Erro ao resgatar bônus', details: error.message });
  }
});

// Upar de nível
router.post('/level-up', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const criador = await global.database.getCreatorById(decoded.id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }
    // Buscar áreas
    const areasIds = criador.areas_ids ? JSON.parse(criador.areas_ids) : [];
    const areas = [];
    for (const areaId of areasIds) {
      const area = await global.database.getAreaById(areaId);
      if (area) areas.push(area);
    }
    const agora = new Date();
    // Removida verificação de XP - sempre pode upar quando solicitar
    // --- NOVO: Resetar cupom e WL antes de upar ---
    const HydrusService = require('../hydrus-service');
    const hydrusService = new HydrusService();
    // Deletar cupom antigo na Hydrus
    if (criador.cupom_id) {
      try {
        await hydrusService.deleteCoupon(criador.cupom_id);
      } catch (e) {
        console.warn('Erro ao deletar cupom antigo na Hydrus:', e.message);
      }
    }
    // Criar novo cupom com mesmo nome (com retry)
    let novoCupomId = null;
    if (criador.cupom_desconto || criador.cupom_id) {
      // Buscar informações do cupom antes de deletar
      let nomeCupom = criador.cupom_desconto;
      
      if (criador.cupom_id) {
        try {
          const cupomInfo = await hydrusService.getCouponById(criador.cupom_id);
          if (cupomInfo && cupomInfo.name) {
            nomeCupom = cupomInfo.name;
            console.log(`📋 Nome do cupom recuperado: ${nomeCupom}`);
          }
        } catch (error) {
          console.warn(`⚠️ Não foi possível buscar informações do cupom ${criador.cupom_id}:`, error.message);
          nomeCupom = criador.cupom_desconto || `CUPOM_${criador.nome.replace(/\s+/g, '_')}_${Date.now()}`;
        }
      }
      
      let tentativas = 0;
      let criado = false;
      let ultimoErro = '';
      while (!criado && tentativas < 3) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2s
          // Garantir que o nome seja uma string
          const nomeCupomString = String(nomeCupom);
          console.log(`🔍 DEBUG: Nome convertido para string: ${nomeCupomString}`);
          
          const novoCupom = await hydrusService.createCoupon(nomeCupomString, criador.nome);
          novoCupomId = novoCupom.id;
          await global.database.pool.execute('UPDATE criadores SET cupom_id = ? WHERE id = ?', [novoCupomId, criador.id]);
          criado = true;
        } catch (e) {
          ultimoErro = e.message;
          if (e.message && e.message.includes('already been taken')) {
            tentativas++;
            continue;
          } else {
            return res.status(500).json({ error: 'Erro ao criar novo cupom na Hydrus.gg', details: e.message });
          }
        }
      }
      if (!criado) {
        return res.status(500).json({ error: 'Erro ao criar novo cupom na Hydrus.gg após múltiplas tentativas', details: ultimoErro });
      }
    }
    // Apagar todos os códigos WL do criador
    await global.database.pool.execute('DELETE FROM wl_codes WHERE criador_id = ?', [criador.id]);
    // --- FIM RESET ---
    // Upar de nível e zerar métricas de progresso
    const novoNivel = parseInt(criador.nivel || 1) + 1;
    await global.database.pool.execute(
      `UPDATE criadores SET 
        nivel = ?, 
        ultimo_up_nivel = ?,
        horas_live = 0,
        fotos_aprovadas = 0,
        videos_aprovados = 0,
        visualizacoes = 0,
        indicados = 0
      WHERE id = ?`,
      [novoNivel, agora.toISOString().slice(0, 19).replace('T', ' '), criador.id]
    );
    res.json({ message: 'Nível upado com sucesso! Cupom, códigos WL e métricas de progresso resetados.', novoNivel });
  } catch (error) {
    console.error('Erro ao upar de nível:', error);
    res.status(500).json({ error: 'Erro ao upar de nível', details: error.message });
  }
});

// Middleware de autenticação para criadores
function authenticateCreator(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token não fornecido - Headers:', req.headers);
      if (global.errorLogger) {
        global.errorLogger.logError(new Error('Token não fornecido'), {
          endpoint: req.originalUrl,
          method: req.method,
          headers: req.headers,
          user: 'Não autenticado'
        });
      }
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    console.log('🔍 Verificando token:', token.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token válido para:', decoded.email || decoded.discord_id || 'Desconhecido');
    
    req.creator = decoded;
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    console.error('❌ Token recebido:', req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'Nenhum');
    
    // Log detalhado do erro
    if (global.errorLogger) {
      global.errorLogger.logError(error, {
        endpoint: req.originalUrl,
        method: req.method,
        tokenPreview: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'Nenhum',
        user: 'Não autenticado',
        errorType: error.name,
        errorMessage: error.message
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Rotas de Ranking
// Rota de teste para verificar se o banco está funcionando
router.get('/test-db', async (req, res) => {
  try {
    console.log('🧪 Testando conexão com banco de dados...');
    
    if (!global.database || !global.database.pool) {
      console.error('❌ Banco de dados não disponível');
      return res.status(503).json({ error: 'Banco de dados não disponível' });
    }
    
    const [rows] = await global.database.pool.execute('SELECT COUNT(*) as total FROM criadores');
    console.log('✅ Conexão com banco OK. Total de criadores:', rows[0].total);
    
    // Verificar dados dos criadores
    const [criadores] = await global.database.pool.execute(`
      SELECT id, nome, status, videos_aprovados, horas_live, indicados 
      FROM criadores 
      LIMIT 5
    `);
    
    res.json({ 
      success: true, 
      totalCriadores: rows[0].total,
      databaseAvailable: !!global.database,
      poolAvailable: !!global.database.pool,
      criadores: criadores
    });
  } catch (error) {
    console.error('❌ Erro no teste do banco:', error);
    res.status(500).json({ error: 'Erro no teste do banco', details: error.message });
  }
});

// Obter ranking de vídeos
router.get('/ranking/videos', async (req, res) => {
  try {
    console.log('🏆 Buscando ranking de vídeos...');
    
    // Verificar se o banco está disponível
    if (!global.database || !global.database.pool) {
      console.error('❌ Banco de dados não disponível');
      return res.status(503).json({ error: 'Banco de dados não disponível' });
    }
    
    console.log('🔍 Executando query de ranking de vídeos...');
    
    // Primeiro, vamos testar uma query mais simples
    console.log('🔍 Testando query simples...');
    const [testRows] = await global.database.pool.execute('SELECT COUNT(*) as total FROM criadores WHERE status = "aprovado"');
    console.log('📊 Total de criadores aprovados:', testRows[0].total);
    
    // Verificar se há criadores com videos_aprovados
    const [videoRows] = await global.database.pool.execute('SELECT COUNT(*) as total FROM criadores WHERE status = "aprovado" AND videos_aprovados > 0');
    console.log('📊 Criadores com vídeos aprovados:', videoRows[0].total);
    
    const [rows] = await global.database.pool.execute(`
      SELECT 
        id,
        nome,
        discord_id,
        COALESCE(profile_image, '') as foto_perfil,
        status,
        videos_aprovados
      FROM criadores 
      WHERE status = 'aprovado'
      ORDER BY videos_aprovados DESC
      LIMIT 3
    `);
    
    console.log(`📊 Ranking de vídeos encontrado: ${rows.length} criadores`);
    console.log('📋 Dados encontrados:', rows);
    res.json(rows);
  } catch (error) {
    console.error('❌ Erro ao buscar ranking de vídeos:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Obter ranking de horas de live
router.get('/ranking/lives', async (req, res) => {
  try {
    console.log('🏆 Buscando ranking de lives...');
    
    const [rows] = await global.database.pool.execute(`
      SELECT 
        id,
        nome,
        discord_id,
        COALESCE(profile_image, '') as foto_perfil,
        status,
        horas_live as total_horas_live
      FROM criadores 
      WHERE status = 'aprovado'
      ORDER BY horas_live DESC
      LIMIT 3
    `);
    
    console.log(`📊 Ranking de lives encontrado: ${rows.length} criadores`);
    res.json(rows);
  } catch (error) {
    console.error('❌ Erro ao buscar ranking de lives:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Obter ranking de indicações
router.get('/ranking/indicacoes', async (req, res) => {
  try {
    console.log('🏆 Buscando ranking de indicações...');
    
    const [rows] = await global.database.pool.execute(`
      SELECT 
        id,
        nome,
        discord_id,
        COALESCE(profile_image, '') as foto_perfil,
        status,
        indicados as total_indicados
      FROM criadores 
      WHERE status = 'aprovado'
      ORDER BY indicados DESC
      LIMIT 3
    `);
    
    console.log(`📊 Ranking de indicações encontrado: ${rows.length} criadores`);
    res.json(rows);
  } catch (error) {
    console.error('❌ Erro ao buscar ranking de indicações:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

module.exports = router; 