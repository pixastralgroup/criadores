# 📋 Configuração do Banco de Dados

## 🗂️ Arquivos de Configuração

### 1. **config.js** - Configurações Principais
```javascript
// Configurações do Banco de Dados
const config = {
  database: {
    path: './bot_criador.db',  // Caminho do arquivo SQLite
    options: {
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      timeout: 30000,
      verbose: true
    }
  },
  
  jwt: {
    secret: 'sua_chave_secreta_aqui_mude_em_producao',
    expiresIn: '7d'
  },
  
  server: {
    port: 3000,
    host: 'localhost'
  },
  
  defaultStaff: {
    username: 'admin',
    password: 'admin123',  // Mude em produção!
    nome: 'Administrador',
    email: 'admin@botcriador.com',
    nivel: 'admin'
  }
};
```

### 2. **.env** - Variáveis de Ambiente
```env
# Configurações do Servidor
PORT=3000
HOST=localhost

# Configurações de JWT
JWT_SECRET=sua_chave_secreta_aqui_mude_em_producao

# Configurações do Banco de Dados
DB_PATH=./bot_criador.db

# Configurações de Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Configurações de Staff Padrão
DEFAULT_STAFF_USERNAME=admin
DEFAULT_STAFF_PASSWORD=admin123
DEFAULT_STAFF_EMAIL=admin@botcriador.com
DEFAULT_STAFF_NOME=Administrador
DEFAULT_STAFF_NIVEL=admin
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas Automaticamente:

#### 1. **areas** - Áreas de Atuação
```sql
CREATE TABLE areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  perguntas TEXT,
  ativo BOOLEAN DEFAULT 1
);
```

#### 2. **staff** - Usuários Staff
```sql
CREATE TABLE staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  nivel TEXT DEFAULT 'moderador',
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **criadores** - Criadores de Conteúdo
```sql
CREATE TABLE criadores (
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
  FOREIGN KEY (area_id) REFERENCES areas (id),
  FOREIGN KEY (aprovado_por) REFERENCES staff (id)
);
```

#### 4. **conteudos** - Conteúdos dos Criadores
```sql
CREATE TABLE conteudos (
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
  FOREIGN KEY (criador_id) REFERENCES criadores (id),
  FOREIGN KEY (aprovado_por) REFERENCES staff (id)
);
```

## ⚙️ Como Configurar

### 1. **Instalar Dependências**
```bash
npm install
```

### 2. **Configurar Variáveis de Ambiente**
- Edite o arquivo `.env` com suas configurações
- **IMPORTANTE**: Mude a `JWT_SECRET` em produção!

### 3. **Configurar Staff Padrão**
Edite em `config.js` ou `.env`:
```javascript
defaultStaff: {
  username: 'seu_usuario',
  password: 'sua_senha_segura',
  nome: 'Seu Nome',
  email: 'seu@email.com',
  nivel: 'admin'
}
```

### 4. **Configurar Áreas de Atuação**
Edite em `config.js`:
```javascript
defaultAreas: [
  {
    nome: 'NOME_DA_AREA',
    descricao: 'Descrição da área',
    perguntas: [
      'Pergunta 1?',
      'Pergunta 2?',
      // ... mais perguntas
    ]
  }
]
```

### 5. **Iniciar o Servidor**
```bash
npm start
```

## 🔧 Configurações Avançadas

### Mudar Banco de Dados
Para usar outro banco SQLite:
1. Edite `config.js`: `path: './novo_banco.db'`
2. Ou edite `.env`: `DB_PATH=./novo_banco.db`

### Mudar Porta do Servidor
1. Edite `config.js`: `port: 8080`
2. Ou edite `.env`: `PORT=8080`

### Configurar Uploads
1. Edite `config.js`:
```javascript
upload: {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png'],
  uploadDir: './meus_uploads'
}
```

## 🚨 Segurança

### Em Produção:
1. **Mude a JWT_SECRET**:
   ```env
   JWT_SECRET=chave_super_secreta_e_complexa_aqui
   ```

2. **Mude as credenciais do staff**:
   ```env
   DEFAULT_STAFF_USERNAME=admin_real
   DEFAULT_STAFF_PASSWORD=senha_super_segura
   ```

3. **Configure HTTPS** se necessário

4. **Configure firewall** para a porta do servidor

## 📊 Backup do Banco

### Fazer Backup:
```bash
cp bot_criador.db backup_$(date +%Y%m%d_%H%M%S).db
```

### Restaurar Backup:
```bash
cp backup_20231201_143022.db bot_criador.db
```

## 🔍 Verificar Configuração

### Testar Conexão:
```bash
npm start
```

### Verificar Logs:
- O servidor deve mostrar: "Servidor rodando na porta 3000"
- Deve criar o arquivo `bot_criador.db` automaticamente

### Acessar:
- **Criadores**: http://localhost:3000
- **Staff**: http://localhost:3000/staff.html
- **Gerenciar Conteúdos**: http://localhost:3000/staff-content.html 