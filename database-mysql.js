const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const { config } = require('./config');

class Database {
  constructor() {
    this.dbType = config.database.type;
    
    if (this.dbType === 'mysql') {
      this.initMySQL();
    } else {
      this.initSQLite();
    }
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

  initSQLite() {
    this.db = new sqlite3.Database(path.join(__dirname, config.database.sqlite.path));
    console.log('✅ Conectado ao SQLite com sucesso!');
  }

  async init() {
    if (this.dbType === 'mysql') {
      await this.initMySQLTables();
    } else {
      this.initSQLiteTables();
    }
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
          nivel VARCHAR(50) DEFAULT 'moderador',
          ativo BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
          area_id INT,
          respostas JSON,
          profile_image TEXT,
          status VARCHAR(50) DEFAULT 'pendente',
          observacoes TEXT,
          aprovado_por INT,
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
          contratado TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (area_id) REFERENCES areas (id),
          FOREIGN KEY (aprovado_por) REFERENCES staff (id)
        )
      `);

      // Tabela de conteúdos dos criadores
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
          FOREIGN KEY (criador_id) REFERENCES criadores (id),
          FOREIGN KEY (aprovado_por) REFERENCES staff (id)
        )
      `);

      // Verificar e adicionar colunas faltantes na tabela criadores
      await this.verifyAndAddMissingColumns();
      
      // Inserir dados padrão
      await this.insertDefaultAreasMySQL();
      await this.insertDefaultStaffMySQL();
      
