const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// const bcrypt = require('bcryptjs'); // REMOVIDO
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware de autenticação para admin
async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const staff = await global.database.getStaffById(decoded.id);
    if (!staff || (staff.nivel !== 'admin' && staff.nivel !== 'super_admin') || !staff.ativo) {
      return res.status(401).json({ error: 'Acesso negado' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação admin:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Middleware de autenticação para super admin
async function authenticateSuperAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const staff = await global.database.getStaffById(decoded.id);
    if (!staff || staff.nivel !== 'super_admin' || !staff.ativo) {
      return res.status(401).json({ error: 'Acesso negado - Super Admin necessário' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação super admin:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Verificar token admin
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({ user: req.user });
});

// Login admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const staff = await global.database.authenticateStaff(username, password);
    if (!staff || (staff.nivel !== 'admin' && staff.nivel !== 'super_admin')) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!staff.ativo) {
      return res.status(401).json({ error: 'Conta desativada' });
    }

    // Atualizar último login
    await global.database.pool.execute(
      'UPDATE staff SET ultimo_login = NOW() WHERE id = ?',
      [staff.id]
    );

    const token = jwt.sign(
      { id: staff.id, username: staff.username, nivel: staff.nivel },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: staff.id,
        username: staff.username,
        nome: staff.nome,
        email: staff.email,
        nivel: staff.nivel,
        permissoes: staff.permissoes ? JSON.parse(staff.permissoes) : {}
      }
    });
  } catch (error) {
    console.error('❌ Erro no login admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter todos os criadores com dados completos
router.get('/criadores', authenticateAdmin, async (req, res) => {
  try {
    const criadores = await global.database.getCreators();
    
    // Buscar vendas dos cupons na Hydrus.gg
    const HydrusService = require('../hydrus-service');
    const hydrusService = new HydrusService();
    
    const criadoresComVendas = await Promise.all(criadores.map(async (criador) => {
      let cupomVendas = 0;
      
      if (criador.cupom_id) {
        try {
          const cupom = await hydrusService.getCouponById(criador.cupom_id);
          if (cupom) {
            cupomVendas = parseFloat(cupom.orders_sum_total || 0);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar vendas do cupom ${criador.cupom_id}:`, error.message);
        }
      }
      
      return {
        ...criador,
        cupom_vendas: cupomVendas
      };
    }));
    
    res.json(criadoresComVendas);
  } catch (error) {
    console.error('❌ Erro ao buscar criadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



// Atualizar nível do criador
router.put('/criadores/:id/nivel', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nivel } = req.body;
    const adminId = req.user.id;

    // Validar se o valor foi fornecido
    if (nivel === undefined || nivel === null || nivel === '') {
      return res.status(400).json({ error: 'Nível é obrigatório' });
    }

    const nivelNum = parseInt(nivel);
    if (isNaN(nivelNum) || nivelNum < 1) {
      return res.status(400).json({ error: 'Nível deve ser um número positivo' });
    }

    const success = await global.database.updateCreatorLevel(id, nivelNum, adminId);
    
    if (success) {
      res.json({ message: 'Nível atualizado com sucesso', nivel: nivelNum });
    } else {
      res.status(404).json({ error: 'Criador não encontrado' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar nível:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar bonus do criador
router.put('/criadores/:id/bonus', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { bonus } = req.body;
    const adminId = req.user.id;

    // Validar se o valor foi fornecido
    if (bonus === undefined || bonus === null || bonus === '') {
      return res.status(400).json({ error: 'Bonus é obrigatório' });
    }

    const bonusNum = parseFloat(bonus);
    if (isNaN(bonusNum) || bonusNum < 0) {
      return res.status(400).json({ error: 'Bonus deve ser um número maior ou igual a zero' });
    }

    const success = await global.database.updateCreatorBonus(id, bonusNum, adminId);
    
    if (success) {
      res.json({ message: 'Bonus atualizado com sucesso', bonus: bonusNum });
    } else {
      res.status(404).json({ error: 'Criador não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao atualizar bonus:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar data do último up de nível
router.put('/criadores/:id/ultimo-up', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;
    const adminId = req.user.id;

    // Validar se a data foi fornecida
    if (!data) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    // Validar formato da data
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido' });
    }

    const success = await global.database.updateCreatorLastLevelUp(id, data, adminId);
    
    if (success) {
      res.json({ message: 'Data atualizada com sucesso', data: data });
    } else {
      res.status(404).json({ error: 'Criador não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao atualizar data:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar cupom do criador
router.put('/criadores/:id/cupom', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { cupom_nome } = req.body;
    const adminId = req.user.id;

    // Validar se o nome do cupom foi fornecido
    if (!cupom_nome) {
      return res.status(400).json({ error: 'Nome do cupom é obrigatório' });
    }

    const success = await global.database.updateCreatorCoupon(id, cupom_nome, adminId);
    
    if (success) {
      res.json({ message: 'Cupom atualizado com sucesso', cupom_nome: cupom_nome });
    } else {
      res.status(404).json({ error: 'Criador não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar email do criador
router.put('/criadores/:id/email', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const adminId = req.user.id;

    // Validar se o email foi fornecido
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const success = await global.database.updateCreatorEmail(id, email, adminId);
    
    if (success) {
      res.json({ message: 'Email atualizado com sucesso', email: email });
    } else {
      res.status(404).json({ error: 'Criador não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao atualizar email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar Discord ID do criador
router.put('/criadores/:id/discord', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { discord_id } = req.body;
    const adminId = req.user.id;

    // Validar se o Discord ID foi fornecido
    if (!discord_id) {
      return res.status(400).json({ error: 'Discord ID é obrigatório' });
    }

    const success = await global.database.updateCreatorDiscord(id, discord_id, adminId);
    
    if (success) {
      res.json({ message: 'Discord ID atualizado com sucesso', discord_id: discord_id });
    } else {
      res.status(404).json({ error: 'Criador não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao atualizar Discord ID:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar áreas do criador
router.put('/criadores/:id/areas', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { areas_ids } = req.body;
    const adminId = req.user.id;

    // Validar se as áreas foram fornecidas
    if (!areas_ids || !Array.isArray(areas_ids)) {
      return res.status(400).json({ error: 'Áreas são obrigatórias e devem ser um array' });
    }

    const success = await global.database.updateCreatorAreas(id, areas_ids, adminId);
    
    if (success) {
      res.json({ message: 'Áreas atualizadas com sucesso', areas_ids: areas_ids });
    } else {
      res.status(404).json({ error: 'Criador não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao atualizar áreas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter todos os admins
router.get('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const admins = await global.database.getAllStaff();
    res.json(admins);
  } catch (error) {
    console.error('Erro ao buscar admins:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo admin
router.post('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const { username, password, nome, email, nivel, permissoes } = req.body;
    const adminId = req.user.id;

    if (!username || !password || !nome || !email || !nivel) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const success = await global.database.createAdmin({
      username,
      password,
      nome,
      email,
      nivel,
      permissoes: permissoes || {}
    }, adminId);

    if (success) {
      res.json({ message: 'Admin criado com sucesso' });
    } else {
      res.status(400).json({ error: 'Erro ao criar admin' });
    }
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Desativar admin
router.put('/admins/:id/deactivate', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const success = await global.database.deactivateStaff(id, adminId);
    
    if (success) {
      res.json({ message: 'Admin desativado com sucesso' });
    } else {
      res.status(404).json({ error: 'Admin não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao desativar admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter logs administrativos
router.get('/logs', authenticateAdmin, async (req, res) => {
  try {
    const { admin_id, acao, tabela, data_inicio, data_fim } = req.query;
    
    const filters = {};
    if (admin_id) filters.admin_id = admin_id;
    if (acao) filters.acao = acao;
    if (tabela) filters.tabela = tabela;
    if (data_inicio) filters.data_inicio = data_inicio;
    if (data_fim) filters.data_fim = data_fim;

    const logs = await global.database.getAdminLogs(filters);
    res.json({ logs: logs });
  } catch (error) {
    console.error('❌ Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar log de teste
router.post('/test-log', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    await global.database.createAdminLog({
      admin_id: adminId,
      acao: 'TESTE',
      tabela: 'teste',
      registro_id: 0,
      dados_anteriores: { teste: 'anterior' },
      dados_novos: { teste: 'novo' }
    });

    res.json({ message: 'Log de teste criado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao criar log de teste:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar criadores contratados
router.get('/contratados', authenticateAdmin, async (req, res) => {
  try {
    const contratados = await global.database.getContractedCreators();
    res.json({ contratados });
  } catch (error) {
    console.error('❌ Erro ao buscar contratados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar contratado específico por ID
router.get('/contratados/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const contratado = await global.database.getContractedCreatorById(id);
    
    if (!contratado) {
      return res.status(404).json({ error: 'Contratado não encontrado' });
    }
    
    res.json(contratado);
  } catch (error) {
    console.error('❌ Erro ao buscar contratado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar todas as áreas disponíveis
router.get('/areas', authenticateAdmin, async (req, res) => {
  try {
    const areas = await global.database.getAreas();
    res.json(areas);
  } catch (error) {
    console.error('❌ Erro ao buscar áreas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Contratar criador
router.post('/contratar-criador', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      criador_id,
      valor_hora_live,
      valor_10k_visualizacao,
      valor_indicacao,
      percentual_cupom,
      limite_ganhos,
      bonus_hora_live,
      bonus_foto,
      bonus_video,
      metas
    } = req.body;

    // Validar campos obrigatórios
    if (!criador_id) {
      return res.status(400).json({ error: 'ID do criador é obrigatório' });
    }

    // Verificar se o criador existe e está aprovado
    const criador = await global.database.getCreatorById(criador_id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }

    if (criador.status !== 'aprovado') {
      return res.status(400).json({ error: 'Apenas criadores aprovados podem ser contratados' });
    }

    if (criador.contratado) {
      return res.status(400).json({ error: 'Criador já é contratado' });
    }

    // Zerar progressos do criador
    console.log('🔄 Zerando progressos do criador...');
    await global.database.pool.execute(
      `UPDATE criadores SET 
        horas_live = 0,
        fotos_aprovadas = 0,
        videos_aprovados = 0,
        indicados = 0
      WHERE id = ?`,
      [criador_id]
    );
    console.log('✅ Progressos zerados com sucesso');

    // Zerar visualizações na tabela criadores
    console.log('🔄 Zerando visualizações do criador...');
    await global.database.pool.execute(
      `UPDATE criadores SET 
        visualizacoes = 0
      WHERE id = ?`,
      [criador_id]
    );
    console.log('✅ Visualizações zeradas com sucesso');

    // Recriar cupom se o criador já tinha um
    if (criador.cupom_desconto && criador.cupom_id) {
      console.log('🔄 Recriando cupom...');
      try {
        const HydrusService = require('../hydrus-service');
        const hydrusService = new HydrusService();
        
        // Buscar informações do cupom antes de deletar
        let nomeCupom = criador.cupom_desconto;
        
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
        
        // Deletar cupom antigo
        await hydrusService.deleteCoupon(criador.cupom_id);
        console.log('✅ Cupom antigo deletado');
        
        // Aguardar 2 segundos para a API processar a deleção
        console.log('⏳ Aguardando 2 segundos para processar deleção...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Criar novo cupom com o mesmo nome
        console.log(`🔍 DEBUG: Criando cupom com nome: ${nomeCupom}, tipo: ${typeof nomeCupom}`);
        
        // Garantir que o nome seja uma string
        const nomeCupomString = String(nomeCupom);
        console.log(`🔍 DEBUG: Nome convertido para string: ${nomeCupomString}`);
        
        const novoCupom = await hydrusService.createCoupon(nomeCupomString, criador.nome);
        console.log('✅ Novo cupom criado:', novoCupom.id);
        
        // Atualizar ID do cupom no banco
        await global.database.pool.execute(
          'UPDATE criadores SET cupom_id = ? WHERE id = ?',
          [novoCupom.id, criador_id]
        );
        console.log('✅ ID do cupom atualizado no banco');
      } catch (cupomError) {
        console.error('❌ Erro ao recriar cupom:', cupomError);
        
        // Se o erro for 404 (cupom não encontrado), limpar o cupom_id do banco
        if (cupomError.message.includes('404')) {
          console.log('🔄 Limpando cupom_id inválido do banco...');
          try {
            await global.database.pool.execute(
              'UPDATE criadores SET cupom_id = NULL WHERE id = ?',
              [criador_id]
            );
            console.log('✅ Cupom_id limpo do banco');
          } catch (dbError) {
            console.error('❌ Erro ao limpar cupom_id:', dbError.message);
          }
        }
        
        // Não falhar o processo se o cupom não puder ser recriado
      }
    }

    // Atualizar valores do criador
    const updateData = {
      valor_hora_live: valor_hora_live || 0,
      valor_10k_visualizacao: valor_10k_visualizacao || 0,
      valor_indicacao: valor_indicacao || 0,
      percentual_cupom: percentual_cupom || 0,
      limite_ganhos: limite_ganhos || 0,
      bonus_hora_live: bonus_hora_live || 5.00,
      bonus_foto: bonus_foto || 7.00,
      bonus_video: bonus_video || 10.00,
      contratado: 1
    };

    const success = await global.database.updateCreatorValues(criador_id, updateData);
    
    // Atualizar metas das áreas se fornecidas
    if (metas && Object.keys(metas).length > 0) {
      try {
        await global.database.updateCreatorMetas(criador_id, metas);
        console.log(`✅ Metas atualizadas para criador ${criador_id}`);
      } catch (metaError) {
        console.error('❌ Erro ao atualizar metas:', metaError);
        // Não falhar o processo se as metas não puderem ser atualizadas
      }
    }
    
    if (success) {
      // Criar log da ação
      await global.database.createAdminLog({
        admin_id: adminId,
        acao: 'CONTRATAR_CRIADOR',
        tabela: 'criadores',
        registro_id: criador_id,
        dados_anteriores: { 
          contratado: 0,
          horas_live: criador.horas_live || 0,
          fotos_aprovadas: criador.fotos_aprovadas || 0,
          videos_aprovados: criador.videos_aprovados || 0,
          indicados: criador.indicados || 0,
          visualizacoes_videos: 'zeradas'
        },
        dados_novos: { 
          ...updateData, 
          metas: metas || null,
          horas_live: 0,
          fotos_aprovadas: 0,
          videos_aprovados: 0,
          indicados: 0,
          visualizacoes_videos: 0
        }
      });

      console.log(`✅ Criador ${criador.nome} contratado com sucesso por admin ${adminId}`);
      res.json({ 
        message: 'Criador contratado com sucesso! Progressos zerados, visualizações zeradas e cupom recriado.',
        criador: {
          id: criador_id,
          nome: criador.nome,
          contratado: true
        }
      });
    } else {
      res.status(500).json({ error: 'Erro ao contratar criador' });
    }
  } catch (error) {
    console.error('❌ Erro ao contratar criador:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar contratado
router.put('/contratados/:id', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const {
      valor_hora_live,
      valor_10k_visualizacao,
      valor_indicacao,
      percentual_cupom,
      limite_ganhos,
      bonus_hora_live,
      bonus_foto,
      bonus_video,
      metas
    } = req.body;

    // Verificar se o contratado existe
    const contratado = await global.database.getContractedCreatorById(id);
    if (!contratado) {
      return res.status(404).json({ error: 'Contratado não encontrado' });
    }

    // Dados para atualização
    const updateData = {
      valor_hora_live: valor_hora_live || 0,
      valor_10k_visualizacao: valor_10k_visualizacao || 0,
      valor_indicacao: valor_indicacao || 0,
      percentual_cupom: percentual_cupom || 0,
      limite_ganhos: limite_ganhos || 0,
      bonus_hora_live: bonus_hora_live || 5.00,
      bonus_foto: bonus_foto || 7.00,
      bonus_video: bonus_video || 10.00,
      contratado: 1  // Manter como contratado
    };

    // Atualizar valores do criador
    const success = await global.database.updateCreatorValues(id, updateData);
    
    // Atualizar metas das áreas se fornecidas
    if (metas && Object.keys(metas).length > 0) {
      console.log('📊 Metas recebidas na rota:', metas);
      try {
        await global.database.updateCreatorMetas(id, metas);
        console.log(`✅ Metas atualizadas para criador ${id}`);
      } catch (metaError) {
        console.error('❌ Erro ao atualizar metas:', metaError);
        // Não falhar o processo se as metas não puderem ser atualizadas
      }
    } else {
      console.log('⚠️ Nenhuma meta fornecida para atualização');
    }
    
    if (success) {
      // Criar log da ação
      await global.database.createAdminLog({
        admin_id: adminId,
        acao: 'ATUALIZAR_CONTRATADO',
        tabela: 'criadores',
        registro_id: id,
        dados_anteriores: contratado,
        dados_novos: { ...updateData, metas }
      });

      console.log(`✅ Contratado ${contratado.nome} atualizado com sucesso por admin ${adminId}`);
      res.json({ 
        message: 'Contratado atualizado com sucesso',
        contratado: {
          id: id,
          nome: contratado.nome
        }
      });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar contratado' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar contratado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar áreas do contratado
router.put('/contratados/:id/areas', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { areas_ids } = req.body;

    // Verificar se o contratado existe
    const contratado = await global.database.getContractedCreatorById(id);
    if (!contratado) {
      return res.status(404).json({ error: 'Contratado não encontrado' });
    }

    // Atualizar áreas do criador
    const success = await global.database.updateCreatorAreas(id, areas_ids);
    
    if (success) {
      // Criar log da ação
      await global.database.createAdminLog({
        admin_id: adminId,
        acao: 'ATUALIZAR_AREAS_CONTRATADO',
        tabela: 'criadores',
        registro_id: id,
        dados_anteriores: { areas_ids: contratado.areas_ids },
        dados_novos: { areas_ids: areas_ids }
      });

      console.log(`✅ Áreas do contratado ${contratado.nome} atualizadas com sucesso por admin ${adminId}`);
      res.json({ 
        message: 'Áreas atualizadas com sucesso',
        contratado: {
          id: id,
          nome: contratado.nome,
          areas_ids: areas_ids
        }
      });
    } else {
      res.status(500).json({ error: 'Erro ao atualizar áreas' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar áreas do contratado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover contratado (mudar contratado para 0)
router.delete('/contratados/:id', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    // Verificar se o contratado existe
    const contratado = await global.database.getContractedCreatorById(id);
    if (!contratado) {
      return res.status(404).json({ error: 'Contratado não encontrado' });
    }

    // Mudar contratado para 0 (remover status de contratado)
    const updateData = {
      contratado: 0
    };

    const success = await global.database.updateCreatorValues(id, updateData);
    
    if (success) {
      // Criar log da ação
      await global.database.createAdminLog({
        admin_id: adminId,
        acao: 'REMOVER_CONTRATADO',
        tabela: 'criadores',
        registro_id: id,
        dados_anteriores: { contratado: 1 },
        dados_novos: { contratado: 0 }
      });

      console.log(`✅ Contratado ${contratado.nome} removido com sucesso por admin ${adminId}`);
      res.json({ 
        message: 'Contratado removido com sucesso',
        contratado: {
          id: id,
          nome: contratado.nome
        }
      });
    } else {
      res.status(500).json({ error: 'Erro ao remover contratado' });
    }
  } catch (error) {
    console.error('❌ Erro ao remover contratado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE PAGAMENTOS =====

// Listar todas as solicitações de saque
router.get('/saques', authenticateAdmin, async (req, res) => {
  try {
    // Buscar todas as solicitações de saque com dados do criador
    const [saques] = await global.database.pool.execute(`
      SELECT 
        s.*,
        c.nome as criador_nome,
        c.email as criador_email
      FROM saques s
      LEFT JOIN criadores c ON s.criador_id = c.id
      ORDER BY s.data_solicitacao DESC
    `);

    // Calcular estatísticas
    const [stats] = await global.database.pool.execute(`
      SELECT 
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
        COUNT(CASE WHEN status = 'aprovado' THEN 1 END) as aprovados,
        COUNT(CASE WHEN status = 'pago' THEN 1 END) as pagos,
        COUNT(CASE WHEN status = 'rejeitado' THEN 1 END) as rejeitados
      FROM saques
    `);

    res.json({
      saques: saques,
      stats: stats[0]
    });
  } catch (error) {
    console.error('❌ Erro ao buscar saques:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar detalhes de um saque específico
router.get('/saques/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [saques] = await global.database.pool.execute(`
      SELECT 
        s.*,
        c.nome as criador_nome,
        c.email as criador_email,
        c.telefone as criador_telefone,
        c.discord_id as criador_discord_id,
        c.contratado as criador_contratado
      FROM saques s
      LEFT JOIN criadores c ON s.criador_id = c.id
      WHERE s.id = ?
    `, [id]);

    if (saques.length === 0) {
      return res.status(404).json({ error: 'Saque não encontrado' });
    }

    res.json(saques[0]);
  } catch (error) {
    console.error('❌ Erro ao buscar saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar saque
router.post('/saques/:id/aprovar', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    // Verificar se o saque existe e está pendente
    const [saques] = await global.database.pool.execute(
      'SELECT * FROM saques WHERE id = ? AND status = "pendente"',
      [id]
    );

    if (saques.length === 0) {
      return res.status(404).json({ error: 'Saque não encontrado ou já processado' });
    }

    const saque = saques[0];

    // Buscar informações atuais do criador
    const [criadores] = await global.database.pool.execute(
      'SELECT * FROM criadores WHERE id = ?',
      [saque.criador_id]
    );

    if (criadores.length === 0) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }

    const criador = criadores[0];

    // Apenas atualizar status para aprovado
    await global.database.pool.execute(
      'UPDATE saques SET status = "aprovado", data_aprovacao = NOW(), aprovado_por = ? WHERE id = ?',
      [adminId, id]
    );

    // Criar log da ação
    await global.database.createAdminLog({
      admin_id: adminId,
      acao: 'APROVAR_SAQUE',
      tabela: 'saques',
      registro_id: id,
      dados_anteriores: { 
        status: 'pendente'
      },
      dados_novos: { 
        status: 'aprovado'
      }
    });

    console.log(`✅ Saque ${id} aprovado com sucesso por admin ${adminId}`);
    res.json({ message: 'Saque aprovado com sucesso.' });
  } catch (error) {
    console.error('❌ Erro ao aprovar saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rejeitar saque
router.post('/saques/:id/rejeitar', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar se o saque existe e está pendente
    const [saques] = await global.database.pool.execute(
      'SELECT * FROM saques WHERE id = ? AND status = "pendente"',
      [id]
    );

    if (saques.length === 0) {
      return res.status(404).json({ error: 'Saque não encontrado ou já processado' });
    }

    const saque = saques[0];

    // Atualizar status para rejeitado
    await global.database.pool.execute(
      'UPDATE saques SET status = "rejeitado", observacoes = ? WHERE id = ?',
      [motivo, id]
    );

    // Criar log da ação
    await global.database.createAdminLog({
      admin_id: adminId,
      acao: 'REJEITAR_SAQUE',
      tabela: 'saques',
      registro_id: id,
      dados_anteriores: { status: 'pendente' },
      dados_novos: { status: 'rejeitado', observacoes: motivo }
    });

    console.log(`✅ Saque ${id} rejeitado com sucesso por admin ${adminId}`);
    res.json({ message: 'Saque rejeitado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao rejeitar saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar saque como pago
router.post('/saques/:id/pagar', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    // Verificar se o saque existe e está aprovado
    const [saques] = await global.database.pool.execute(
      'SELECT * FROM saques WHERE id = ? AND status = "aprovado"',
      [id]
    );

    if (saques.length === 0) {
      return res.status(404).json({ error: 'Saque não encontrado ou não está aprovado' });
    }

    const saque = saques[0];

    // Atualizar status para pago
    await global.database.pool.execute(
      'UPDATE saques SET status = "pago", data_pagamento = NOW() WHERE id = ?',
      [id]
    );

    // Criar log da ação
    await global.database.createAdminLog({
      admin_id: adminId,
      acao: 'PAGAR_SAQUE',
      tabela: 'saques',
      registro_id: id,
      dados_anteriores: { status: 'aprovado' },
      dados_novos: { status: 'pago' }
    });

    console.log(`✅ Saque ${id} marcado como pago com sucesso por admin ${adminId}`);
    res.json({ message: 'Saque marcado como pago com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao marcar saque como pago:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});





module.exports = router; 