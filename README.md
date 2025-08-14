# Cidade Alto Astral - Sistema de Cadastro e Aprovação

Um sistema completo para cadastro de criadores com painel de aprovação para staff.

## 🚀 Funcionalidades

### Para Criadores:
- **Seleção de Área**: Interface intuitiva para escolher entre FOTOS, VÍDEO ou LIVE
- **Formulário Dinâmico**: Perguntas específicas sobre personagem, ID in-game, redes sociais e métricas
- **Consulta de Status**: Verificar status do cadastro por email
- **Interface Responsiva**: Design moderno e adaptável

### Para Staff:
- **Painel de Aprovação**: Interface dedicada para aprovar/rejeitar cadastros
- **Estatísticas em Tempo Real**: Dashboard com métricas atualizadas
- **Filtros e Busca**: Encontrar criadores rapidamente
- **Notificações**: Atualizações em tempo real via Socket.IO
- **Sistema de Login**: Autenticação segura para staff

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express.js
- **Banco de Dados**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Comunicação em Tempo Real**: Socket.IO
- **Autenticação**: JWT (JSON Web Tokens)
- **Criptografia**: bcryptjs
- **Integração**: API Hydrus.gg para cupons de desconto

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório**:
```bash
git clone <url-do-repositorio> 
cd cidade-alto-astral
```

2. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas configurações:
- **Banco de Dados**: MySQL
- **Discord Bot**: Token e Guild ID
- **Hydrus.gg**: Store ID e Token da API

3. **Instale as dependências**:
```bash
npm install
```

4. **Inicie o servidor**:
```bash
npm start
```

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

5. **Acesse a aplicação**:
- **Interface Principal**: http://localhost:8080
- **Painel Staff**: http://localhost:8080/staff.html

## 👤 Credenciais Padrão

### Staff Admin:
- **Usuário**: admin
- **Senha**: admin123

⚠️ **Importante**: Altere essas credenciais em produção!

## 🛍️ Integração com Hydrus.gg

O sistema integra automaticamente com a API da Hydrus.gg para criar cupons de desconto durante o cadastro de criadores.

### Configuração:
1. **Obtenha seu Store ID** na plataforma Hydrus.gg
2. **Gere um token de API** no painel da Hydrus.gg
3. **Configure no arquivo `.env`**:
```env
HYDRUS_STORE_ID=seu_store_id
HYDRUS_TOKEN=seu_token_da_api
```

### Funcionalidades:
- ✅ **Criação automática** de cupons durante o cadastro
- ✅ **Verificação de disponibilidade** do nome do cupom
- ✅ **Sugestões automáticas** se cupom já existe
- ✅ **10% de desconto** para seguidores dos criadores
- ✅ **Uso ilimitado** dos cupons

### Cupom Padrão:
- **Desconto**: 10% (percentual)
- **Uso**: Ilimitado
- **Valor mínimo**: R$ 0
- **Tipo**: Percentual

## 📊 Estrutura do Projeto

```
cidade-alto-astral/
├── index.js              # Servidor principal
├── database.js           # Configuração e operações do banco
├── routes/
│   ├── auth.js          # Rotas de autenticação
│   ├── creators.js      # Rotas para criadores
│   └── staff.js         # Rotas para staff
├── public/
│   ├── index.html       # Página principal
│   ├── staff.html       # Painel de staff
│   ├── styles.css       # Estilos principais
│   ├── staff.css        # Estilos do painel staff
│   ├── script.js        # JavaScript principal
│   └── staff.js         # JavaScript do painel staff
├── package.json
└── README.md
```

## 🎯 Como Usar

### Para Criadores:

1. **Acesse** http://localhost:3000
2. **Selecione** sua área de atuação
3. **Preencha** o formulário com suas informações
4. **Responda** as perguntas específicas da área
5. **Envie** o cadastro
6. **Aguarde** a aprovação da equipe

### Para Staff:

