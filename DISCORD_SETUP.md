# 🤖 Configuração do Bot do Discord

## 📋 Pré-requisitos

1. **Servidor Discord** onde o bot será usado
2. **Permissões de Administrador** no servidor
3. **Cargo de Live** criado (ID configurável no .env)
4. **Cargo de WL** criado (ID configurável no .env)

## 🚀 Passo a Passo

### 1. Criar o Bot no Discord Developer Portal

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em **"New Application"**
3. Dê um nome para sua aplicação (ex: "Bot Criador")
4. Vá para a seção **"Bot"**
5. Clique em **"Add Bot"**
6. Copie o **Token** do bot (você precisará dele)

### 2. Configurar Permissões do Bot

1. Na seção **"Bot"**, role para baixo até **"Privileged Gateway Intents"**
2. Ative as seguintes opções:
   - ✅ **Server Members Intent**
   - ✅ **Presence Intent**
   - ✅ **Message Content Intent**

### 3. Configurar Permissões de Aplicação

1. Vá para a seção **"OAuth2"** → **"URL Generator"**
2. Em **"Scopes"**, selecione:
   - ✅ **bot**
   - ✅ **applications.commands**
3. Em **"Bot Permissions"**, selecione:
   - ✅ **Manage Roles**
   - ✅ **Send Messages**
   - ✅ **Read Message History**
   - ✅ **Use Slash Commands**
   - ✅ **Use Application Commands**

### 4. Adicionar o Bot ao Servidor

1. Use a URL gerada no passo anterior
2. Abra a URL no navegador
3. Selecione seu servidor e autorize o bot

### 5. Obter IDs Necessários

#### ID do Servidor (Guild ID)
1. Ative o **Modo Desenvolvedor** no Discord:
   - Configurações → Avançado → Modo Desenvolvedor
2. Clique com botão direito no servidor
3. Clique em **"Copiar ID"**

#### ID do Cargo de Live
1. Vá em **Configurações do Servidor** → **Cargos**
2. Clique com botão direito no cargo de live
3. Clique em **"Copiar ID"**
4. **Configure o ID no arquivo .env como DISCORD_LIVE_ROLE_ID**

#### ID do Cargo de WL
1. Vá em **Configurações do Servidor** → **Cargos**
2. Clique com botão direito no cargo de WL
3. Clique em **"Copiar ID"**
4. **Configure o ID no arquivo .env como DISCORD_WL_ROLE_ID**

#### IDs dos Cargos por Categoria de Criador
**Cargo para Criadores de FOTOS:**
1. Vá em **Configurações do Servidor** → **Cargos**
2. Clique com botão direito no cargo de criadores de fotos
3. Clique em **"Copiar ID"**
4. **Configure o ID no arquivo .env como DISCORD_FOTOS_ROLE_ID**

**Cargo para Criadores de VÍDEO:**
1. Vá em **Configurações do Servidor** → **Cargos**
2. Clique com botão direito no cargo de criadores de vídeo
3. Clique em **"Copiar ID"**
4. **Configure o ID no arquivo .env como DISCORD_VIDEO_ROLE_ID**

**Cargo para Criadores de LIVE:**
1. Vá em **Configurações do Servidor** → **Cargos**
2. Clique com botão direito no cargo de criadores de live
3. Clique em **"Copiar ID"**
4. **Configure o ID no arquivo .env como DISCORD_LIVE_CREATOR_ROLE_ID**

### 6. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`
2. Preencha as variáveis:

### 7. Configurar URL da Loja

Para alterar a URL da loja oficial:

1. **Edite o arquivo `.env`:**
```env
STORE_URL=https://sua-loja-aqui.com/
```

2. **URLs de exemplo:**
```env
# Loja principal
STORE_URL=https://vip.altoastralrp.com/

# Loja de desenvolvimento
STORE_URL=https://dev.altoastralrp.com/

# Loja de teste
STORE_URL=https://test.altoastralrp.com/
```

3. **Reinicie o servidor** após alterar a URL

