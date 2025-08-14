const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { config } = require('./config');

// Caminho do banco de dados SQLite
const dbPath = path.join(__dirname, 'bot_criador.db');

// Criar conexão com SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com SQLite:', err.message);
  } else {
    console.log('✅ Conectado ao SQLite com sucesso!');
  }
});

// Função para executar queries
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Função para executar queries que retornam apenas uma linha
const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Função para executar queries de inserção/atualização
const execute = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ 
          lastID: this.lastID, 
          changes: this.changes 
        });
      }
    });
  });
};

// Função para inicializar o banco de dados
const initDatabase = async () => {
  try {
    console.log('🔄 Inicializando banco de dados SQLite...');

    // Criar tabela de áreas
    await execute(`
      CREATE TABLE IF NOT EXISTS areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        perguntas TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de staff
    await execute(`
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

    // Criar tabela de criadores
    await execute(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        valor_hora_live REAL DEFAULT 0.00,
        valor_10k_visualizacao REAL DEFAULT 0.00,
        valor_indicacao REAL DEFAULT 0.00,
        percentual_cupom REAL DEFAULT 0.00,
        limite_ganhos REAL DEFAULT 0.00,
        bonus_hora_live REAL DEFAULT 5.00,
        bonus_foto REAL DEFAULT 7.00,
        bonus_video REAL DEFAULT 10.00,
        cupom_hydrus TEXT,
        saldo REAL DEFAULT 0.00,
        total_ganhos REAL DEFAULT 0.00,
        FOREIGN KEY (area_id) REFERENCES areas (id),
        FOREIGN KEY (aprovado_por) REFERENCES staff (id)
      )
    `);

    // Criar tabela de conteúdos
    await execute(`
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
        status TEXT DEFAULT 'pendente',
        aprovado_por INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        link_video TEXT,
        postado BOOLEAN DEFAULT 0,
        FOREIGN KEY (criador_id) REFERENCES criadores (id),
        FOREIGN KEY (aprovado_por) REFERENCES staff (id)
      )
    `);

    // Criar tabela de saques
    await execute(`
      CREATE TABLE IF NOT EXISTS saques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        criador_id INTEGER NOT NULL,
        valor REAL NOT NULL,
        metodo_pagamento TEXT NOT NULL,
        dados_pagamento TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        observacoes TEXT,
        processado_por INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (criador_id) REFERENCES criadores (id),
        FOREIGN KEY (processado_por) REFERENCES staff (id)
      )
    `);

    console.log('✅ Tabelas SQLite criadas com sucesso!');

    // Inserir áreas padrão se não existirem
    const areasExistentes = await query('SELECT COUNT(*) as count FROM areas');
    if (areasExistentes[0].count === 0) {
      console.log('🔄 Inserindo áreas padrão...');
      
      for (const area of config.defaultAreas) {
        await execute(
          'INSERT INTO areas (nome, descricao, perguntas) VALUES (?, ?, ?)',
          [area.nome, area.descricao, JSON.stringify(area.perguntas)]
        );
      }
      
      console.log('✅ Áreas padrão inseridas!');
    }

    // Inserir staff padrão se não existir
    const staffExistente = await query('SELECT COUNT(*) as count FROM staff');
    if (staffExistente[0].count === 0) {
      console.log('🔄 Inserindo staff padrão...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(config.defaultStaff.password, 10);
      
      await execute(
        'INSERT INTO staff (username, password, nome, email, nivel) VALUES (?, ?, ?, ?, ?)',
        [
          config.defaultStaff.username,
          hashedPassword,
          config.defaultStaff.nome,
          config.defaultStaff.email,
          config.defaultStaff.nivel
        ]
      );
      
      console.log('✅ Staff padrão inserido!');
    }

    console.log('🎉 Banco de dados inicializado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

// Função para fechar a conexão
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Conexão com SQLite fechada.');
        resolve();
      }
    });
  });
};

module.exports = {
  db,
  query,
  queryOne,
  execute,
  initDatabase,
  closeDatabase
};