1. **Acesse** http://localhost:3000/staff.html
2. **Faça login** com suas credenciais
3. **Visualize** os cadastros pendentes
4. **Analise** os detalhes de cada criador
5. **Aprove ou rejeite** os cadastros
6. **Adicione observações** se necessário

## 🗄️ Banco de Dados

O sistema utiliza SQLite com as seguintes tabelas:

### `areas`
- Armazena as áreas de atuação disponíveis
- Contém perguntas específicas para cada área

### `criadores`
- Dados dos criadores cadastrados
- Status de aprovação e observações

### `staff`
- Usuários com acesso ao painel de aprovação
- Níveis de permissão

## 🔒 Segurança

- **Senhas criptografadas** com bcryptjs
- **Autenticação JWT** para sessões
- **Validação de dados** no backend
- **Sanitização de inputs**

## 🎨 Personalização

### Adicionar Novas Áreas:

1. Edite o arquivo `database.js`
2. Adicione novas áreas no método `insertDefaultAreas()`
3. Reinicie o servidor

### Modificar Perguntas:

1. Acesse o banco de dados SQLite
2. Atualize o campo `perguntas` na tabela `areas`
3. As perguntas devem estar em formato JSON

## 🚀 Deploy

### Para Produção:

1. **Configure variáveis de ambiente**:
```bash
export JWT_SECRET="sua_chave_secreta_muito_segura"
export PORT=3000
```

2. **Altere as credenciais padrão** no arquivo `database.js`

3. **Configure um proxy reverso** (nginx, Apache)

4. **Use PM2** para gerenciar o processo:
```bash
npm install -g pm2
pm2 start index.js --name "bot-criador"
```

## 📝 API Endpoints

### Autenticação:
- `POST /api/auth/login` - Login do staff
- `GET /api/auth/verify` - Verificar token

### Criadores:
- `GET /api/creators/areas` - Listar áreas
- `GET /api/creators/areas/:id` - Obter área específica
- `POST /api/creators/cadastro` - Cadastrar criador
- `GET /api/creators/status/:email` - Consultar status

### Staff:
- `GET /api/staff/criadores` - Listar criadores
- `GET /api/staff/criadores/:id` - Obter criador específico
- `PUT /api/staff/criadores/:id/status` - Atualizar status
- `GET /api/staff/stats` - Estatísticas

## 🐛 Solução de Problemas

### Erro de Conexão:
- Verifique se o Node.js está instalado
- Confirme se a porta 3000 está disponível

### Erro de Banco de Dados:
- Verifique permissões de escrita no diretório
- Delete o arquivo `bot_criador.db` para recriar o banco

### Problemas de Login:
- Use as credenciais padrão: admin/admin123
- Verifique se o banco foi inicializado corretamente

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato através do email de suporte

---

**Desenvolvido com ❤️ para facilitar o processo de cadastro e aprovação de criadores.** 

-- Copiando estrutura para tabela altoastral.admin_logs
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) DEFAULT NULL,
  `admin_nome` varchar(100) DEFAULT NULL,
  `acao` varchar(100) NOT NULL,
  `tabela` varchar(50) DEFAULT NULL,
  `registro_id` int(11) DEFAULT NULL,
  `dados_anteriores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dados_anteriores`)),
  `dados_novos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dados_novos`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela altoastral.admin_logs: ~0 rows (aproximadamente)
INSERT INTO `admin_logs` (`id`, `admin_id`, `admin_nome`, `acao`, `tabela`, `registro_id`, `dados_anteriores`, `dados_novos`, `ip_address`, `user_agent`, `created_at`) VALUES
	(1, 299, 'Super Administrador', 'UPDATE_XP', 'criadores', 2, NULL, '{"xp_acumulado":null}', NULL, NULL, '2025-07-21 23:14:47'),
	(31, 1, 'Sistema', 'UPDATE', 'criadores', 4, NULL, '"[2,215,3]"', NULL, NULL, '2025-07-22 03:03:35');