```env
# Configurações do Bot do Discord
DISCORD_BOT_TOKEN=seu_token_do_bot_aqui
DISCORD_GUILD_ID=id_do_seu_servidor_aqui

# Configurações dos Cargos do Discord
DISCORD_LIVE_ROLE_ID=id_do_cargo_de_live_aqui
DISCORD_WL_ROLE_ID=id_do_cargo_de_wl_aqui

# Cargos por Categoria de Criador
DISCORD_FOTOS_ROLE_ID=id_do_cargo_criadores_fotos
DISCORD_VIDEO_ROLE_ID=id_do_cargo_criadores_video
DISCORD_LIVE_CREATOR_ROLE_ID=id_do_cargo_criadores_live

# Configurações da Loja Oficial
STORE_URL=https://vip.altoastralrp.com/

# Configurações do Banco de Dados do Jogo (vrp_users)
VRP_DB_HOST=localhost
VRP_DB_USER=root
VRP_DB_PASSWORD=sua_senha_aqui
VRP_DB_NAME=vrp_users
VRP_DB_PORT=3306
```

### 7. Configurar Banco de Dados do Jogo

1. **Certifique-se de que o banco `vrp_users` existe**
2. **Verifique se a tabela `vrp_users` tem as colunas:**
   - `id` (INT) - ID do jogador
   - `whitelisted` (INT) - Status da whitelist (0 = não liberada, 1 = liberada)
3. **Configure as credenciais** no arquivo `.env`

### 8. Verificar Configuração

1. Certifique-se de que o cargo de live existe no servidor
2. Verifique se o bot tem permissão para gerenciar cargos
3. O cargo deve estar **abaixo** do cargo do bot na hierarquia

## 🔧 Testando a Configuração

1. Inicie o servidor: `npm start`
2. Verifique os logs:
   ```
   🤖 Bot do Discord conectado como [Nome do Bot]#0000
   🎭 Pronto para gerenciar cargos de live!
   🎫 Pronto para gerenciar códigos de WL!
   ✅ Comandos slash registrados
   ```

## 📨 Sistema de Mensagens Privadas (Embeds)

