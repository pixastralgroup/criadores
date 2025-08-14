# 🔗 Configuração do Webhook do Discord para Logs

Este sistema envia automaticamente logs de erro, warnings e informações para um canal do Discord através de webhook.

## 📋 Pré-requisitos

- Servidor Discord com permissões de administrador
- Canal onde você quer receber os logs

## 🛠️ Como Configurar

### 1. Criar o Webhook no Discord

1. **Acesse seu servidor Discord**
2. **Vá para o canal** onde você quer receber os logs
3. **Clique com botão direito** no canal
4. **Selecione "Editar Canal"**
5. **Vá para a aba "Integrações"**
6. **Clique em "Webhooks"**
7. **Clique em "Novo Webhook"**
8. **Configure o webhook:**
   - **Nome:** `Bot Criador - Logs`
   - **Avatar:** (opcional) Use um ícone de alerta
   - **Canal:** Selecione o canal onde quer receber os logs
9. **Clique em "Copiar URL do Webhook"**
10. **Clique em "Salvar"**

### 2. Configurar no Arquivo .env

Adicione a seguinte linha ao seu arquivo `.env`:

```env
# Webhook do Discord para logs de erro
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/SEU_WEBHOOK_ID/SEU_WEBHOOK_TOKEN
```

### 3. Reiniciar o Servidor

Após configurar o webhook, reinicie o servidor:

```bash
npm start
```

## 📊 Tipos de Logs Enviados

### 🚨 Erros (Vermelho)
- Erros de banco de dados
- Erros de validação
- Erros de rede
- Erros não tratados
- Erros de sintaxe

### ⚠️ Warnings (Laranja)
- Validações falhadas
- Tentativas de cadastro com dados inválidos
- Cupons já existentes
- Configurações ausentes

### ℹ️ Informações (Azul)
- Inicialização do sistema
- Conexões estabelecidas
- Testes de conectividade

### ✅ Sucessos (Verde)
- Cadastros realizados com sucesso
- Operações concluídas
- Inicializações bem-sucedidas

## 🔧 Testando o Webhook

### Via API
```bash
curl http://localhost:3000/api/test-webhook
```

### Via Navegador
Acesse: `http://localhost:3000/api/test-webhook`

## 📝 Exemplo de Mensagem no Discord

```
🚨 Erro no Sistema - ERROR

**Erro ao criar cupom na Hydrus.gg**

📍 Endpoint: POST /api/creators/cadastro
👤 Usuário: joao@email.com
⏰ Timestamp: 15/01/2024 às 14:30:25

📋 Dados da Requisição
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "discord_id": "123456789012345678",
  "cupom_desconto": "JOAO10"
}
```

🔍 Stack Trace
```
Error: Connection timeout
    at HydrusService.createCoupon (/app/hydrus-service.js:45:12)
    at router.post (/app/routes/creators.js:120:8)
```

Bot Criador - Sistema de Logs
```

## 🛡️ Segurança

- **Dados sensíveis são protegidos:** Senhas e imagens são substituídas por `[PROTEGIDO]` e `[IMAGEM]`
- **Rate limiting:** O sistema não envia logs excessivos
- **Falha silenciosa:** Se o webhook falhar, o sistema continua funcionando normalmente

## 🔧 Configurações Avançadas

### Personalizar Cores
Você pode modificar as cores dos embeds editando o arquivo `discord-webhook.js`:

```javascript
const colors = {
  error: 0xFF0000,    // Vermelho
  warning: 0xFFA500,  // Laranja
  info: 0x0099FF,     // Azul
  success: 0x00FF00   // Verde
};
```

### Filtrar Logs
Para filtrar quais logs são enviados, modifique os middlewares no arquivo `error-logger.js`.

### Múltiplos Webhooks
Para enviar logs para múltiplos canais, você pode criar várias instâncias do `DiscordWebhook` com URLs diferentes.

## 🚨 Troubleshooting

### Webhook não funciona
1. **Verifique a URL:** Certifique-se de que a URL está correta
2. **Teste a conectividade:** Use a rota `/api/test-webhook`
3. **Verifique permissões:** O webhook precisa ter permissão para enviar mensagens
4. **Verifique logs do servidor:** Procure por erros de rede

### Logs não aparecem
1. **Verifique se o webhook está configurado:** Procure pela mensagem "Webhook do Discord configurado"
2. **Verifique o canal:** Certifique-se de que o webhook está no canal correto
3. **Verifique permissões do bot:** O webhook precisa ter permissão para enviar embeds

### Muitos logs
1. **Ajuste a severidade:** Modifique os middlewares para filtrar logs menos importantes
2. **Use warnings em vez de errors:** Para validações, use `logWarning` em vez de `logError`

## 📞 Suporte

Se você tiver problemas com a configuração do webhook:

1. Verifique os logs do servidor
2. Teste a conectividade com `/api/test-webhook`
3. Verifique se a URL do webhook está correta
4. Certifique-se de que o webhook tem as permissões necessárias 