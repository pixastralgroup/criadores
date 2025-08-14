const mysql = require('mysql2/promise');
// const bcrypt = require('bcryptjs'); // REMOVIDO
const { config } = require('./config');

class Database {
  constructor() {
    this.initMySQL();
  }

  async initMySQL() {
    try {
      // Criar pool de conexões MySQL
      this.pool = mysql.createPool(config.database.mysql);
      
      // Testar conexão
      const connection = await this.pool.getConnection();
      console.log('✅ Conectado ao MySQL com sucesso!');
      connection.release();
      
      // Inicializar tabelas
      await this.initMySQLTables();
      
    } catch (error) {
      console.error('❌ Erro ao conectar ao MySQL:', error.message);
      throw error;
    }
  }

  async init() {
    await this.initMySQL();
    await this.initMySQLTables();
    await this.insertDefaultAreasMySQL();
    await this.updateAreasQuestions(); // Atualizar perguntas das áreas existentes
    await this.insertDefaultStaffMySQL();
  }

  async initMySQLTables() {
    try {
      // Tabela de áreas de atuação
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS areas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL UNIQUE,
          descricao TEXT,
          perguntas JSON,
          ativo BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de usuários staff
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS staff (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          nivel ENUM('staff', 'admin', 'super_admin') DEFAULT 'staff',
          permissoes JSON,
          ativo BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ultimo_login TIMESTAMP NULL
        )
      `);

      // Tabela de logs administrativos
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT,
          admin_nome VARCHAR(100),
          acao VARCHAR(100) NOT NULL,
          tabela VARCHAR(50),
          registro_id INT,
          dados_anteriores JSON,
          dados_novos JSON,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES staff(id) ON DELETE SET NULL
        )
      `);

      // Tabela de criadores
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS criadores (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          telefone VARCHAR(50),
          discord_id VARCHAR(255) UNIQUE,
          game_id VARCHAR(255) UNIQUE,
          password VARCHAR(255) NOT NULL,
          areas_ids JSON,
          respostas JSON,
          profile_image TEXT,
          cupom_desconto VARCHAR(100),
          cupom_id INT,
          status VARCHAR(50) DEFAULT 'pendente',
          observacoes TEXT,
          aprovado_por INT,
          nivel INT DEFAULT 1,
          xp_acumulado FLOAT DEFAULT 0,
          bonus_acumulado FLOAT DEFAULT 0,
          horas_live FLOAT DEFAULT 0,
          fotos_aprovadas INT DEFAULT 0,
          videos_aprovados INT DEFAULT 0,
          visualizacoes INT DEFAULT 0,
          ultimo_up_nivel TIMESTAMP NULL,
          indicados INT DEFAULT 0,
          valor_hora_live DECIMAL(10,2) DEFAULT 0.00,
          valor_10k_visualizacao DECIMAL(10,2) DEFAULT 0.00,
          valor_indicacao DECIMAL(10,2) DEFAULT 0.00,
          percentual_cupom DECIMAL(5,2) DEFAULT 0.00,
          limite_ganhos DECIMAL(10,2) DEFAULT 0.00,
          bonus_hora_live DECIMAL(10,2) DEFAULT 5.00,
          bonus_foto DECIMAL(10,2) DEFAULT 7.00,
          bonus_video DECIMAL(10,2) DEFAULT 10.00,
          xp_hora_live INT DEFAULT 17,
          xp_foto INT DEFAULT 25,
          xp_video INT DEFAULT 63,
          meta_horas_live INT DEFAULT 50,
          meta_fotos INT DEFAULT 30,
          meta_videos INT DEFAULT 20,
          contratado TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Tabela de conteúdos
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS conteudos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          criador_id INT NOT NULL,
          tipo VARCHAR(50) NOT NULL,
          visualizacoes INT DEFAULT 0,
          likes INT DEFAULT 0,
          comentarios INT DEFAULT 0,
          print_video TEXT,
          print_foto TEXT,
          observacoes TEXT,
          tempo_live FLOAT DEFAULT 0,
          link_video TEXT,
          link_foto TEXT,
          status VARCHAR(50) DEFAULT 'pendente',
          aprovado_por INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (criador_id) REFERENCES criadores(id) ON DELETE CASCADE,
          FOREIGN KEY (aprovado_por) REFERENCES staff(id) ON DELETE SET NULL
        )
      `);

      // Tabela de códigos WL
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS wl_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(20) NOT NULL UNIQUE,
          criador_id INT NOT NULL,
          usado BOOLEAN DEFAULT FALSE,
          usado_por_id INT,
          usado_por_nome VARCHAR(255),
          usado_em TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (criador_id) REFERENCES criadores(id) ON DELETE CASCADE
        )
      `);