      console.log('✅ Tabelas MySQL criadas com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao criar tabelas MySQL:', error);
      throw error;
    }
  }

  initSQLiteTables() {
    this.db.serialize(() => {
      // Tabela de áreas de atuação
      this.db.run(`
        CREATE TABLE IF NOT EXISTS areas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL UNIQUE,
          descricao TEXT,
          perguntas TEXT,
          ativo BOOLEAN DEFAULT 1
        )
      `);

      // Tabela de usuários staff
      this.db.run(`
        CREATE TABLE IF NOT EXISTS staff (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          nome TEXT NOT NULL,
          email TEXT NOT NULL,
          nivel TEXT DEFAULT 'moderador',
          ativo BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de criadores
      this.db.run(`
        CREATE TABLE IF NOT EXISTS criadores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          telefone TEXT,
          discord_id TEXT UNIQUE,
          game_id TEXT UNIQUE,
          password TEXT NOT NULL,
          area_id INTEGER,
          respostas TEXT,
          profile_image TEXT,
          status TEXT DEFAULT 'pendente',
          observacoes TEXT,
          aprovado_por INTEGER,
          valor_hora_live REAL DEFAULT 0.00,
          valor_10k_visualizacao REAL DEFAULT 0.00,
          valor_indicacao REAL DEFAULT 0.00,
          percentual_cupom REAL DEFAULT 0.00,
          limite_ganhos REAL DEFAULT 0.00,
          bonus_hora_live REAL DEFAULT 5.00,
          bonus_foto REAL DEFAULT 7.00,
          bonus_video REAL DEFAULT 10.00,
          xp_hora_live INTEGER DEFAULT 17,
          xp_foto INTEGER DEFAULT 25,
          xp_video INTEGER DEFAULT 63,
          contratado INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (area_id) REFERENCES areas (id),
          FOREIGN KEY (aprovado_por) REFERENCES staff (id)
        )
      `);

      // Tabela de conteúdos dos criadores
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conteudos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          criador_id INTEGER NOT NULL,
          tipo TEXT NOT NULL,
          visualizacoes INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          comentarios INTEGER DEFAULT 0,
          print_video TEXT,
          print_foto TEXT,
          observacoes TEXT,
          tempo_live REAL DEFAULT 0,
          link_video TEXT,
          link_foto TEXT,
          status TEXT DEFAULT 'pendente',
          aprovado_por INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (criador_id) REFERENCES criadores (id),
          FOREIGN KEY (aprovado_por) REFERENCES staff (id)
        )
      `);

      // Inserir dados padrão
      this.insertDefaultAreas();
      this.insertDefaultStaff();
    });
  }

  async insertDefaultAreasMySQL() {
    const areas = config.defaultAreas;
    
    for (const area of areas) {
      await this.pool.execute(
        'INSERT IGNORE INTO areas (nome, descricao, perguntas) VALUES (?, ?, ?)',
        [area.nome, area.descricao, JSON.stringify(area.perguntas)]
      );
    }
  }

  async insertDefaultStaffMySQL() {
    const staff = config.defaultStaff;
    const hashedPassword = bcrypt.hashSync(staff.password, 10);

    await this.pool.execute(
      'INSERT IGNORE INTO staff (username, password, nome, email, nivel) VALUES (?, ?, ?, ?, ?)',
      [staff.username, hashedPassword, staff.nome, staff.email, staff.nivel]
    );
  }

  insertDefaultAreas() {
    config.defaultAreas.forEach(area => {
      this.db.run(
        'INSERT OR IGNORE INTO areas (nome, descricao, perguntas) VALUES (?, ?, ?)',
        [area.nome, area.descricao, JSON.stringify(area.perguntas)]
      );
    });
  }

  insertDefaultStaff() {
    const staff = config.defaultStaff;
    const hashedPassword = bcrypt.hashSync(staff.password, 10);

    this.db.run(
      'INSERT OR IGNORE INTO staff (username, password, nome, email, nivel) VALUES (?, ?, ?, ?, ?)',
      [staff.username, hashedPassword, staff.nome, staff.email, staff.nivel]
    );
  }

  // Métodos para áreas
  async getAreas() {
    if (this.dbType === 'mysql') {
      const [rows] = await this.pool.execute('SELECT * FROM areas WHERE ativo = TRUE');
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM areas WHERE ativo = 1', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  async getAreaById(id) {
    if (this.dbType === 'mysql') {
      const [rows] = await this.pool.execute('SELECT * FROM areas WHERE id = ? AND ativo = TRUE', [id]);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        this.db.get('SELECT * FROM areas WHERE id = ? AND ativo = 1', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  }

  // Métodos para criadores
  async createCreator(creator) {
    const hashedPassword = bcrypt.hashSync(creator.password, 10);
    
    if (this.dbType === 'mysql') {
      const [result] = await this.pool.execute(
        'INSERT INTO criadores (nome, email, telefone, discord_id, game_id, password, area_id, respostas, profile_image, valor_hora_live, valor_10k_visualizacao, valor_indicacao, percentual_cupom, limite_ganhos, bonus_hora_live, bonus_foto, bonus_video) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          creator.nome, 
          creator.email, 
          creator.telefone, 
          creator.discord_id, 
          creator.game_id, 
          hashedPassword, 
          creator.area_id, 
          JSON.stringify(creator.respostas), 
          creator.profile_image,
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
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(
          'INSERT INTO criadores (nome, email, telefone, discord_id, game_id, password, area_id, respostas, profile_image, valor_hora_live, valor_10k_visualizacao, valor_indicacao, percentual_cupom, limite_ganhos, bonus_hora_live, bonus_foto, bonus_video) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            creator.nome, 
            creator.email, 
            creator.telefone, 
            creator.discord_id, 
            creator.game_id, 
            hashedPassword, 
            creator.area_id, 
            JSON.stringify(creator.respostas), 
            creator.profile_image,
            creator.valor_hora_live || config.defaultCreatorValues.valor_hora_live,
            creator.valor_10k_visualizacao || config.defaultCreatorValues.valor_10k_visualizacao,
            creator.valor_indicacao || config.defaultCreatorValues.valor_indicacao,
            creator.percentual_cupom || config.defaultCreatorValues.percentual_cupom,
            creator.limite_ganhos || config.defaultCreatorValues.limite_ganhos,
            creator.bonus_hora_live || config.defaultCreatorValues.bonus_hora_live,
            creator.bonus_foto || config.defaultCreatorValues.bonus_foto,
            creator.bonus_video || config.defaultCreatorValues.bonus_video
          ],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }
  }

  async getCreators(status = null) {
    if (this.dbType === 'mysql') {
      let query = `
        SELECT c.*, a.nome as area_nome 
        FROM criadores c 
        LEFT JOIN areas a ON c.area_id = a.id
      `;
      let params = [];

      if (status) {
        query += ' WHERE c.status = ?';
        params.push(status);
      }

      query += ' ORDER BY c.created_at DESC';

      const [rows] = await this.pool.execute(query, params);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        let query = `
          SELECT c.*, a.nome as area_nome 
          FROM criadores c 
          LEFT JOIN areas a ON c.area_id = a.id
        `;
        let params = [];

        if (status) {
          query += ' WHERE c.status = ?';
          params.push(status);
        }

        query += ' ORDER BY c.created_at DESC';

        this.db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  // Métodos para staff
  async authenticateStaff(username, password) {
    if (this.dbType === 'mysql') {
      const [rows] = await this.pool.execute('SELECT * FROM staff WHERE username = ? AND ativo = TRUE', [username]);
      const staff = rows[0];
      
      if (!staff) return null;
      
      const isMatch = await bcrypt.compare(password, staff.password);
      return isMatch ? staff : null;
    } else {
      return new Promise((resolve, reject) => {
        this.db.get('SELECT * FROM staff WHERE username = ? AND ativo = 1', [username], (err, row) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            bcrypt.compare(password, row.password, (err, isMatch) => {
              if (err) reject(err);
              else resolve(isMatch ? row : null);
            });
          }
        });
      });
    }
  }

  // Métodos para conteúdos
  async createConteudo(conteudo) {
    if (this.dbType === 'mysql') {
      const [result] = await this.pool.execute(
        'INSERT INTO conteudos (criador_id, tipo, visualizacoes, likes, comentarios, print_video, print_foto, observacoes, tempo_live, link_video, link_foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [conteudo.criador_id, conteudo.tipo, conteudo.visualizacoes, conteudo.likes, conteudo.comentarios, conteudo.print_video, conteudo.print_foto, conteudo.observacoes, conteudo.tempo_live, conteudo.link_video, conteudo.link_foto]
      );
      return result.insertId;
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(
          'INSERT INTO conteudos (criador_id, tipo, visualizacoes, likes, comentarios, print_video, print_foto, observacoes, tempo_live, link_video, link_foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [conteudo.criador_id, conteudo.tipo, conteudo.visualizacoes, conteudo.likes, conteudo.comentarios, conteudo.print_video, conteudo.print_foto, conteudo.observacoes, conteudo.tempo_live, conteudo.link_video, conteudo.link_foto],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }
  }

  async getAllConteudos() {
    if (this.dbType === 'mysql') {
      const [rows] = await this.pool.execute(`
        SELECT c.*, cr.nome as criador_nome, cr.game_id, a.nome as area_nome 
        FROM conteudos c 
        LEFT JOIN criadores cr ON c.criador_id = cr.id 
        LEFT JOIN areas a ON cr.area_id = a.id 
        ORDER BY c.created_at DESC
      `);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        this.db.all(
          `SELECT c.*, cr.nome as criador_nome, cr.game_id, a.nome as area_nome 
           FROM conteudos c 
           LEFT JOIN criadores cr ON c.criador_id = cr.id 
           LEFT JOIN areas a ON cr.area_id = a.id 
           ORDER BY c.created_at DESC`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    }
  }

  // Adicione outros métodos conforme necessário...

  // Verificar e adicionar colunas faltantes na tabela criadores
  async verifyAndAddMissingColumns() {
    try {
      console.log('🔍 Verificando colunas da tabela criadores...');
      
      if (this.dbType === 'mysql') {
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
            name: 'contratado',
            definition: 'TINYINT(1) DEFAULT 0'
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
              contratado = 0
            WHERE valor_hora_live IS NULL 
               OR bonus_hora_live IS NULL
               OR contratado IS NULL
          `);
          console.log('✅ Valores padrão atualizados');
        } else {
          console.log('✅ Todas as colunas necessárias já existem');
        }
      } else {
        // Para SQLite, verificar se as colunas existem
        console.log('ℹ️ Verificação de colunas para SQLite não implementada');
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar/adicionar colunas:', error);
    }
  }
}

module.exports = new Database(); 