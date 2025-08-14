const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('../database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';

let io;

// Função para criar embed de aprovação de criador
function criarEmbedAprovacaoCriador(nome, areas, observacoes) {
  const areasText = areas.length > 0 ? areas.join(', ') : 'Nenhuma categoria específica';
  const cargosText = areas.length > 0 ? areas.join(', ') : 'Em breve';
  
  const embed = {
    color: 0x28a745, // Verde
    title: '🎉 PARABÉNS! Seu cadastro foi APROVADO! 🎉',
    description: `Olá **${nome}**! Seu cadastro foi aprovado com sucesso!`,
    fields: [
      {
        name: '✅ Status',
        value: 'Cadastro aprovado com sucesso!',
        inline: true
      },
      {
        name: '📋 Categorias',
        value: areasText,
        inline: true
      },
      {
        name: '🎭 Cargos Concedidos',
        value: cargosText,
        inline: true
      }
    ],
    footer: {
      text: 'Cidade Alto Astral - Sistema de Criadores'
    },
    timestamp: new Date()
  };

  if (observacoes && observacoes.trim()) {
    embed.fields.push({
      name: '💬 Observações da Equipe',
      value: observacoes,
      inline: false
    });
  }

  embed.fields.push({
    name: '🚀 Próximos Passos',
            value: '• Acesse seu painel de criador\n• Comece a criar conteúdo\n• Envie seus trabalhos para aprovação\n• Ganhe bônus por suas atividades',
    inline: false
  });

  embed.fields.push({
    name: '📞 Suporte',
    value: 'Precisa de ajuda? Entre em contato com nossa equipe!',
    inline: false
  });

  embed.fields.push({
    name: '🛍️ Acesse a Loja Oficial',
    value: 'Use seu cupom na loja oficial para aproveitar produtos exclusivos da Cidade Alto Astral!',
    inline: false
  });

  return embed;
}

// Função para criar embed de rejeição de criador
function criarEmbedRejeicaoCriador(nome, observacoes) {
  const embed = {
    color: 0xdc3545, // Vermelho
    title: '❌ Seu cadastro foi REJEITADO ❌',
    description: `Olá **${nome}**! Infelizmente seu cadastro não foi aprovado desta vez.`,
    fields: [
      {
        name: '💬 Motivo da Rejeição',
        value: observacoes && observacoes.trim() ? observacoes : 'Não foi fornecido um motivo específico.',
        inline: false
      },
      {
        name: '🔄 O que Fazer Agora',
        value: '• Revise as informações do seu cadastro\n• Corrija os problemas identificados\n• Entre em contato conosco se tiver dúvidas\n• Você pode tentar novamente em breve',
        inline: false
      },
      {
        name: '📞 Suporte',
        value: 'Precisa de ajuda? Entre em contato com nossa equipe!',
        inline: false
      }
    ],
    footer: {
      text: 'Cidade Alto Astral - Sistema de Criadores'
    },
    timestamp: new Date()
  };

  return embed;
}

// Função para criar embed de aprovação de conteúdo
function criarEmbedAprovacaoConteudo(nome, tipo, bonusGanho, observacoes) {
  const tipoText = {
    'fotos': '📸 Fotos',
    'video': '🎥 Vídeo',
    'live': '🎬 Live'
  }[tipo] || tipo;

  const embed = {
    color: 0x17a2b8, // Azul
    title: '🎉 Seu conteúdo foi APROVADO! 🎉',
    description: `Parabéns **${nome}**! Seu conteúdo foi aprovado com sucesso!`,
    fields: [
      {
        name: '📋 Tipo de Conteúdo',
        value: tipoText,
        inline: true
      },
      {
        name: '💰 Bônus Ganho',
        value: `R$ ${bonusGanho.toFixed(2)}`,
        inline: true
      }
    ],
    footer: {
      text: 'Cidade Alto Astral - Sistema de Criadores'
    },
    timestamp: new Date()
  };

  if (observacoes && observacoes.trim()) {
    embed.fields.push({
      name: '💬 Feedback da Equipe',
      value: observacoes,
      inline: false
    });
  }

  embed.fields.push({
    name: '🚀 Continue Ativo!',
    value: 'Mantenha-se ativo criando conteúdo de qualidade! Quanto mais você produz, mais chances tem de ser notado pela cidade e receber propostas de monetização! 💎',
    inline: false
  });

  embed.fields.push({
    name: '💎 Oportunidades Futuras',
    value: '• Criadores ativos são priorizados para parcerias\n• Conteúdo de qualidade pode gerar propostas de monetização\n• Quanto mais conteúdo aprovado, mais oportunidades de crescimento\n• A cidade está sempre de olho nos melhores criadores!',
    inline: false
  });

  embed.fields.push({
    name: '📊 Dicas para Crescer',
    value: '• Mantenha consistência na produção\n• Foque na qualidade do conteúdo\n• Interaja com a comunidade\n• Seja criativo e original\n• Aproveite feedbacks para melhorar',
    inline: false
  });

  embed.fields.push({
    name: '🛍️ Acesse a Loja Oficial',
    value: 'Use seu cupom na loja oficial para resgatar seu bônus e aproveitar produtos exclusivos da Cidade Alto Astral!',
    inline: false
  });

  return embed;
}

// Função para criar botão da loja
function criarBotaoLoja() {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  
  const storeUrl = process.env.STORE_URL || 'https://vip.altoastralrp.com/';
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🛍️ Acessar Loja')
        .setStyle(ButtonStyle.Link)
        .setURL(storeUrl)
    );
  
  return row;
}

