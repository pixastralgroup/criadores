# 🗄️ Configuração MySQL

## 📋 Pré-requisitos

### 1. **Instalar MySQL Server**
- **Windows**: Baixe MySQL Installer do site oficial
- **Linux**: `sudo apt install mysql-server`
- **macOS**: `brew install mysql`

### 2. **Instalar Dependências**
```bash
npm install mysql2
```

## ⚙️ Configuração do MySQL

### 1. **Criar Banco de Dados**
```sql
CREATE DATABASE bot_criador CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. **Criar Usuário (Opcional)**
```sql
CREATE USER 'bot_criador_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON bot_criador.* TO 'bot_criador_user'@'localhost';
FLUSH PRIVILEGES;
```

## 🔧 Configuração no Projeto

### 1. **Arquivo `.env`**
```env
# Configurações do Servidor
PORT=8080
HOST=0.0.0.0

# Configurações de JWT
JWT_SECRET=minha_chave_super_secreta_2024

# Configurações do MySQL
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=bot_criador

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

### 2. **Arquivo `config.js`**
```javascript
// Configurações do MySQL
database: {
  type: 'mysql', // 'mysql' ou 'sqlite'
  
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bot_criador',
    charset: 'utf8mb4',
    
    // Configurações de conexão
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    
    // Configurações de pool
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    }
  }
}
```

## 🗂️ Estrutura das Tabelas MySQL

### 1. **Tabela `areas`**
```sql
CREATE TABLE areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT,
  perguntas JSON,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. **Tabela `staff`**
```sql
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  nivel VARCHAR(50) DEFAULT 'moderador',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. **Tabela `criadores`**
```sql
CREATE TABLE criadores (
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES areas (id),
  FOREIGN KEY (aprovado_por) REFERENCES staff (id)
);
```

### 4. **Tabela `conteudos`**
```sql
CREATE TABLE conteudos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  criador_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  visualizacoes INT DEFAULT 0,
  likes INT DEFAULT 0,
  comentarios INT DEFAULT 0,
  print_video TEXT,
  print_foto TEXT,
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'pendente',
  aprovado_por INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (criador_id) REFERENCES criadores (id),
  FOREIGN KEY (aprovado_por) REFERENCES staff (id)
);
```

## 🚀 Como Usar

### 1. **Configurar MySQL**
```bash
# Conectar ao MySQL
mysql -u root -p

# Criar banco
CREATE DATABASE bot_criador CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Sair
EXIT;
```

### 2. **Configurar Variáveis**
- Edite `.env` com suas credenciais MySQL
- Edite `config.js` se necessário

### 3. **Trocar Database.js**
```bash
# Fazer backup do arquivo atual
cp database.js database-sqlite.js

# Usar versão MySQL
cp database-mysql.js database.js
```

### 4. **Iniciar Servidor**
```bash
npm start
```

## 🔍 Verificar Configuração

### 1. **Testar Conexão**
```bash
npm start
```

### 2. **Verificar Logs**
- ✅ "Conectado ao MySQL com sucesso!"
- ✅ "Tabelas MySQL criadas com sucesso!"

### 3. **Verificar Tabelas**
```sql
USE bot_criador;
SHOW TABLES;
DESCRIBE areas;
DESCRIBE staff;
DESCRIBE criadores;
DESCRIBE conteudos;
```

## 🔧 Configurações Avançadas

### **Mudar Host/IP**
```env
DB_HOST=192.168.1.100  # IP específico
DB_HOST=mysql.meuservidor.com  # Domínio
```

### **Mudar Porta**
```env
DB_PORT=3307  # Porta não padrão
```

### **Configurar SSL**
```javascript
mysql: {
  // ... outras configs
  ssl: {
    rejectUnauthorized: false
  }
}
```

### **Configurar Timezone**
```javascript
mysql: {
  // ... outras configs
  timezone: '+00:00'
}
```

## 🚨 Segurança

### **Em Produção:**
1. **Crie usuário específico:**
   ```sql
   CREATE USER 'bot_criador'@'localhost' IDENTIFIED BY 'senha_super_segura';
   GRANT SELECT, INSERT, UPDATE, DELETE ON bot_criador.* TO 'bot_criador'@'localhost';
   ```

2. **Configure firewall:**
   ```bash
   # Permitir apenas conexões locais
   sudo ufw allow from 127.0.0.1 to any port 3306
   ```

3. **Use SSL:**
   ```javascript
   ssl: {
     ca: fs.readFileSync('/path/to/ca.pem'),
     cert: fs.readFileSync('/path/to/cert.pem'),
     key: fs.readFileSync('/path/to/key.pem')
   }
   ```

## 📊 Backup MySQL

### **Fazer Backup:**
```bash
mysqldump -u root -p bot_criador > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Restaurar Backup:**
```bash
mysql -u root -p bot_criador < backup_20231201_143022.sql
```

## 🔄 Migração de SQLite para MySQL

### **1. Exportar dados do SQLite:**
```bash
# Instalar sqlite3 se não tiver
npm install -g sqlite3

# Exportar dados
sqlite3 bot_criador.db ".dump" > dados_sqlite.sql
```

### **2. Converter para MySQL:**
- Remover `AUTOINCREMENT` → `AUTO_INCREMENT`
- Ajustar tipos de dados
- Converter `BOOLEAN` → `TINYINT(1)`

### **3. Importar no MySQL:**
```bash
mysql -u root -p bot_criador < dados_convertidos.sql
```

## ❓ Troubleshooting

### **Erro: "Access denied"**
- Verificar usuário e senha
- Verificar privilégios do usuário
- Verificar se o usuário pode conectar do host

### **Erro: "Connection refused"**
- Verificar se MySQL está rodando
- Verificar porta (3306)
- Verificar firewall

### **Erro: "Database doesn't exist"**
- Criar banco de dados
- Verificar nome do banco em `.env`

### **Erro: "Table doesn't exist"**
- Verificar se as tabelas foram criadas
- Executar `npm start` para criar tabelas automaticamente 