### 🎉 Embed de Aprovação de Criador:
- **Cor:** Verde (#28a745)
- **Campos:** Status, Categorias, Cargos Concedidos, Observações, Próximos Passos, Suporte, Acesse a Loja Oficial
- **Botão:** 🛍️ Acessar Loja - Direciona para https://vip.altoastralrp.com/
- **Inclui:** Informações sobre cargos concedidos, orientações para começar e acesso à loja oficial

### ❌ Embed de Rejeição de Criador:
- **Cor:** Vermelho (#dc3545)
- **Campos:** Motivo da Rejeição, O que Fazer Agora, Suporte
- **Inclui:** Feedback construtivo e orientações para correção

### 🎬 Embed de Aprovação de Conteúdo:
- **Cor:** Azul (#17a2b8)
- **Campos:** Tipo de Conteúdo, XP Ganho, Bônus Ganho, Feedback, Continue Ativo!, Oportunidades Futuras, Dicas para Crescer, Acesse a Loja Oficial
- **Botão:** 🛍️ Acessar Loja - Direciona para https://vip.altoastralrp.com/
- **Inclui:** 
  - Incentivos para continuar ativo
  - Informações sobre propostas de monetização
  - Dicas para crescimento na plataforma
  - Motivação para manter consistência
  - Acesso direto à loja oficial

### 💎 Incentivos para Monetização:
O sistema envia mensagens motivacionais incluindo:
- **Oportunidades de Parcerias:** Criadores ativos são priorizados
- **Propostas de Monetização:** Conteúdo de qualidade gera propostas
- **Crescimento de XP:** Mais XP = mais oportunidades
- **Reconhecimento da Cidade:** A cidade está sempre de olho nos melhores criadores
- **Dicas de Crescimento:** Consistência, qualidade, criatividade e interação

### 🛍️ Botão da Loja Oficial:
- **URL:** Configurável via `STORE_URL` no arquivo `.env`
- **Padrão:** https://vip.altoastralrp.com/
- **Aparece em:** Embeds de aprovação de criador e conteúdo
- **Função:** Permite acesso direto à loja para usar cupons e resgatar bônus
- **Benefício:** Facilita o uso dos cupons de desconto e acesso aos produtos exclusivos
- **Configuração:** Fácil alteração da URL sem modificar código

3. Use o comando `/criar-painel-wl` no Discord
4. Clique no botão "🎫 Resgatar Código WL"
5. Teste o modal com um código válido
6. Verifique se a WL foi liberada

## 🎭 Sistema de Cargos Automáticos

### Cargos Concedidos Automaticamente:

**Quando um criador é aprovado:**
- ✅ **Cargo de FOTOS** - Para criadores da categoria fotos
- ✅ **Cargo de VÍDEO** - Para criadores da categoria vídeo  
- ✅ **Cargo de LIVE** - Para criadores da categoria live

**Quando uma live é ativada:**
- ✅ **Cargo de Live Temporário** - Concedido por 1 hora

**Quando um código WL é resgatado:**
- ✅ **Cargo de WL** - Permanente para jogadores

### Como Funciona:
1. **Staff aprova** um criador no painel
2. **Sistema verifica** as categorias do criador
3. **Bot concede automaticamente** os cargos correspondentes
4. **Mensagem privada** é enviada para o criador
5. **Logs são registrados** no console do servidor

### Mensagens Privadas (Embeds):
- ✅ **Aprovação de Criador:** Embed verde com informações de aprovação e próximos passos
- ✅ **Rejeição de Criador:** Embed vermelho com motivo da rejeição e orientações
- ✅ **Aprovação de Conteúdo:** Embed azul com XP/bônus ganhos e incentivos para continuar ativo
- ✅ **Cargos:** Informação sobre quais cargos foram concedidos
- ✅ **Observações:** Feedback personalizado da equipe
- ✅ **Incentivos:** Mensagens motivacionais para continuar ativo e receber propostas de monetização

## 🎫 Como Usar o Sistema de Códigos WL

### Para Administradores:
1. **Use o comando:** `/criar-painel-wl` no Discord
2. **Painel será criado** com botão interativo
3. **Jogadores podem clicar** no botão para resgatar códigos

### Para Jogadores:
1. **Clique no botão** "🎫 Resgatar Código WL"
2. **Modal abrirá** com campos para preencher:
   - **Código WL:** Digite o código de 8 caracteres
   - **ID do Jogo:** Digite seu ID numérico
   - **Nome Completo:** Digite seu nome
3. **Clique em "Submit"** para enviar
4. **Aguarde a confirmação** do resgate

### Para Criadores:
1. **Acesse** o painel do criador
2. **Clique** em "Gerar Códigos de WL"
3. **Escolha** quantidade (1-50)
4. **Copie** e distribua os códigos
5. **Monitore** seus indicados no perfil

## 🛠️ Solução de Problemas

### Bot não conecta
- Verifique se o token está correto
- Confirme se as permissões estão ativadas
- Verifique se o bot foi adicionado ao servidor

### Cargo não é concedido
- Verifique se o ID do cargo está correto
- Confirme se o bot tem permissão "Manage Roles"
- O cargo do bot deve estar acima do cargo de live

### Erro de permissões
- Verifique a hierarquia de cargos
- Confirme se o bot tem todas as permissões necessárias

## 📝 Logs Importantes

O sistema registra as seguintes ações:

```
✅ Cargo de live concedido para [Discord ID]
⏰ Cargo será removido em 1 hora
✅ Cargo de live removido de [Discord ID]
```

## 🔒 Segurança

- **Nunca compartilhe** o token do bot
- Use variáveis de ambiente para configurações sensíveis
- Monitore os logs para atividades suspeitas
- Configure permissões mínimas necessárias

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console
2. Confirme todas as configurações
3. Teste com um cargo de teste primeiro 