// Função para configurar o socket.io
function setSocketIO(socketIO) {
    io = socketIO;
}

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Obter todos os criadores (com filtro opcional)
router.get('/criadores', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const criadores = await global.database.getCreators(status);
    
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
    console.error('Erro ao buscar criadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter criador específico
router.get('/criadores/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Buscando criador com ID:', req.params.id);
    
    const criadores = await global.database.getCreators();
    console.log('📋 Total de criadores carregados:', criadores.length);
    
    const criador = criadores.find(c => c.id == req.params.id);
    console.log('👤 Criador encontrado:', criador ? 'Sim' : 'Não');
    
    if (!criador) {
      console.log('❌ Criador não encontrado com ID:', req.params.id);
      return res.status(404).json({ error: 'Criador não encontrado' });
    }
    
    console.log('✅ Criador carregado com sucesso:', criador.nome);
    res.json(criador);
  } catch (error) {
    console.error('❌ Erro ao buscar criador:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Log de erro para Discord
    if (global.errorLogger) {
      global.errorLogger.logError(error, {
        endpoint: `GET /api/staff/criadores/${req.params.id}`,
        method: 'GET',
        user: req.user?.nome || 'Staff',
        requestData: { criadorId: req.params.id }
      });
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Aprovar ou rejeitar criador
router.put('/criadores/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;
    const staffId = req.user.id;

    if (!status || !['aprovado', 'rejeitado'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser "aprovado" ou "rejeitado"' });
    }

    // Buscar informações do criador antes de atualizar
    const criador = await global.database.getCreatorById(id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }

    // Impedir re-aprovação ou re-rejeição
    if (criador.status === status) {
      return res.status(400).json({ 
        error: `Criador já está ${status === 'aprovado' ? 'aprovado' : 'rejeitado'}. Não é possível alterar para o mesmo status.` 
      });
    }

    // Impedir mudança de status após aprovação/rejeição
    if (criador.status === 'aprovado' && status === 'rejeitado') {
      return res.status(400).json({ 
        error: 'Criador aprovado não pode ser rejeitado. Apenas criadores pendentes podem ser alterados.' 
      });
    }

    if (criador.status === 'rejeitado' && status === 'aprovado') {
      return res.status(400).json({ 
        error: 'Criador rejeitado não pode ser aprovado. Apenas criadores pendentes podem ser alterados.' 
      });
    }

    await global.database.updateCreatorStatus(id, status, observacoes, staffId);

    // Se foi aprovado, conceder cargos no Discord e enviar mensagem
    if (status === 'aprovado' && criador.discord_id && global.discordBot) {
      try {
        console.log(`🎭 Concedendo cargos para criador aprovado: ${criador.nome} (Discord ID: ${criador.discord_id})`);
        
        // Buscar áreas do criador
        const criadorComAreas = await global.database.getCreatorWithArea(id);
        let areaNames = [];
        
        if (criadorComAreas && criadorComAreas.areas && criadorComAreas.areas.length > 0) {
          areaNames = criadorComAreas.areas.map(area => area.nome);
          const result = await global.discordBot.addCreatorRoles(criador.discord_id, areaNames);
          
          console.log(`✅ Cargos concedidos para ${criador.nome}: ${result.rolesConcedidos.join(', ')}`);
        } else {
          console.log(`⚠️ Criador ${criador.nome} não possui áreas cadastradas`);
        }

        // Enviar embed de aprovação
        const embedAprovacao = criarEmbedAprovacaoCriador(criador.nome, areaNames, observacoes);
        const botaoLoja = criarBotaoLoja();
        await global.discordBot.sendDirectEmbed(criador.discord_id, embedAprovacao, [botaoLoja]);
        console.log(`📨 Embed de aprovação enviado para ${criador.nome}`);
        
      } catch (discordError) {
        console.error('❌ Erro ao processar Discord:', discordError);
        // Não falha a aprovação se der erro no Discord
      }
    } else if (status === 'rejeitado' && criador.discord_id && global.discordBot) {
      try {
        // Enviar embed de rejeição
        const embedRejeicao = criarEmbedRejeicaoCriador(criador.nome, observacoes);
        await global.discordBot.sendDirectEmbed(criador.discord_id, embedRejeicao);
        console.log(`📨 Embed de rejeição enviado para ${criador.nome}`);
        
      } catch (discordError) {
        console.error('❌ Erro ao enviar mensagem de rejeição:', discordError);
        // Não falha a rejeição se der erro no Discord
      }
    }

    // Notificações em tempo real desabilitadas
    // if (io) {
    //   io.to('staff-room').emit('creator-status-updated', {
    //     id: parseInt(id),
    //     status,
    //     observacoes,
    //     updated_by: req.user.nome,
    //     updated_at: new Date().toISOString()
    //   });
    // }

    res.json({ 
      message: `Criador ${status} com sucesso`,
      status,
      observacoes
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status da conta do criador (edição)
router.put('/criadores/:id/account-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;
    const staffId = req.user.id;

    if (!status || !['aprovado', 'pendente', 'suspenso'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser "aprovado", "pendente" ou "suspenso"' });
    }

    // Buscar informações do criador antes de atualizar
    const criador = await global.database.getCreatorById(id);
    if (!criador) {
      return res.status(404).json({ error: 'Criador não encontrado' });
    }

    // Impedir mudança para o mesmo status
    if (criador.status === status) {
      return res.status(400).json({ 
        error: `Criador já está ${status === 'aprovado' ? 'aprovado' : status === 'pendente' ? 'em análise' : 'suspenso'}.` 
      });
    }

    await global.database.updateCreatorAccountStatus(id, status, observacoes, staffId);

    // Se foi aprovado, conceder cargos no Discord
    if (status === 'aprovado' && criador.discord_id && global.discordBot) {
      try {
        console.log(`🎭 Concedendo cargos para criador aprovado: ${criador.nome} (Discord ID: ${criador.discord_id})`);
        
        const criadorComAreas = await global.database.getCreatorWithArea(id);
        let areaNames = [];
        
        if (criadorComAreas && criadorComAreas.areas && criadorComAreas.areas.length > 0) {
          areaNames = criadorComAreas.areas.map(area => area.nome);
          const result = await global.discordBot.addCreatorRoles(criador.discord_id, areaNames);
          console.log(`✅ Cargos concedidos para ${criador.nome}: ${result.rolesConcedidos.join(', ')}`);
        }
      } catch (discordError) {
        console.error('❌ Erro ao processar Discord:', discordError);
      }
    }

    // Se foi suspenso, remover cargos no Discord
    if (status === 'suspenso' && criador.discord_id && global.discordBot) {
      try {
        console.log(`🚫 Removendo cargos de criador suspenso: ${criador.nome}`);
        await global.discordBot.removeCreatorRoles(criador.discord_id);
        console.log(`✅ Cargos removidos de ${criador.nome}`);
      } catch (discordError) {
        console.error('❌ Erro ao remover cargos Discord:', discordError);
      }
    }

    res.json({ 
      message: `Status da conta do criador alterado para ${status === 'pendente' ? 'em análise' : status === 'suspenso' ? 'suspenso' : 'aprovado'}`,
      status,
      observacoes
    });
  } catch (error) {
    console.error('Erro ao atualizar status da conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas do painel
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const criadores = await global.database.getCreators();
    
    const stats = {
      total: criadores.length,
      pendentes: criadores.filter(c => c.status === 'pendente').length,
      aprovados: criadores.filter(c => c.status === 'aprovado').length,
      rejeitados: criadores.filter(c => c.status === 'rejeitado').length,
      por_area: {}
    };

    // Estatísticas por área
    criadores.forEach(criador => {
      const area = criador.area_nome || 'Sem área';
      if (!stats.por_area[area]) {
        stats.por_area[area] = {
          total: 0,
          pendentes: 0,
          aprovados: 0,
          rejeitados: 0
        };
      }
      
      stats.por_area[area].total++;
      stats.por_area[area][criador.status]++;
    });

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter todos os conteúdos
router.get('/conteudos', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let conteudos = await global.database.getAllConteudos();
    
    console.log('📊 Conteúdos carregados:', conteudos.length);
    if (conteudos.length > 0) {
        console.log('📊 Primeiros 3 conteúdos:', conteudos.slice(0, 3).map(c => ({
          id: c.id,
          tipo: c.tipo,
          status: c.status,
          postado: c.postado,
          criador_nome: c.criador_nome
        })));
        
        // Verificar vídeos especificamente
        const videos = conteudos.filter(c => c.tipo === 'video');
        console.log('📹 Vídeos encontrados:', videos.length);
        if (videos.length > 0) {
            console.log('📹 Primeiros vídeos:', videos.slice(0, 3).map(v => ({
                id: v.id,
                status: v.status,
                postado: v.postado
            })));
        }
    } else {
        console.log('⚠️ Nenhum conteúdo encontrado na base de dados');
    }
    
    // Filtrar por status se especificado
    if (status) {
      conteudos = conteudos.filter(c => c.status === status);
    }
    
    res.json(conteudos);
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conteúdo específico
router.get('/conteudos/:id', authenticateToken, async (req, res) => {
  try {
    const conteudo = await global.database.getConteudoById(req.params.id);
    
    if (!conteudo) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    res.json(conteudo);
  } catch (error) {
    console.error('Erro ao buscar conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar ou rejeitar conteúdo
router.put('/conteudos/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;
    const staffId = req.user.id;

    if (!status || !['aprovado', 'rejeitado'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser "aprovado" ou "rejeitado"' });
    }

    // Verificar status atual do conteúdo
    const conteudoAtual = await global.database.getConteudoById(id);
    if (!conteudoAtual) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }

    // Impedir re-aprovação ou re-rejeição
    if (conteudoAtual.status === status) {
      return res.status(400).json({ 
        error: `Conteúdo já está ${status === 'aprovado' ? 'aprovado' : 'rejeitado'}. Não é possível alterar para o mesmo status.` 
      });
    }

    // Impedir mudança de status após aprovação/rejeição
    if (conteudoAtual.status === 'aprovado' && status === 'rejeitado') {
      return res.status(400).json({ 
        error: 'Conteúdo aprovado não pode ser rejeitado. Apenas conteúdos pendentes podem ser alterados.' 
      });
    }

    if (conteudoAtual.status === 'rejeitado' && status === 'aprovado') {
      return res.status(400).json({ 
        error: 'Conteúdo rejeitado não pode ser aprovado. Apenas conteúdos pendentes podem ser alterados.' 
      });
    }

    await global.database.updateConteudoStatus(id, status, observacoes, staffId);

    // Se for aprovação de conteúdo, somar bônus conforme o tipo
    if (status === 'aprovado') {
      const conteudo = await global.database.getConteudoById(id);
      if (conteudo) {
        const criador = await global.database.getCreatorById(conteudo.criador_id);
        let bonusGanho = 0;
        let horasLive = 0;
        
        if (conteudo.tipo === 'live' && conteudo.tempo_live) {
          bonusGanho = parseFloat(criador.bonus_hora_live || 5.00) * parseFloat(conteudo.tempo_live);
          horasLive = parseFloat(conteudo.tempo_live);
        } else if (conteudo.tipo === 'video') {
          bonusGanho = parseFloat(criador.bonus_video || 10.00);
        } else if (conteudo.tipo === 'fotos') {
          bonusGanho = parseFloat(criador.bonus_foto || 7.00);
        }
        
        // Atualizar bônus, horas de live, fotos e vídeos aprovados
        const bonusAtual = parseFloat(criador.bonus_acumulado || 0);
        const horasAtuais = parseFloat(criador.horas_live || 0);
        const fotosAtuais = parseInt(criador.fotos_aprovadas || 0);
        const videosAtuais = parseInt(criador.videos_aprovados || 0);
        
        const novoBonus = bonusAtual + bonusGanho;
        const novasHoras = horasAtuais + horasLive;
        const novasFotos = fotosAtuais + (conteudo.tipo === 'fotos' ? 1 : 0);
        const novosVideos = videosAtuais + (conteudo.tipo === 'video' ? 1 : 0);
        
        await global.database.pool.execute(
          'UPDATE criadores SET bonus_acumulado = ?, horas_live = ?, fotos_aprovadas = ?, videos_aprovados = ? WHERE id = ?',
          [novoBonus, novasHoras, novasFotos, novosVideos, conteudo.criador_id]
        );
        
        if (conteudo.tipo === 'live') {
          console.log(`⏱️ Live aprovada: +${horasLive}h, +R$${bonusGanho.toFixed(2)} para criador ${conteudo.criador_id}. Total: ${novasHoras}h, R$${novoBonus.toFixed(2)}`);
        } else if (conteudo.tipo === 'fotos') {
          console.log(`📸 Foto aprovada: +1 foto, +R$${bonusGanho.toFixed(2)} para criador ${conteudo.criador_id}. Total: ${novasFotos} fotos, R$${novoBonus.toFixed(2)}`);
        } else if (conteudo.tipo === 'video') {
          console.log(`🎥 Vídeo aprovado: +1 vídeo, +R$${bonusGanho.toFixed(2)} para criador ${conteudo.criador_id}. Total: ${novosVideos} vídeos, R$${novoBonus.toFixed(2)}`);
        } else {
          console.log(`⭐ Conteúdo aprovado: +R$${bonusGanho.toFixed(2)} para criador ${conteudo.criador_id}. Total: R$${novoBonus.toFixed(2)}`);
        }

        // Enviar embed de aprovação de conteúdo para o criador
        if (criador.discord_id && global.discordBot) {
          try {
            const embedConteudo = criarEmbedAprovacaoConteudo(criador.nome, conteudo.tipo, bonusGanho, observacoes);
            const botaoLoja = criarBotaoLoja();
            await global.discordBot.sendDirectEmbed(criador.discord_id, embedConteudo, [botaoLoja]);
            console.log(`📨 Embed de aprovação de conteúdo enviado para ${criador.nome}`);
          } catch (discordError) {
            console.error('❌ Erro ao enviar embed de aprovação de conteúdo:', discordError);
          }
        }
      }
    }

    // Notificações em tempo real desabilitadas
    // if (io) {
    //   io.to('staff-room').emit('content-status-updated', {
    //     id: parseInt(id),
    //     status,
    //     observacoes,
    //     updated_by: req.user.nome,
    //     updated_at: new Date().toISOString()
    //   });
    //   
    //   // Emitir evento específico para o criador se foi aprovado
    //   if (status === 'aprovado') {
    //     const conteudo = await global.database.getConteudoById(id);
    //     if (conteudo) {
    //       io.emit('conteudo_aprovado', {
    //         contentId: id,
    //         criadorId: conteudo.criador_id,
    //         horas_live: conteudo.tempo_live || 0
    //       });
    //     }
    //   }
    // }

    res.json({ 
      message: `Conteúdo ${status} com sucesso`,
      status,
      observacoes
    });
  } catch (error) {
    console.error('Erro ao atualizar status do conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar conteúdo como postado
router.put('/conteudos/:id/postado', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.user.id;

    // Verificar se o conteúdo existe
    const conteudo = await global.database.getConteudoById(id);
    if (!conteudo) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }

    // Marcar como postado
    await global.database.markConteudoAsPostado(id, staffId);

    res.json({ message: 'Conteúdo marcado como postado com sucesso' });
  } catch (error) {
    console.error('Erro ao marcar conteúdo como postado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar áreas do criador
router.put('/criadores/:id/areas', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { areas_ids } = req.body;

    if (!areas_ids || !Array.isArray(areas_ids)) {
      return res.status(400).json({ error: 'areas_ids deve ser um array' });
    }

    // Verificar se as áreas existem
    for (const areaId of areas_ids) {
      const area = await global.database.getAreaById(areaId);
      if (!area) {
        return res.status(400).json({ error: `Área ID ${areaId} não encontrada` });
      }
    }

    // Atualizar áreas do criador
    await global.database.pool.execute(
      'UPDATE criadores SET areas_ids = ? WHERE id = ?',
      [JSON.stringify(areas_ids), id]
    );

    // Atualizar cargos do Discord conforme as novas áreas
    const criador = await global.database.getCreatorById(id);
    if (criador && criador.discord_id && global.discordBot) {
      // Buscar áreas atualizadas
      const criadorComAreas = await global.database.getCreatorWithArea(id);
      let areaNames = [];
      if (criadorComAreas && criadorComAreas.areas && criadorComAreas.areas.length > 0) {
        areaNames = criadorComAreas.areas.map(area => area.nome);
        await global.discordBot.addCreatorRoles(criador.discord_id, areaNames);
      }
    }

    // Notificar staff em tempo real
    if (io) {
      io.to('staff-room').emit('creator-areas-updated', {
        id: parseInt(id),
        areas_ids,
        updated_by: req.user.nome,
        updated_at: new Date().toISOString()
      });
    }

    res.json({ 
      message: 'Áreas atualizadas com sucesso',
      areas_ids
    });
  } catch (error) {
    console.error('Erro ao atualizar áreas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perguntas das áreas (rota para forçar atualização)
router.post('/areas/update-questions', authenticateToken, async (req, res) => {
  try {
    // Forçar atualização das áreas com as novas perguntas
    await global.database.insertDefaultAreasMySQL();

    res.json({ 
      message: 'Perguntas das áreas atualizadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar perguntas das áreas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar dados do criador
router.put('/criadores/:id/data', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, discord_id, game_id } = req.body;

    // Validações básicas
    if (!nome || !email || !game_id) {
      return res.status(400).json({ error: 'Nome, email e ID do jogo são obrigatórios' });
    }

    // Verificar se email já existe (exceto para o próprio criador)
    const criadores = await global.database.getCreators();
    const emailExists = criadores.find(c => c.email === email && c.id != id);
    if (emailExists) {
      return res.status(400).json({ error: 'Email já está em uso por outro criador' });
    }

    // Verificar se game_id já existe (exceto para o próprio criador)
    const gameIdExists = criadores.find(c => c.game_id === game_id && c.id != id);
    if (gameIdExists) {
      return res.status(400).json({ error: 'ID do jogo já está em uso por outro criador' });
    }

    // Atualizar dados do criador
    await global.database.pool.execute(
      'UPDATE criadores SET nome = ?, email = ?, telefone = ?, discord_id = ?, game_id = ? WHERE id = ?',
      [nome, email, telefone, discord_id, game_id, id]
    );

    // Notificar staff em tempo real
    if (io) {
      io.to('staff-room').emit('creator-data-updated', {
        id: parseInt(id),
        nome,
        email,
        telefone,
        discord_id,
        game_id,
        updated_by: req.user.nome,
        updated_at: new Date().toISOString()
      });
    }

    res.json({ 
      message: 'Dados atualizados com sucesso',
      nome,
      email,
      telefone,
      discord_id,
      game_id
    });
  } catch (error) {
    console.error('Erro ao atualizar dados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de conteúdos
router.get('/conteudos-stats', authenticateToken, async (req, res) => {
  try {
    const conteudos = await global.database.getAllConteudos();
    
    const stats = {
      total: conteudos.length,
      pendentes: conteudos.filter(c => c.status === 'pendente').length,
      aprovados: conteudos.filter(c => c.status === 'aprovado').length,
      rejeitados: conteudos.filter(c => c.status === 'rejeitado').length,
      por_tipo: {}
    };

    // Estatísticas por tipo
    conteudos.forEach(conteudo => {
      const tipo = conteudo.tipo || 'Sem tipo';
      if (!stats.por_tipo[tipo]) {
        stats.por_tipo[tipo] = {
          total: 0,
          pendentes: 0,
          aprovados: 0,
          rejeitados: 0
        };
      }
      
      stats.por_tipo[tipo].total++;
      stats.por_tipo[tipo][conteudo.status]++;
    });

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de conteúdos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = { router, setSocketIO }; 