-- Copiando estrutura para tabela altoastral.areas
CREATE TABLE IF NOT EXISTS `areas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `perguntas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`perguntas`)),
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=1225 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela altoastral.areas: ~3 rows (aproximadamente)
INSERT INTO `areas` (`id`, `nome`, `descricao`, `perguntas`, `ativo`, `created_at`) VALUES
	(2, 'FOTOS', 'Criação e compartilhamento de fotos do seu personagem', '["Conte a historia do seu personagem?","Link da rede social que vai criar conteudo?","Quantos seguidores você tem?","Já trabalhor para outra cidade, fale quais era os beneficios e pagamentos?"]', 1, '2025-07-20 00:05:01'),
	(3, 'VIDEO', 'Criação e compartilhamento de vídeos do seu personagem', '["Conte a historia do seu personagem?","Link da rede social que vai criar conteudo?","Quantos seguidores você tem?","Já trabalhor para outra cidade, fale quais era os beneficios e pagamentos?"]', 1, '2025-07-20 00:05:01'),
	(215, 'LIVE', 'Transmissões ao vivo de gameplay', '["Conte a historia do seu personagem?","Link da rede social que vai criar conteudo?","Quantos seguidores você tem?","Já trabalhor para outra cidade, fale quais era os beneficios e pagamentos?"]', 1, '2025-07-20 18:36:07');

-- Copiando estrutura para tabela altoastral.conteudos
CREATE TABLE IF NOT EXISTS `conteudos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `criador_id` int(11) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `visualizacoes` int(11) DEFAULT 0,
  `likes` int(11) DEFAULT 0,
  `comentarios` int(11) DEFAULT 0,
  `print_video` text DEFAULT NULL,
  `print_foto` text DEFAULT NULL,
  `observacoes` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pendente',
  `aprovado_por` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tempo_live` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `criador_id` (`criador_id`),
  KEY `aprovado_por` (`aprovado_por`),
  CONSTRAINT `conteudos_ibfk_1` FOREIGN KEY (`criador_id`) REFERENCES `criadores` (`id`),
  CONSTRAINT `conteudos_ibfk_2` FOREIGN KEY (`aprovado_por`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando estrutura para tabela altoastral.staff
CREATE TABLE IF NOT EXISTS `staff` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `nivel` enum('staff','admin','super_admin') DEFAULT 'staff',
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `permissoes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissoes`)),
  `ultimo_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=300 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Copiando dados para a tabela altoastral.staff: ~2 rows (aproximadamente)
INSERT INTO `staff` (`id`, `username`, `password`, `nome`, `email`, `nivel`, `ativo`, `created_at`, `permissoes`, `ultimo_login`) VALUES
	(1, 'admin', '1234', 'Administrador', 'admin@botcriador.com', 'admin', 1, '2025-07-20 00:05:01', '{"gerenciar_criadores":true,"visualizar_logs":true,"editar_xp":true,"editar_nivel":true,"editar_bonus":true,"editar_cupom":true}', NULL),
	(299, 'superadmin', '1234', 'Super Administrador', 'superadmin@exemplo.com', 'super_admin', 1, '2025-07-21 22:56:30', '{"gerenciar_criadores":true,"gerenciar_admins":true,"visualizar_logs":true,"editar_xp":true,"editar_nivel":true,"editar_bonus":true,"editar_cupom":true}', '2025-07-22 00:52:20');

-- Copiando estrutura para tabela altoastral.wl_codes
CREATE TABLE IF NOT EXISTS `wl_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `criador_id` int(11) DEFAULT NULL,
  `used` tinyint(1) DEFAULT 0,
  `used_by_id` int(11) DEFAULT NULL,
  `used_by_name` varchar(255) DEFAULT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `usado` int(11) DEFAULT 0,
  `usado_por_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `criador_id` (`criador_id`),
  CONSTRAINT `wl_codes_ibfk_1` FOREIGN KEY (`criador_id`) REFERENCES `criadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;