      // Tabela de saques
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS saques (
          id INT AUTO_INCREMENT PRIMARY KEY,
          criador_id INT NOT NULL,
          valor_solicitado DECIMAL(10,2) NOT NULL,
          tipo_chave ENUM('cpf', 'cnpj', 'email', 'telefone', 'aleatoria') NOT NULL,
          chave_pix VARCHAR(255) NOT NULL,
          nome_beneficiario VARCHAR(255) NOT NULL,
          status ENUM('pendente', 'aprovado', 'pago', 'rejeitado') DEFAULT 'pendente',
          data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          data_aprovacao TIMESTAMP NULL,
          data_pagamento TIMESTAMP NULL,
          observacoes TEXT,
          aprovado_por INT,
          -- Campos para salvar informações do criador no momento do saque
          horas_live_saque DECIMAL(10,2) DEFAULT 0,
          indicados_saque INT DEFAULT 0,
          fotos_aprovadas_saque INT DEFAULT 0,
          videos_aprovados_saque INT DEFAULT 0,
          visualizacoes_saque INT DEFAULT 0,
          valor_vendas_cupom_saque DECIMAL(10,2) DEFAULT 0,
          cupom_id_saque INT NULL,
          FOREIGN KEY (criador_id) REFERENCES criadores(id) ON DELETE CASCADE,
          FOREIGN KEY (aprovado_por) REFERENCES staff(id) ON DELETE SET NULL
        )
      `);

      console.log('✅ Tabelas MySQL criadas com sucesso!');
      
      // Verificar e adicionar colunas faltantes na tabela criadores
      await this.verifyAndAddMissingColumns();
      
      // Atualizar estrutura da tabela wl_codes se necessário
      await this.updateWLCodesTableStructure();
      
      // Inserir dados padrão
      await this.insertDefaultAreasMySQL();
      await this.insertDefaultStaffMySQL();
      
    } catch (error) {
      console.error('❌ Erro ao criar tabelas MySQL:', error);
      throw error;
    }
  }

  async insertDefaultAreasMySQL() {
    try {
      // Verificar se já existe áreas
      const [rows] = await this.pool.execute('SELECT COUNT(*) as count FROM areas');
      if (rows[0].count > 0) {
        console.log('ℹ️ Áreas já existem, pulando inserção padrão');
        return;
      }

      // Inserir áreas padrão
      const areas = [
        {
          nome: 'FOTOS',
          descricao: 'Criação de conteúdo fotográfico',
          perguntas: [
            'Qual é o nome do seu personagem?',
            'Quantos seguidores você tem no Instagram?',
            'Quantos likes você tem em média por foto?',
            'Quantos comentários você tem em média por foto?'
          ]
        },
        {
          nome: 'VÍDEO',
          descricao: 'Criação de conteúdo em vídeo',
          perguntas: [
            'Qual é o nome do seu personagem?',
            'Quantos seguidores você tem no YouTube?',
            'Quantas visualizações você tem em média por vídeo?',
            'Quantos likes você tem em média por vídeo?',
            'Quantos comentários você tem em média por vídeo?'
          ]
        },
        {
          nome: 'LIVE',
          descricao: 'Transmissões ao vivo',
          perguntas: [
            'Qual é o nome do seu personagem?',
            'Quantos seguidores você tem na Twitch?',
            'Quantos espectadores você tem em média por live?',
            'Quantas horas você faz live por semana?'
          ]
        }
      ];

      for (const area of areas) {
        await this.pool.execute(
          'INSERT INTO areas (nome, descricao, perguntas) VALUES (?, ?, ?)',
          [area.nome, area.descricao, JSON.stringify(area.perguntas)]
        );
      }

      console.log('✅ Áreas padrão criadas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar áreas padrão:', error);
    }
  }

  // Atualizar perguntas das áreas existentes
  async updateAreasQuestions() {
    try {
      console.log('🔄 Atualizando perguntas das áreas...');
      
      // Buscar áreas existentes
      const [areas] = await this.pool.execute('SELECT * FROM areas');
      
      for (const area of areas) {
        let perguntas = [];
        
        try {
          perguntas = JSON.parse(area.perguntas || '[]');
        } catch (error) {
          console.log(`⚠️ Erro ao fazer parse das perguntas da área ${area.nome}:`, error);
          continue;
        }
        
        // Remover perguntas sobre ID in-game e Discord
        const perguntasFiltradas = perguntas.filter(pergunta => 
          !pergunta.includes('ID in-game') && 
          !pergunta.includes('Discord')
        );
        
        if (perguntasFiltradas.length !== perguntas.length) {
          console.log(`📝 Atualizando área ${area.nome}: ${perguntas.length} → ${perguntasFiltradas.length} perguntas`);
          
          await this.pool.execute(
            'UPDATE areas SET perguntas = ? WHERE id = ?',
            [JSON.stringify(perguntasFiltradas), area.id]
          );
        }
      }
      
      console.log('✅ Perguntas das áreas atualizadas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar perguntas das áreas:', error);
    }
  }

  async insertDefaultStaffMySQL() {
    try {
      // Verificar se já existe staff
      const [rows] = await this.pool.execute('SELECT COUNT(*) as count FROM staff');
      if (rows[0].count > 0) {
        console.log('ℹ️ Staff já existe, pulando inserção padrão');
        return;
      }

      // Inserir super admin padrão
      const superAdminPassword = 'superadmin123'; // REMOVIDO bcrypt.hashSync
      await this.pool.execute(
        'INSERT INTO staff (username, password, nome, email, nivel, permissoes) VALUES (?, ?, ?, ?, ?, ?)',
        ['superadmin', superAdminPassword, 'Super Administrador', 'superadmin@exemplo.com', 'super_admin', JSON.stringify({
          gerenciar_criadores: true,
          gerenciar_admins: true,
          visualizar_logs: true,
          editar_xp: true,
          editar_nivel: true,
          editar_bonus: true,
          editar_cupom: true
        })]
      );

      // Inserir admin padrão
      const adminPassword = 'admin123'; // REMOVIDO bcrypt.hashSync
      await this.pool.execute(
        'INSERT INTO staff (username, password, nome, email, nivel, permissoes) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin', adminPassword, 'Administrador', 'admin@exemplo.com', 'admin', JSON.stringify({
          gerenciar_criadores: true,
          visualizar_logs: true,
          editar_xp: true,
          editar_nivel: true,
          editar_bonus: true,
          editar_cupom: true
        })]
      );

      console.log('✅ Staff padrão criado com sucesso!');
      console.log('👑 Super Admin - Usuário: superadmin | Senha: superadmin123');
      console.log('👤 Admin - Usuário: admin | Senha: admin123');
    } catch (error) {
      console.error('❌ Erro ao criar staff padrão:', error);
    }
  }

  // Métodos para áreas
  async getAreas() {
    try {
      console.log('🗄️ Executando query para buscar áreas...');
      const [rows] = await this.pool.execute('SELECT * FROM areas WHERE ativo = TRUE');
      console.log('📊 Resultado da query:', rows.length, 'áreas encontradas');
      
      // Log detalhado de cada área
      rows.forEach((area, index) => {
        console.log(`Área ${index + 1} do banco:`, {
          id: area.id,
          nome: area.nome,
          descricao: area.descricao,
          perguntas_tipo: typeof area.perguntas,
          perguntas_valor: area.perguntas ? area.perguntas.substring(0, 100) + '...' : 'null'
        });
      });
      
      return rows;
    } catch (error) {
      console.error('❌ Erro na função getAreas:', error);
      throw error;
    }
  }

  async getAreaById(id) {
    const [rows] = await this.pool.execute('SELECT * FROM areas WHERE id = ? AND ativo = TRUE', [id]);
    return rows[0];
  }

  // Métodos para criadores
  async createCreator(creator) {
    const plainPassword = creator.password; // REMOVIDO bcrypt.hashSync
    
    const [result] = await this.pool.execute(
      'INSERT INTO criadores (nome, email, telefone, discord_id, game_id, password, areas_ids, respostas, profile_image, cupom_desconto, cupom_id, valor_hora_live, valor_10k_visualizacao, valor_indicacao, percentual_cupom, limite_ganhos, bonus_hora_live, bonus_foto, bonus_video) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        creator.nome, 
        creator.email, 
        creator.telefone, 
        creator.discord_id, 
        creator.game_id, 
        plainPassword, 
        JSON.stringify(creator.areas_ids), 
        JSON.stringify(creator.respostas), 
        creator.profile_image, 
        creator.cupom_desconto, 
        creator.cupom_id,
        creator.valor_hora_live || config.defaultCreatorValues.valor_hora_live,
        creator.valor_10k_visualizacao || config.defaultCreatorValues.valor_10k_visualizacao,
        creator.valor_indicacao || config.defaultCreatorValues.valor_indicacao,
        creator.percentual_cupom || config.defaultCreatorValues.percentual_cupom,
        creator.limite_ganhos || config.defaultCreatorValues.limite_ganhos,
        creator.bonus_hora_live || config.defaultCreatorValues.bonus_hora_live,
        creator.bonus_foto || config.defaultCreatorValues.bonus_foto,
        creator.bonus_video || config.defaultCreatorValues.bonus_video
      ]
    );
    return result.insertId;
  }

  async getCreators(status = null) {
    let query = `
        SELECT c.*, 
               GROUP_CONCAT(DISTINCT a.nome ORDER BY a.nome SEPARATOR ', ') as areas_nomes,
               c.fotos_aprovadas,
               c.videos_aprovados
        FROM criadores c 
        LEFT JOIN areas a ON FIND_IN_SET(a.id, REPLACE(REPLACE(c.areas_ids, '[', ''), ']', ''))
      `;
    let params = [];

    if (status) {
      query += ' WHERE c.status = ?';
      params.push(status);
    }

    query += ' GROUP BY c.id ORDER BY c.created_at DESC';

    try {
      console.log('🔍 Executando query getCreators:', query);
      console.log('📋 Parâmetros:', params);
      
      const [rows] = await this.pool.execute(query, params);
      console.log('✅ getCreators executado com sucesso,', rows.length, 'criadores encontrados');
      return rows;
    } catch (error) {
      console.error('❌ Erro na query getCreators:', error);
      console.error('❌ Query que falhou:', query);
      console.error('❌ Parâmetros:', params);
      
      // Fallback para versões que não suportam GROUP_CONCAT
      console.log('🔄 Tentando fallback query...');
      const fallbackQuery = `
        SELECT DISTINCT c.*, a.nome as area_nome
        FROM criadores c 
        LEFT JOIN areas a ON FIND_IN_SET(a.id, REPLACE(REPLACE(c.areas_ids, '[', ''), ']', ''))
        ${status ? 'WHERE c.status = ?' : ''}
        ORDER BY c.created_at DESC
      `;
      const fallbackParams = status ? [status] : [];
      
      try {
        const [fallbackRows] = await this.pool.execute(fallbackQuery, fallbackParams);
        console.log('✅ Fallback query executado com sucesso,', fallbackRows.length, 'criadores encontrados');
        return fallbackRows;
      } catch (fallbackError) {
        console.error('❌ Erro também no fallback query:', fallbackError);
        console.error('❌ Fallback query que falhou:', fallbackQuery);
        console.error('❌ Fallback parâmetros:', fallbackParams);
        
        // Último fallback: query simples sem JOIN
        console.log('🔄 Tentando query simples...');
        const simpleQuery = `SELECT * FROM criadores ${status ? 'WHERE status = ?' : ''} ORDER BY created_at DESC`;
        const simpleParams = status ? [status] : [];
        
        try {
          const [simpleRows] = await this.pool.execute(simpleQuery, simpleParams);
          console.log('✅ Query simples executada com sucesso,', simpleRows.length, 'criadores encontrados');
          return simpleRows;
        } catch (simpleError) {
          console.error('❌ Erro também na query simples:', simpleError);
          throw new Error('Falha ao carregar criadores: ' + simpleError.message);
        }
      }
    }
  }

  async getContractedCreators() {
    const query = `
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT a.nome ORDER BY a.nome SEPARATOR ', ') as areas_nomes,
             COUNT(ct.id) as total_conteudos,
             SUM(CASE WHEN ct.status = 'aprovado' THEN 1 ELSE 0 END) as conteudos_aprovados,
             c.horas_live as total_horas_live,
             c.fotos_aprovadas as total_fotos,
             c.videos_aprovados as total_videos,
             c.visualizacoes as total_visualizacoes_video
      FROM criadores c 
      LEFT JOIN areas a ON FIND_IN_SET(a.id, REPLACE(REPLACE(c.areas_ids, '[', ''), ']', ''))
      LEFT JOIN conteudos ct ON c.id = ct.criador_id
      WHERE c.contratado = 1
      GROUP BY c.id 
      ORDER BY c.created_at DESC
    `;

    try {
      console.log('🔍 Executando query getContractedCreators');
      console.log('📝 Query:', query);
      const [rows] = await this.pool.execute(query);
      console.log('✅ getContractedCreators executado com sucesso,', rows.length, 'criadores contratados encontrados');
      console.log('📊 Dados retornados:', rows);
      return rows;
    } catch (error) {
      console.error('❌ Erro na query getContractedCreators:', error);
      
      // Fallback para query simples
      const fallbackQuery = `
        SELECT c.*, 
               COUNT(ct.id) as total_conteudos,
               SUM(CASE WHEN ct.status = 'aprovado' THEN 1 ELSE 0 END) as conteudos_aprovados
        FROM criadores c 
        LEFT JOIN conteudos ct ON c.id = ct.criador_id
        WHERE c.contratado = 1
        GROUP BY c.id 
        ORDER BY c.created_at DESC
      `;
      
      try {
        const [fallbackRows] = await this.pool.execute(fallbackQuery);
        console.log('✅ Fallback query executado com sucesso,', fallbackRows.length, 'criadores contratados encontrados');
        return fallbackRows;
      } catch (fallbackError) {
        console.error('❌ Erro também no fallback query:', fallbackError);
        throw new Error('Falha ao carregar criadores contratados: ' + fallbackError.message);
      }
    }
  }

  async getContractedCreatorById(id) {
    // Primeiro, buscar o criador contratado
    const criadorQuery = `
      SELECT c.*, 
             COUNT(ct.id) as total_conteudos,
             SUM(CASE WHEN ct.status = 'aprovado' THEN 1 ELSE 0 END) as conteudos_aprovados,
             c.horas_live as total_horas_live,
             c.fotos_aprovadas as total_fotos,
             c.videos_aprovados as total_videos,
             c.visualizacoes as total_visualizacoes_video
      FROM criadores c 
      LEFT JOIN conteudos ct ON c.id = ct.criador_id
      WHERE c.id = ? AND c.contratado = 1
      GROUP BY c.id
    `;

    try {
      console.log('🔍 Executando query getContractedCreatorById para ID:', id);
      const [rows] = await this.pool.execute(criadorQuery, [id]);
      
      if (rows.length === 0) {
        console.log('❌ Nenhum contratado encontrado para ID:', id);
        return null;
      }
      
      const contratado = rows[0];
      console.log('📊 Dados básicos do contratado:', contratado);
      
      // Buscar áreas do criador
      let areas = [];
      let areasIds = [];
      
      if (contratado.areas_ids) {
        try {
          // Converter JSON string para array
          const areasIdsArray = JSON.parse(contratado.areas_ids);
          areasIds = Array.isArray(areasIdsArray) ? areasIdsArray : [];
          
          if (areasIds.length > 0) {
            const areasQuery = `
              SELECT id, nome, descricao
              FROM areas
              WHERE id IN (${areasIds.map(() => '?').join(',')})
              ORDER BY nome
            `;
            
            const [areasRows] = await this.pool.execute(areasQuery, areasIds);
            areas = areasRows;
            console.log('✅ Áreas carregadas:', areas);
          }
        } catch (parseError) {
          console.error('❌ Erro ao fazer parse das areas_ids:', parseError);
          areasIds = [];
          areas = [];
        }
      }
      
      contratado.areas = areas;
      contratado.areas_ids_array = areasIds;
      
      // Buscar metas das áreas (estão na tabela criadores)
      let metas = [];
      if (areasIds.length > 0) {
        try {
          // As metas estão armazenadas diretamente na tabela criadores
          // Vamos mapear as áreas para suas respectivas metas
          console.log('🔍 Mapeando áreas para metas:');
          console.log('📊 Dados do contratado:', {
            meta_horas_live: contratado.meta_horas_live,
            meta_fotos: contratado.meta_fotos,
            meta_videos: contratado.meta_videos
          });
          
          metas = areas.map(area => {
            const areaName = area.nome.toLowerCase();
            let metaValue = 0;
            
            console.log(`🔍 Processando área: "${area.nome}" (lowercase: "${areaName}")`);
            
            if (areaName.includes('live')) {
              metaValue = contratado.meta_horas_live || 0;
              console.log(`✅ Área LIVE mapeada para meta_horas_live: ${metaValue}`);
            } else if (areaName.includes('foto')) {
              metaValue = contratado.meta_fotos || 0;
              console.log(`✅ Área FOTO mapeada para meta_fotos: ${metaValue}`);
            } else if (areaName.includes('video') || areaName.includes('vídeo')) {
              metaValue = contratado.meta_videos || 0;
              console.log(`✅ Área VÍDEO mapeada para meta_videos: ${metaValue}`);
            } else {
              console.log(`⚠️ Área não reconhecida: "${area.nome}"`);
            }
            
            return {
              area_id: area.id,
              area_name: area.nome,
              meta_value: metaValue
            };
          });
          
          console.log('✅ Metas carregadas:', metas);
        } catch (metaError) {
          console.error('❌ Erro ao processar metas:', metaError);
          // Criar metas padrão para as áreas que não têm meta
          metas = areas.map(area => ({
            area_id: area.id,
            area_name: area.nome,
            meta_value: 0
          }));
        }
      }
      
      contratado.metas = metas;
      
      console.log('✅ getContractedCreatorById executado com sucesso para ID:', id);
      console.log('📋 Dados finais do contratado:', {
        id: contratado.id,
        nome: contratado.nome,
        areas_count: areas.length,
        metas_count: metas.length,
        areas_ids: areasIds
      });
      
      return contratado;
    } catch (error) {
      console.error('❌ Erro na query getContractedCreatorById:', error);
      throw new Error('Falha ao carregar contratado: ' + error.message);
    }
  }

  // Métodos para staff
  async authenticateStaff(username, password) {
    const [rows] = await this.pool.execute('SELECT * FROM staff WHERE username = ? AND ativo = TRUE', [username]);
    const staff = rows[0];
    
    if (!staff) return null;
    
    if (password !== staff.password) return null; // REMOVIDO bcrypt.compare
    return staff;
  }

  // Métodos para conteúdos
  async createConteudo(conteudo) {
    const [result] = await this.pool.execute(
      'INSERT INTO conteudos (criador_id, tipo, visualizacoes, likes, comentarios, print_video, print_foto, observacoes, tempo_live, link_video, link_foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [conteudo.criador_id, conteudo.tipo, conteudo.visualizacoes, conteudo.likes, conteudo.comentarios, conteudo.print_video, conteudo.print_foto, conteudo.observacoes, conteudo.tempo_live, conteudo.link_video, conteudo.link_foto]
    );
    
    // Se for um vídeo, atualizar visualizações na tabela criadores
    if (conteudo.tipo === 'video' && conteudo.visualizacoes > 0) {
      console.log(`🔄 Atualizando visualizações do criador ${conteudo.criador_id}: +${conteudo.visualizacoes}`);
      await this.pool.execute(
        'UPDATE criadores SET visualizacoes = visualizacoes + ? WHERE id = ?',
        [conteudo.visualizacoes, conteudo.criador_id]
      );
      console.log('✅ Visualizações atualizadas na tabela criadores');
    }
    
    return result.insertId;
  }

  async getAllConteudos() {
    const [rows] = await this.pool.execute(`
        SELECT c.*, cr.nome as criador_nome, cr.game_id, 
               GROUP_CONCAT(DISTINCT a.nome SEPARATOR ', ') as areas_nomes
        FROM conteudos c 
        LEFT JOIN criadores cr ON c.criador_id = cr.id 
        LEFT JOIN areas a ON JSON_CONTAINS(cr.areas_ids, CAST(a.id AS CHAR))
        GROUP BY c.id, c.criador_id, c.tipo, c.visualizacoes, c.likes, c.comentarios, 
                 c.print_video, c.print_foto, c.observacoes, c.status, c.created_at, 
                 c.aprovado_por, cr.nome, cr.game_id
        ORDER BY c.created_at DESC
      `);
    return rows;
  }

  // Métodos adicionais para criadores
  async getCreatorById(id) {
    const [rows] = await this.pool.execute('SELECT * FROM criadores WHERE id = ?', [id]);
    return rows[0];
  }

  async getCreatorByDiscordId(discordId) {
    const [rows] = await this.pool.execute('SELECT * FROM criadores WHERE discord_id = ?', [discordId]);
    return rows[0];
  }

  async checkEmailExists(email) {
    const [rows] = await this.pool.execute('SELECT id FROM criadores WHERE email = ?', [email]);
    return rows.length > 0;
  }

  async checkTelefoneExists(telefone) {
    if (!telefone) return false;
    const [rows] = await this.pool.execute('SELECT id FROM criadores WHERE telefone = ?', [telefone]);
    return rows.length > 0;
  }

  async checkDiscordIdExists(discordId) {
    const [rows] = await this.pool.execute('SELECT id FROM criadores WHERE discord_id = ?', [discordId]);
    return rows.length > 0;
  }

  async checkGameIdExists(gameId) {
    const [rows] = await this.pool.execute('SELECT id FROM criadores WHERE game_id = ?', [gameId]);
    return rows.length > 0;
  }

  async authenticateCreator(game_id, password) {
    const [rows] = await this.pool.execute('SELECT * FROM criadores WHERE game_id = ?', [game_id]);
    const creator = rows[0];
    
    if (!creator) return null;
    
    if (password !== creator.password) return null; // REMOVIDO bcrypt.compare
    return creator;
  }

  async getCreatorWithArea(id) {
    // Buscar criador
    const [criadorRows] = await this.pool.execute('SELECT * FROM criadores WHERE id = ?', [id]);
    const criador = criadorRows[0];
    if (!criador) return null;
    // Buscar áreas
    const [areasRows] = await this.pool.execute(`
      SELECT a.* FROM areas a
      WHERE JSON_CONTAINS(?, CAST(a.id AS CHAR))
    `, [criador.areas_ids]);
    criador.areas = areasRows;
    return criador;
  }

  async updateCreatorCouponId(creatorId, cupomId) {
    await this.pool.execute(
      'UPDATE criadores SET cupom_id = ? WHERE id = ?',
      [cupomId, creatorId]
    );
  }

  async getCreatorResponses(id) {
    const [rows] = await this.pool.execute('SELECT respostas FROM criadores WHERE id = ?', [id]);
    return rows[0] ? JSON.parse(rows[0].respostas) : null;
  }

  async getConteudosAprovadosByCriador(criadorId) {
    const [rows] = await this.pool.execute('SELECT * FROM conteudos WHERE criador_id = ? AND status = "aprovado"', [criadorId]);
    return rows;
  }

  async getConteudosPendentesByCriador(criadorId) {
    const [rows] = await this.pool.execute('SELECT * FROM conteudos WHERE criador_id = ? AND status = "pendente"', [criadorId]);
    return rows;
  }

  async getConteudosByCriador(criadorId) {
    const [rows] = await this.pool.execute('SELECT * FROM conteudos WHERE criador_id = ? ORDER BY created_at DESC', [criadorId]);
    return rows;
  }

  async getValorGanhoConteudoMonetizado(criadorId) {
    try {
      // Buscar criador para obter os valores de contrato e dados
      const [criadorRows] = await this.pool.execute('SELECT valor_hora_live, valor_10k_visualizacao, valor_indicacao, horas_live, indicados, visualizacoes FROM criadores WHERE id = ?', [criadorId]);
      if (criadorRows.length === 0) return 0;
      
      const criador = criadorRows[0];
      const valorHoraLive = parseFloat(criador.valor_hora_live || 0);
      const valor10kVisualizacao = parseFloat(criador.valor_10k_visualizacao || 0);
      const valorIndicacao = parseFloat(criador.valor_indicacao || 0);
      
      // Usar dados do banco (mesma fórmula do painel de admin)
      const totalHorasLive = parseFloat(criador.horas_live || 0);
      const indicados = parseInt(criador.indicados || 0);
      
      // Usar visualizações da tabela criadores (mais eficiente)
      const totalVisualizacoesVideo = parseFloat(criador.visualizacoes || 0);
      
      let valorTotal = 0;
      
      // Live aprovada (mesma fórmula do admin)
      valorTotal += totalHorasLive * valorHoraLive;
      
      // Vídeos aprovados (mesma fórmula do admin)
      const valorVideo = (totalVisualizacoesVideo / 10000) * valor10kVisualizacao;
      valorTotal += valorVideo;
      
      // Indicações (mesma fórmula do admin)
      valorTotal += indicados * valorIndicacao;
      
      console.log(`💰 Valor ganho calculado para criador ${criadorId}:`, {
        totalHorasLive,
        valorHoraLive,
        valorLive: totalHorasLive * valorHoraLive,
        totalVisualizacoesVideo,
        valor10kVisualizacao,
        valorVideo,
        valorVideoCalculado: `${totalVisualizacoesVideo} ÷ 10.000 × ${valor10kVisualizacao} = ${(totalVisualizacoesVideo / 10000) * valor10kVisualizacao}`,
        indicados,
        valorIndicacao,
        valorIndicacoes: indicados * valorIndicacao,
        valorTotal
      });
      
      return valorTotal;
    } catch (error) {
      console.error('❌ Erro ao calcular valor ganho com conteúdo monetizado:', error);
      return 0;
    }
  }

  async updateCreatorAvatar(id, profile_image) {
    await this.pool.execute(
      'UPDATE criadores SET profile_image = ? WHERE id = ?',
      [profile_image, id]
    );
  }

  async updateCreatorCupom(creatorId, cupomData) {
    await this.pool.execute(
      'UPDATE criadores SET cupom_desconto = ?, cupom_id = ? WHERE id = ?',
      [cupomData.cupom_desconto, cupomData.cupom_id, creatorId]
    );
  }

  async updateCreatorStatus(id, status, observacoes, staffId) {
    await this.pool.execute(
      'UPDATE criadores SET status = ?, observacoes = ?, aprovado_por = ? WHERE id = ?',
      [status, observacoes, staffId, id]
    );
  }

  async updateCreatorAccountStatus(id, status, observacoes, staffId) {
    await this.pool.execute(
      'UPDATE criadores SET status = ?, observacoes = ?, aprovado_por = ? WHERE id = ?',
      [status, observacoes, staffId, id]
    );
  }

  async getConteudoById(id) {
    const [rows] = await this.pool.execute('SELECT * FROM conteudos WHERE id = ?', [id]);
    return rows[0];
  }

  async updateConteudoStatus(id, status, observacoes, staffId) {
    await this.pool.execute(
      'UPDATE conteudos SET status = ?, observacoes = ?, aprovado_por = ? WHERE id = ?',
      [status, observacoes, staffId, id]
    );
  }

  async generateWLCodes(criadorId, quantity) {
    const codes = [];
    
    function gerarCodigo() {
      const prefix = process.env.WL_TAG_PREFIX || 'ALTOASTRAL';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = prefix;
      
      // Adicionar 4 caracteres aleatórios após o prefixo
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      return result;
    }

    for (let i = 0; i < quantity; i++) {
      let code;
      let isUnique = false;
      
      // Gerar código único
      while (!isUnique) {
        code = gerarCodigo();
        const [existingCodes] = await this.pool.execute('SELECT id FROM wl_codes WHERE code = ?', [code]);
        if (existingCodes.length === 0) {
          isUnique = true;
        }
      }
      
      // Inserir código
      await this.pool.execute(
        'INSERT INTO wl_codes (code, criador_id) VALUES (?, ?)',
        [code, criadorId]
      );
      
      codes.push(code);
    }

    console.log(`🎫 ${quantity} código(s) WL gerado(s) por criador ${criadorId}`);
    return codes;
  }

  async initVrpPool() {
    try {
      this.vrpPool = mysql.createPool({
        host: process.env.VRP_DB_HOST || 'localhost',
        port: process.env.VRP_DB_PORT || 3306,
        user: process.env.VRP_DB_USER || 'root',
        password: process.env.VRP_DB_PASSWORD || '',
        database: process.env.VRP_DB_NAME || 'vrp_users',
        charset: 'utf8mb4'
      });
      
      console.log('✅ Pool VRP inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao inicializar pool VRP:', error);
    }
  }

  async checkPlayerExists(playerId) {
    try {
      const [rows] = await this.vrpPool.execute('SELECT id FROM vrp_users WHERE id = ?', [playerId]);
      return rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar jogador:', error);
      return false;
    }
  }

  async useWLCode(code, playerId, playerName, discordUserId = null) {
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 0 && currentHour < 7) {
      throw new Error('Códigos WL não podem ser usados entre 00:00 e 07:00. Tente novamente após as 07:00.');
    }

    // Verificar se o código existe e não foi usado
    const [codeRows] = await this.pool.execute(
      'SELECT * FROM wl_codes WHERE code = ? AND usado = FALSE',
      [code]
    );

    if (codeRows.length === 0) {
      throw new Error('Código inválido ou já usado');
    }

    const wlCode = codeRows[0];

    // Verificar se o jogador existe
    const playerExists = await this.checkPlayerExists(playerId);
    if (!playerExists) {
      throw new Error('ID não encontrado no banco de dados');
    }

    // Verificar se já tem whitelist
    const [playerRows] = await this.vrpPool.execute(
      'SELECT whitelisted FROM vrp_users WHERE id = ?',
      [playerId]
    );

    if (playerRows.length === 0) {
      throw new Error('ID não encontrado no banco de dados');
    }

    if (playerRows[0].whitelisted === 1) {
      throw new Error('Whitelist já está liberada para este jogador');
    }

    // Marcar código como usado
    await this.pool.execute(
      'UPDATE wl_codes SET usado = TRUE, usado_por_id = ?, usado_por_nome = ?, usado_em = NOW() WHERE id = ?',
      [playerId, playerName, wlCode.id]
    );

    // Liberar whitelist
    await this.updatePlayerWL(playerId, playerName);

    // Incrementar indicações do criador
    await this.pool.execute(
      'UPDATE criadores SET indicados = indicados + 1 WHERE id = ?',
      [wlCode.criador_id]
    );

    // Buscar informações do criador para o log
    const [criadorRows] = await this.pool.execute(
      'SELECT nome, discord_id, game_id FROM criadores WHERE id = ?',
      [wlCode.criador_id]
    );
    const criador = criadorRows[0];

    // Enviar log no canal do Discord
    try {
      if (global.discordBot && global.discordBot.client) {
        const channelId = process.env.DISCORD_LOG_CHANNEL_ID || '1144711203847938048';
        const channel = global.discordBot.client.channels.cache.get(channelId);
        if (channel) {
          const embed = {
            color: 0x38a169, // Verde
            title: '✅ WL Liberada com Sucesso!',
            description: `Um novo jogador foi liberado na whitelist!`,
            fields: [
              {
                name: '🎮 Jogador',
                value: playerName,
                inline: true
              },
              {
                name: '🆔 ID',
                value: playerId.toString(),
                inline: true
              },
              {
                name: '🎫 Código',
                value: code,
                inline: true
              },
              {
                name: '👤 Criador Responsável',
                value: criador ? `ID: ${criador.game_id}` : `ID: ${wlCode.criador_id}`,
                inline: true
              },
              {
                name: '📅 Data/Hora',
                value: now.toLocaleString('pt-BR'),
                inline: true
              }
            ],
            footer: {
              text: 'Sistema de Códigos WL'
            },
            timestamp: now
          };

          // Marcar quem clicou no botão (se fornecido) ou o criador
          let mention = '';
          if (discordUserId) {
            mention = `<@${discordUserId}>`;
          } else if (criador && criador.discord_id) {
            mention = `<@${criador.discord_id}>`;
          }
          
          const message = mention ? `${mention} - WL liberada com sucesso!` : 'WL liberada com sucesso!';
          
          await channel.send({ content: message, embeds: [embed] });
          console.log(`📢 Log de WL enviado no canal ${channel.name}`);
        } else {
          console.log('⚠️ Canal de logs não encontrado');
        }
      }
    } catch (discordError) {
      console.error('❌ Erro ao enviar log no Discord:', discordError);
      // Não falhar a operação principal por causa do log
    }

    return { 
      success: true, 
      message: 'Whitelist liberada com sucesso!',
      criador: criador
    };
  }

  async updatePlayerWL(playerId, playerName) {
    try {
      await this.vrpPool.execute(
        'UPDATE vrp_users SET whitelisted = 1 WHERE id = ?',
        [playerId]
      );
      console.log(`✅ Whitelist liberada para ${playerName} (ID: ${playerId})`);
    } catch (error) {
      console.error('Erro ao liberar whitelist:', error);
      throw error;
    }
  }

  async liberarWhitelistPorIndicacao(idJogo) {
    try {
      await this.vrpPool.execute(
        'UPDATE vrp_users SET whitelisted = 1 WHERE id = ?',
        [idJogo]
      );
      console.log(`✅ Whitelist liberada por indicação para ID: ${idJogo}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao liberar whitelist por indicação:', error);
      throw error;
    }
  }

  async updateCreatorXP(creatorId, xp, adminId) {
    const [result] = await this.pool.execute(
      'UPDATE criadores SET xp_acumulado = ? WHERE id = ?',
      [xp, creatorId]
    );
    
    if (result.affectedRows > 0) {
      await this.logAdminAction(adminId, 'UPDATE_XP', 'criadores', creatorId, 
        { xp_anterior: 'N/A' }, { xp_novo: xp });
    }
    
    return result.affectedRows > 0;
  }

  async updateCreatorLevel(creatorId, level, adminId) {
    const [result] = await this.pool.execute(
      'UPDATE criadores SET nivel = ? WHERE id = ?',
      [level, creatorId]
    );
    
    if (result.affectedRows > 0) {
      await this.logAdminAction(adminId, 'UPDATE_LEVEL', 'criadores', creatorId, 
        { nivel_anterior: 'N/A' }, { nivel_novo: level });
    }
    
    return result.affectedRows > 0;
  }

  async updateCreatorBonus(creatorId, bonus, adminId) {
    const [result] = await this.pool.execute(
      'UPDATE criadores SET bonus_acumulado = ? WHERE id = ?',
      [bonus, creatorId]
    );
    
    if (result.affectedRows > 0) {
      await this.logAdminAction(adminId, 'UPDATE_BONUS', 'criadores', creatorId, 
        { bonus_anterior: 'N/A' }, { bonus_novo: bonus });
    }
    
    return result.affectedRows > 0;
  }

  async updateCreatorLastLevelUp(creatorId, date, adminId) {
    const [result] = await this.pool.execute(
      'UPDATE criadores SET ultimo_up_nivel = ? WHERE id = ?',
      [date, creatorId]
    );
    
    if (result.affectedRows > 0) {
      await this.logAdminAction(adminId, 'UPDATE_LAST_LEVEL_UP', 'criadores', creatorId, 
        { data_anterior: 'N/A' }, { data_nova: date });
    }
    
    return result.affectedRows > 0;
  }

  async deleteCreatorCoupon(creatorId, adminId) {
    const creator = await this.getCreatorById(creatorId);
    if (!creator) {
      throw new Error('Criador não encontrado');
    }

    // Deletar cupom na Hydrus.gg
    if (creator.cupom_id) {
      try {
        const HydrusService = require('./hydrus-service');
        const hydrusService = new HydrusService();
        await hydrusService.deleteCoupon(creator.cupom_id);
      } catch (error) {
        console.warn('⚠️ Erro ao deletar cupom na Hydrus.gg:', error.message);
      }
    }

    // Atualizar no banco
    const [result] = await this.pool.execute(
      'UPDATE criadores SET cupom_id = NULL, cupom_desconto = NULL WHERE id = ?',
      [creatorId]
    );
    
    if (result.affectedRows > 0) {
      await this.logAdminAction(adminId, 'DELETE_COUPON', 'criadores', creatorId, 
        { cupom_id: creator.cupom_id, cupom_desconto: creator.cupom_desconto }, 
        { cupom_id: null, cupom_desconto: null });
    }
    
    return { success: true };
  }

  async updateCreatorCoupon(creatorId, newCouponName, adminId) {
    const creator = await this.getCreatorById(creatorId);
    if (!creator) {
      throw new Error('Criador não encontrado');
    }

    // Criar novo cupom na Hydrus.gg
    const HydrusService = require('./hydrus-service');
    const hydrusService = new HydrusService();
    
    const couponPayload = {
      name: newCouponName,
      value: 10,
      is_flat: true,
      minimum: 0,
      remaining: -1,
      is_ephemeral: false,
      partner_commission: 0
    };

    const newCoupon = await hydrusService.createCoupon(couponPayload);
    if (!newCoupon || !newCoupon.id) {
      throw new Error('Erro ao criar cupom na Hydrus.gg');
    }

    // Deletar cupom antigo se existir
    if (creator.cupom_id) {
      try {
        await hydrusService.deleteCoupon(creator.cupom_id);
      } catch (error) {
        console.warn('⚠️ Erro ao deletar cupom antigo:', error.message);
      }
    }

    // Atualizar no banco
    const [result] = await this.pool.execute(
      'UPDATE criadores SET cupom_id = ?, cupom_desconto = ? WHERE id = ?',
      [newCoupon.id, newCouponName, creatorId]
    );
    
    if (result.affectedRows > 0) {
      await this.logAdminAction(adminId, 'UPDATE_COUPON', 'criadores', creatorId, 
        { cupom_id: creator.cupom_id, cupom_desconto: creator.cupom_desconto }, 
        { cupom_id: newCoupon.id, cupom_desconto: newCouponName });
    }
    
    return { success: true, cupom_id: newCoupon.id };
  }

  // Métodos para gerenciamento de admins
  async createAdmin(adminData, adminId = null) {
    try {
      const plainPassword = adminData.password; // REMOVIDO bcrypt.hashSync
      
      const [result] = await this.pool.execute(
        'INSERT INTO staff (username, password, nome, email, nivel, permissoes) VALUES (?, ?, ?, ?, ?, ?)',
        [adminData.username, plainPassword, adminData.nome, adminData.email, adminData.nivel, JSON.stringify(adminData.permissoes || {})]
      );
      
      // Registrar log da ação se adminId for fornecido
      if (adminId) {
        await this.logAdminAction(adminId, 'CREATE_ADMIN', 'staff', result.insertId, null, adminData);
      }
      
      return result.insertId;
    } catch (error) {
      console.error('❌ Erro ao criar admin:', error);
      throw error;
    }
  }

  async getAdmins() {
    try {
      const [rows] = await this.pool.execute(
        'SELECT id, username, nome, email, nivel, permissoes, ativo, created_at, ultimo_login FROM staff ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      console.error('❌ Erro ao buscar admins:', error);
      return [];
    }
  }

  async updateAdminPermissions(adminId, permissoes) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE staff SET permissoes = ? WHERE id = ?',
        [JSON.stringify(permissoes), adminId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Erro ao atualizar permissões do admin:', error);
      return false;
    }
  }

  // Desativar admin
  async deactivateAdmin(adminId) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE staff SET ativo = FALSE WHERE id = ?',
        [adminId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Erro ao desativar admin:', error);
      return false;
    }
  }

  // Desativar staff (alias para deactivateAdmin)
  async deactivateStaff(staffId, adminId) {
    try {
      // Registrar log da ação
      await this.logAdminAction(adminId, 'DEACTIVATE_STAFF', 'staff', staffId, null, { ativo: false });
      
      const [result] = await this.pool.execute(
        'UPDATE staff SET ativo = FALSE WHERE id = ?',
        [staffId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Erro ao desativar staff:', error);
      return false;
    }
  }

  // Métodos para logs
  async logAdminAction(adminId, acao, tabela, registroId, dadosAnteriores, dadosNovos) {
    try {
      const admin = adminId ? await this.getStaffById(adminId) : null;
      
      await this.pool.execute(
        'INSERT INTO admin_logs (admin_id, admin_nome, acao, tabela, registro_id, dados_anteriores, dados_novos, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          adminId,
          admin ? admin.nome : 'Sistema',
          acao,
          tabela,
          registroId,
          dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
          dadosNovos ? JSON.stringify(dadosNovos) : null,
          null, // IP será preenchido pelo middleware
          null  // User agent será preenchido pelo middleware
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao registrar log administrativo:', error);
      // Não falhar a operação principal por causa do log
    }
  }

  async getAdminLogs(filters = {}) {
    try {
      let query = 'SELECT al.*, s.nome as admin_nome FROM admin_logs al LEFT JOIN staff s ON al.admin_id = s.id WHERE 1=1';
      const params = [];

      if (filters.admin_id) {
        query += ' AND al.admin_id = ?';
        params.push(filters.admin_id);
      }

      if (filters.acao) {
        query += ' AND al.acao = ?';
        params.push(filters.acao);
      }

      if (filters.tabela) {
        query += ' AND al.tabela = ?';
        params.push(filters.tabela);
      }

      if (filters.data_inicio) {
        query += ' AND al.created_at >= ?';
        params.push(filters.data_inicio);
      }

      if (filters.data_fim) {
        query += ' AND al.created_at <= ?';
        params.push(filters.data_fim);
      }

      query += ' ORDER BY al.created_at DESC LIMIT 1000';

      const [rows] = await this.pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('❌ Erro ao buscar logs administrativos:', error);
      return [];
    }
  }

  async getStaffById(id) {
    const [rows] = await this.pool.execute(
      'SELECT id, username, nome, email, nivel, permissoes, ativo, created_at, ultimo_login FROM staff WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  async getStaffByUsername(username) {
    const [rows] = await this.pool.execute(
      'SELECT id, username, nome, email, nivel, permissoes, ativo, created_at, ultimo_login FROM staff WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  // Obter todos os staff/admins
  async getAllStaff() {
    try {
      const [rows] = await this.pool.execute(
        'SELECT id, username, nome, email, nivel, permissoes, ativo, created_at, ultimo_login FROM staff ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      console.error('❌ Erro ao buscar todos os staff:', error);
      return [];
    }
  }

  // Atualizar email do criador
  async updateCreatorEmail(creatorId, email) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE criadores SET email = ? WHERE id = ?',
        [email, creatorId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar email do criador:', error);
      return false;
    }
  }

  // Atualizar discord do criador
  async updateCreatorDiscord(creatorId, discordId) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE criadores SET discord_id = ? WHERE id = ?',
        [discordId, creatorId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar discord do criador:', error);
      return false;
    }
  }

  // Atualizar áreas do criador
  async updateCreatorAreas(creatorId, areasIds) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE criadores SET areas_ids = ? WHERE id = ?',
        [JSON.stringify(areasIds), creatorId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar áreas do criador:', error);
      return false;
    }
  }

  // Criar solicitação de saque
  async createSaque(saqueData) {
    try {
      console.log('💰 Criando solicitação de saque:', saqueData);
      console.log('🔍 DEBUG: Valores que serão inseridos:');
      console.log('  - criador_id:', saqueData.criador_id);
      console.log('  - valor_solicitado:', saqueData.valor_solicitado);
      console.log('  - tipo_chave:', saqueData.tipo_chave);
      console.log('  - chave_pix:', saqueData.chave_pix);
      console.log('  - nome_beneficiario:', saqueData.nome_beneficiario);
      console.log('  - status:', saqueData.status);
      console.log('  - data_solicitacao:', saqueData.data_solicitacao);
      console.log('  - horas_live_saque:', saqueData.horas_live_saque || 0);
      console.log('  - indicados_saque:', saqueData.indicados_saque || 0);
      console.log('  - fotos_aprovadas_saque:', saqueData.fotos_aprovadas_saque || 0);
      console.log('  - videos_aprovados_saque:', saqueData.videos_aprovados_saque || 0);
      console.log('  - visualizacoes_saque:', saqueData.visualizacoes_saque || 0);
      console.log('  - valor_vendas_cupom_saque:', saqueData.valor_vendas_cupom_saque || 0);
      console.log('  - cupom_id_saque:', saqueData.cupom_id_saque || null);
      
      const [result] = await this.pool.execute(
        `INSERT INTO saques (
          criador_id, 
          valor_solicitado, 
          tipo_chave, 
          chave_pix, 
          nome_beneficiario, 
          status, 
          data_solicitacao,
          horas_live_saque,
          indicados_saque,
          fotos_aprovadas_saque,
          videos_aprovados_saque,
          visualizacoes_saque,
          valor_vendas_cupom_saque,
          cupom_id_saque
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saqueData.criador_id,
          saqueData.valor_solicitado,
          saqueData.tipo_chave,
          saqueData.chave_pix,
          saqueData.nome_beneficiario,
          saqueData.status,
          saqueData.data_solicitacao,
          saqueData.horas_live_saque || 0,
          saqueData.indicados_saque || 0,
          saqueData.fotos_aprovadas_saque || 0,
          saqueData.videos_aprovados_saque || 0,
          saqueData.visualizacoes_saque || 0,
          saqueData.valor_vendas_cupom_saque || 0,
          saqueData.cupom_id_saque || null
        ]
      );
      
      console.log('✅ Saque criado com sucesso, ID:', result.insertId);
      console.log('🔍 DEBUG: Resultado da inserção:', result);
      return result.insertId;
    } catch (error) {
      console.error('❌ Erro ao criar saque:', error);
      return null;
    }
  }

  // Criar log administrativo
  async createAdminLog(logData) {
    try {
      // Buscar nome do admin se não fornecido
      let adminNome = logData.admin_nome;
      if (!adminNome && logData.admin_id) {
        try {
          const admin = await this.getStaffById(logData.admin_id);
          adminNome = admin ? admin.nome : 'Admin Desconhecido';
        } catch (error) {
          console.warn('⚠️ Erro ao buscar nome do admin:', error.message);
          adminNome = 'Admin Desconhecido';
        }
      }

      await this.pool.execute(
        'INSERT INTO admin_logs (admin_id, admin_nome, acao, tabela, registro_id, dados_anteriores, dados_novos) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          logData.admin_id || null,
          adminNome || 'Admin Desconhecido',
          logData.acao || 'ACAO_DESCONHECIDA',
          logData.tabela || 'tabela_desconhecida',
          logData.registro_id || null,
          logData.dados_anteriores ? JSON.stringify(logData.dados_anteriores) : null,
          logData.dados_novos ? JSON.stringify(logData.dados_novos) : null
        ]
      );
      return true;
    } catch (error) {
      console.error('❌ Erro ao criar log administrativo:', error);
      console.error('📋 Dados do log que falhou:', logData);
      return false;
    }
  }

  // Atualizar valores de contrato e bônus do criador
  async updateCreatorValues(creatorId, values, adminId = null) {
    try {
      console.log('🔧 Atualizando valores do criador:', creatorId, values);
      
      const [result] = await this.pool.execute(
        `UPDATE criadores SET 
          valor_hora_live = ?, 
          valor_10k_visualizacao = ?, 
          valor_indicacao = ?, 
          percentual_cupom = ?, 
          limite_ganhos = ?, 
          bonus_hora_live = ?, 
          bonus_foto = ?, 
          bonus_video = ?,
          contratado = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          values.valor_hora_live || 0.00,
          values.valor_10k_visualizacao || 0.00,
          values.valor_indicacao || 0.00,
          values.percentual_cupom || 0.00,
          values.limite_ganhos || 0.00,
          values.bonus_hora_live || config.defaultCreatorValues.bonus_hora_live,
          values.bonus_foto || config.defaultCreatorValues.bonus_foto,
          values.bonus_video || config.defaultCreatorValues.bonus_video,
          values.contratado || 0,
          creatorId
        ]
      );

      console.log('✅ Resultado da atualização:', result.affectedRows, 'linhas afetadas');
      
      // Log da ação se adminId for fornecido
      if (adminId && result.affectedRows > 0) {
        const admin = await this.getStaffById(adminId);
        if (admin) {
          await this.logAdminAction(
            adminId,
            'UPDATE',
            'criadores',
            creatorId,
            null, // dados anteriores (poderia ser implementado se necessário)
            values
          );
        }
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Erro ao atualizar valores do criador:', error);
      return false;
    }
  }

  // Atualizar metas das áreas do criador
  async updateCreatorMetas(creatorId, metas) {
    try {
      console.log('🔧 Atualizando metas para criador:', creatorId);
      console.log('📊 Metas recebidas:', metas);
      
      // Primeiro, vamos verificar se as colunas de meta existem
      const [columns] = await this.pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'criadores' 
        AND TABLE_SCHEMA = DATABASE()
      `);
      
      const columnNames = columns.map(col => col.COLUMN_NAME);
      console.log('📋 Colunas disponíveis:', columnNames);
      
      // Mapear nomes das áreas para colunas de meta
      const metaUpdates = {};
      
      for (const [areaId, metaData] of Object.entries(metas)) {
        const areaName = metaData.area_name.toLowerCase();
        const metaValue = metaData.meta_value;
        
        console.log(`🔍 Processando área: ${areaName} (ID: ${areaId}) = ${metaValue}`);
        
        if (areaName.includes('live')) {
          metaUpdates.meta_horas_live = metaValue;
          console.log(`✅ Mapeado para meta_horas_live: ${metaValue}`);
        } else if (areaName.includes('foto')) {
          metaUpdates.meta_fotos = metaValue;
          console.log(`✅ Mapeado para meta_fotos: ${metaValue}`);
        } else if (areaName.includes('video') || areaName.includes('vídeo')) {
          metaUpdates.meta_videos = metaValue;
          console.log(`✅ Mapeado para meta_videos: ${metaValue}`);
        } else {
          console.log(`⚠️ Área não mapeada: ${areaName}`);
        }
      }
      
      // Construir query dinâmica baseada nas colunas que existem
      const updateFields = [];
      const updateValues = [];
      
      for (const [field, value] of Object.entries(metaUpdates)) {
        if (columnNames.includes(field)) {
          updateFields.push(`${field} = ?`);
          updateValues.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        console.log('⚠️ Nenhuma coluna de meta encontrada para atualizar');
        return true;
      }
      
      updateValues.push(creatorId);
      
      const query = `
        UPDATE criadores 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const [result] = await this.pool.execute(query, updateValues);
      
      console.log(`✅ Metas atualizadas para criador ${creatorId}:`, metaUpdates);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Erro ao atualizar metas do criador:', error);
      return false;
    }
  }

  // Verificar e adicionar colunas faltantes na tabela criadores
  async verifyAndAddMissingColumns() {
    try {
      console.log('🔍 Verificando colunas da tabela criadores...');
      
      // Obter estrutura atual da tabela
      const [columns] = await this.pool.execute('DESCRIBE criadores');
      const existingColumns = columns.map(col => col.Field);
      
      // Colunas que devem existir
      const requiredColumns = [
        {
          name: 'valor_hora_live',
          definition: 'DECIMAL(10,2) DEFAULT 0.00'
        },
        {
          name: 'valor_10k_visualizacao',
          definition: 'DECIMAL(10,2) DEFAULT 0.00'
        },
        {
          name: 'valor_indicacao',
          definition: 'DECIMAL(10,2) DEFAULT 0.00'
        },
        {
          name: 'percentual_cupom',
          definition: 'DECIMAL(5,2) DEFAULT 0.00'
        },
        {
          name: 'limite_ganhos',
          definition: 'DECIMAL(10,2) DEFAULT 0.00'
        },
        {
          name: 'bonus_hora_live',
          definition: 'DECIMAL(10,2) DEFAULT 5.00'
        },
        {
          name: 'bonus_foto',
          definition: 'DECIMAL(10,2) DEFAULT 7.00'
        },
        {
          name: 'bonus_video',
          definition: 'DECIMAL(10,2) DEFAULT 10.00'
        },
        {
          name: 'meta_horas_live',
          definition: 'INT DEFAULT 50'
        },
        {
          name: 'meta_fotos',
          definition: 'INT DEFAULT 30'
        },
        {
          name: 'meta_videos',
          definition: 'INT DEFAULT 20'
        },
        {
          name: 'contratado',
          definition: 'TINYINT(1) DEFAULT 0'
        },
        {
          name: 'fotos_aprovadas',
          definition: 'INT DEFAULT 0'
        },
        {
          name: 'videos_aprovados',
          definition: 'INT DEFAULT 0'
        },
        {
          name: 'visualizacoes',
          definition: 'INT DEFAULT 0'
        }
      ];
      
      let columnsAdded = 0;
      
      // Verificar e adicionar colunas faltantes
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          try {
            await this.pool.execute(`ALTER TABLE criadores ADD COLUMN ${column.name} ${column.definition}`);
            console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
            columnsAdded++;
          } catch (error) {
            console.log(`⚠️ Erro ao adicionar coluna ${column.name}:`, error.message);
          }
        } else {
          console.log(`ℹ️ Coluna ${column.name} já existe`);
        }
      }
      
      if (columnsAdded > 0) {
        console.log(`✅ ${columnsAdded} colunas foram adicionadas à tabela criadores`);
        
        // Atualizar valores padrão para criadores existentes
        console.log('🔄 Atualizando valores padrão para criadores existentes...');
        await this.pool.execute(`
          UPDATE criadores SET 
            valor_hora_live = 0.00,
            valor_10k_visualizacao = 0.00,
            valor_indicacao = 0.00,
            percentual_cupom = 0.00,
            limite_ganhos = 0.00,
            bonus_hora_live = 5.00,
            bonus_foto = 7.00,
            bonus_video = 10.00,
            meta_horas_live = 50,
            meta_fotos = 30,
            meta_videos = 20,
            contratado = 0,
            fotos_aprovadas = 0,
            videos_aprovados = 0
          WHERE valor_hora_live IS NULL 
             OR bonus_hora_live IS NULL
             OR contratado IS NULL
             OR meta_horas_live IS NULL
             OR fotos_aprovadas IS NULL
             OR videos_aprovados IS NULL
        `);
        console.log('✅ Valores padrão atualizados');
        
        // Atualizar metas padrão para criadores existentes que ainda têm 0
        console.log('🔄 Atualizando metas padrão para criadores existentes...');
        await this.pool.execute(`
          UPDATE criadores SET 
            meta_horas_live = 50,
            meta_fotos = 30,
            meta_videos = 20
          WHERE meta_horas_live = 0 
             AND meta_fotos = 0 
             AND meta_videos = 0
        `);
        console.log('✅ Metas padrão atualizadas para criadores existentes');
      } else {
        console.log('✅ Todas as colunas necessárias já existem');
        
        // Mesmo sem adicionar colunas, verificar se há criadores com metas 0
        console.log('🔄 Verificando criadores com metas zeradas...');
        const [result] = await this.pool.execute(`
          UPDATE criadores SET 
            meta_horas_live = 50,
            meta_fotos = 30,
            meta_videos = 20
          WHERE meta_horas_live = 0 
             AND meta_fotos = 0 
             AND meta_videos = 0
        `);
        if (result.affectedRows > 0) {
          console.log(`✅ ${result.affectedRows} criadores tiveram metas atualizadas para valores padrão`);
        } else {
          console.log('ℹ️ Nenhum criador precisou ter metas atualizadas');
        }
      }
      
      // Verificar colunas da tabela saques
      console.log('🔍 Verificando colunas da tabela saques...');
      
      const [saquesColumns] = await this.pool.execute('DESCRIBE saques');
      const existingSaquesColumns = saquesColumns.map(col => col.Field);
      
      const requiredSaquesColumns = [
        {
          name: 'horas_live_saque',
          definition: 'DECIMAL(10,2) DEFAULT 0'
        },
        {
          name: 'indicados_saque',
          definition: 'INT DEFAULT 0'
        },
        {
          name: 'fotos_aprovadas_saque',
          definition: 'INT DEFAULT 0'
        },
        {
          name: 'videos_aprovados_saque',
          definition: 'INT DEFAULT 0'
        },
        {
          name: 'visualizacoes_saque',
          definition: 'INT DEFAULT 0'
        },
        {
          name: 'valor_vendas_cupom_saque',
          definition: 'DECIMAL(10,2) DEFAULT 0'
        },
        {
          name: 'cupom_id_saque',
          definition: 'INT NULL'
        }
      ];
      
      let saquesColumnsAdded = 0;
      
      for (const column of requiredSaquesColumns) {
        if (!existingSaquesColumns.includes(column.name)) {
          try {
            await this.pool.execute(`ALTER TABLE saques ADD COLUMN ${column.name} ${column.definition}`);
            console.log(`✅ Coluna ${column.name} adicionada à tabela saques`);
            saquesColumnsAdded++;
          } catch (error) {
            console.log(`⚠️ Erro ao adicionar coluna ${column.name} à tabela saques:`, error.message);
          }
        } else {
          console.log(`ℹ️ Coluna ${column.name} já existe na tabela saques`);
        }
      }
      
      if (saquesColumnsAdded > 0) {
        console.log(`✅ ${saquesColumnsAdded} colunas foram adicionadas à tabela saques`);
      } else {
        console.log('ℹ️ Todas as colunas necessárias já existem na tabela saques');
      }
      
      console.log('✅ Verificação de colunas da tabela saques concluída');
      
    } catch (error) {
      console.error('❌ Erro ao verificar/adicionar colunas:', error);
    }
  }

  async updateWLCodesTableStructure() {
    try {
      console.log('🔍 Verificando estrutura da tabela wl_codes...');
      
      // Verificar se a coluna code tem o tamanho correto
      const [columns] = await this.pool.execute('DESCRIBE wl_codes');
      const codeColumn = columns.find(col => col.Field === 'code');
      
      if (codeColumn && codeColumn.Type.includes('varchar(8)')) {
        console.log('🔄 Atualizando tamanho da coluna code na tabela wl_codes...');
        await this.pool.execute('ALTER TABLE wl_codes MODIFY COLUMN code VARCHAR(20) NOT NULL UNIQUE');
        console.log('✅ Coluna code atualizada para VARCHAR(20)');
      } else {
        console.log('ℹ️ Coluna code já está com o tamanho correto');
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar estrutura da tabela wl_codes:', error);
    }
  }
}

module.exports = Database; 