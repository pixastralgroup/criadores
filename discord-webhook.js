const https = require('https');
const http = require('http');

class DiscordWebhook {
  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
    this.enabled = !!this.webhookUrl;
    
    if (this.enabled) {
      console.log('🔗 Webhook do Discord configurado para logs de erro');
    } else {
      console.log('⚠️ Webhook do Discord não configurado - logs de erro não serão enviados');
    }
  }

  /**
   * Envia uma mensagem para o webhook do Discord
   * @param {Object} options - Opções da mensagem
   * @param {string} options.content - Conteúdo da mensagem
   * @param {Array} options.embeds - Array de embeds
   * @param {string} options.username - Nome do bot (opcional)
   * @param {string} options.avatar_url - URL do avatar (opcional)
   */
  async sendMessage(options) {
    if (!this.enabled) {
      console.log('Webhook desabilitado, mensagem não enviada:', options.content);
      return false;
    }

    try {
      const payload = {
        content: options.content || null,
        embeds: options.embeds || [],
        username: options.username || 'Bot Criador - Logs',
        avatar_url: options.avatar_url || 'https://cdn.discordapp.com/emojis/1234567890.png'
      };

      // Remover campos vazios
      if (!payload.content) delete payload.content;
      if (payload.embeds.length === 0) delete payload.embeds;

      const postData = JSON.stringify(payload);

      const url = new URL(this.webhookUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      return new Promise((resolve, reject) => {
        const req = client.request(requestOptions, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log('✅ Log enviado para Discord com sucesso');
              resolve(true);
            } else {
              console.error('❌ Erro ao enviar log para Discord:', res.statusCode, data);
              resolve(false);
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ Erro de rede ao enviar log para Discord:', error.message);
          resolve(false);
        });

        req.write(postData);
        req.end();
      });

    } catch (error) {
      console.error('❌ Erro ao preparar mensagem para Discord:', error.message);
      return false;
    }
  }

  /**
   * Envia um log de erro para o Discord
   * @param {Error} error - Objeto de erro
   * @param {Object} context - Contexto adicional
   * @param {string} context.endpoint - Endpoint onde ocorreu o erro
   * @param {string} context.user - Usuário que causou o erro
   * @param {Object} context.requestData - Dados da requisição
   * @param {string} context.severity - Severidade do erro (error, warning, info)
   */
  async sendErrorLog(error, context = {}) {
    const {
      endpoint = 'Desconhecido',
      user = 'Desconhecido',
      requestData = {},
      severity = 'error'
    } = context;

    const timestamp = new Date().toISOString();
    const errorMessage = error.message || 'Erro desconhecido';
    const stackTrace = error.stack || 'Stack trace não disponível';

    // Determinar cor baseada na severidade
    const colors = {
      error: 0xFF0000,    // Vermelho
      warning: 0xFFA500,  // Laranja
      info: 0x0099FF      // Azul
    };

    const color = colors[severity] || colors.error;

    // Criar embed
    const embed = {
      title: `🚨 Erro no Sistema - ${severity.toUpperCase()}`,
      description: `**${errorMessage}**`,
      color: color,
      fields: [
        {
          name: '📍 Endpoint',
          value: endpoint,
          inline: true
        },
        {
          name: '👤 Usuário',
          value: user,
          inline: true
        },
        {
          name: '⏰ Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true
        }
      ],
      footer: {
        text: 'Bot Criador - Sistema de Logs'
      },
      timestamp: timestamp
    };

    // Adicionar dados da requisição se disponíveis
    if (Object.keys(requestData).length > 0) {
      const requestDataStr = JSON.stringify(requestData, null, 2);
      if (requestDataStr.length > 1024) {
        embed.fields.push({
          name: '📋 Dados da Requisição',
          value: '```json\n' + requestDataStr.substring(0, 1000) + '...\n```',
          inline: false
        });
      } else {
        embed.fields.push({
          name: '📋 Dados da Requisição',
          value: '```json\n' + requestDataStr + '\n```',
          inline: false
        });
      }
    }

    // Adicionar stack trace se disponível
    if (stackTrace && stackTrace !== 'Stack trace não disponível') {
      const stackTraceStr = stackTrace.length > 1024 
        ? stackTrace.substring(0, 1000) + '...'
        : stackTrace;
      
      embed.fields.push({
        name: '🔍 Stack Trace',
        value: '```\n' + stackTraceStr + '\n```',
        inline: false
      });
    }

    // Enviar mensagem
    await this.sendMessage({
      embeds: [embed]
    });
  }

  /**
   * Envia um log de informação para o Discord
   * @param {string} message - Mensagem informativa
   * @param {Object} context - Contexto adicional
   */
  async sendInfoLog(message, context = {}) {
    const {
      endpoint = 'Desconhecido',
      user = 'Desconhecido'
    } = context;

    const timestamp = new Date().toISOString();

    const embed = {
      title: 'ℹ️ Informação do Sistema',
      description: message,
      color: 0x0099FF, // Azul
      fields: [
        {
          name: '📍 Endpoint',
          value: endpoint,
          inline: true
        },
        {
          name: '👤 Usuário',
          value: user,
          inline: true
        },
        {
          name: '⏰ Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true
        }
      ],
      footer: {
        text: 'Bot Criador - Sistema de Logs'
      },
      timestamp: timestamp
    };

    await this.sendMessage({
      embeds: [embed]
    });
  }

  /**
   * Envia um log de sucesso para o Discord
   * @param {string} message - Mensagem de sucesso
   * @param {Object} context - Contexto adicional
   */
  async sendSuccessLog(message, context = {}) {
    const {
      endpoint = 'Desconhecido',
      user = 'Desconhecido'
    } = context;

    const timestamp = new Date().toISOString();

    const embed = {
      title: '✅ Sucesso do Sistema',
      description: message,
      color: 0x00FF00, // Verde
      fields: [
        {
          name: '📍 Endpoint',
          value: endpoint,
          inline: true
        },
        {
          name: '👤 Usuário',
          value: user,
          inline: true
        },
        {
          name: '⏰ Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true
        }
      ],
      footer: {
        text: 'Bot Criador - Sistema de Logs'
      },
      timestamp: timestamp
    };

    await this.sendMessage({
      embeds: [embed]
    });
  }

  /**
   * Envia um log de warning para o Discord
   * @param {string} message - Mensagem de aviso
   * @param {Object} context - Contexto adicional
   */
  async sendWarningLog(message, context = {}) {
    const {
      endpoint = 'Desconhecido',
      user = 'Desconhecido'
    } = context;

    const timestamp = new Date().toISOString();

    const embed = {
      title: '⚠️ Aviso do Sistema',
      description: message,
      color: 0xFFA500, // Laranja
      fields: [
        {
          name: '📍 Endpoint',
          value: endpoint,
          inline: true
        },
        {
          name: '👤 Usuário',
          value: user,
          inline: true
        },
        {
          name: '⏰ Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true
        }
      ],
      footer: {
        text: 'Bot Criador - Sistema de Logs'
      },
      timestamp: timestamp
    };

    await this.sendMessage({
      embeds: [embed]
    });
  }

  /**
   * Envia um arquivo (imagem, vídeo, etc) para o webhook do Discord
   * @param {Buffer} fileBuffer - Buffer do arquivo
   * @param {string} fileName - Nome do arquivo
   * @param {string} content - Mensagem opcional
   * @returns {Promise<string|null>} - URL do arquivo hospedado no Discord ou null em caso de erro
   */
  async sendFile(fileBuffer, fileName, content = null) {
    console.log('🔄 Iniciando envio de arquivo para Discord:', fileName);
    console.log('📊 Tamanho do arquivo:', fileBuffer.length, 'bytes');
    console.log('🔗 Webhook habilitado:', this.enabled);
    console.log('🌐 URL do webhook:', this.webhookUrl ? 'Configurada' : 'Não configurada');
    
    if (!this.enabled) {
      console.log('❌ Webhook desabilitado, arquivo não enviado:', fileName);
      return null;
    }
    
    if (!fileBuffer || fileBuffer.length === 0) {
      console.log('❌ Buffer do arquivo vazio ou inválido');
      return null;
    }
    
    try {
      const url = new URL(this.webhookUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
      let payload = '';
      if (content) {
        payload += `--${boundary}\r\n`;
        payload += 'Content-Disposition: form-data; name="content"\r\n\r\n';
        payload += content + '\r\n';
      }
      payload += `--${boundary}\r\n`;
      payload += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
      payload += 'Content-Type: application/octet-stream\r\n\r\n';

      const endPayload = `\r\n--${boundary}--\r\n`;

      const payloadBuffer = Buffer.from(payload, 'utf8');
      const endBuffer = Buffer.from(endPayload, 'utf8');
      const totalLength = payloadBuffer.length + fileBuffer.length + endBuffer.length;

      console.log('📦 Preparando requisição multipart:');
      console.log('  - Boundary:', boundary);
      console.log('  - Tamanho total:', totalLength, 'bytes');
      console.log('  - Payload buffer:', payloadBuffer.length, 'bytes');
      console.log('  - File buffer:', fileBuffer.length, 'bytes');
      console.log('  - End buffer:', endBuffer.length, 'bytes');

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': totalLength
        }
      };

      console.log('🌐 Opções da requisição:', {
        hostname: requestOptions.hostname,
        port: requestOptions.port,
        path: requestOptions.path,
        method: requestOptions.method,
        'Content-Type': requestOptions.headers['Content-Type'],
        'Content-Length': requestOptions.headers['Content-Length']
      });

      return new Promise((resolve, reject) => {
        const req = client.request(requestOptions, (res) => {
          console.log('📡 Resposta do Discord recebida:');
          console.log('  - Status:', res.statusCode);
          console.log('  - Headers:', res.headers);
          
          let data = '';
          res.on('data', (chunk) => { 
            data += chunk; 
            console.log('📥 Chunk recebido:', chunk.length, 'bytes');
          });
          res.on('end', () => {
            console.log('✅ Resposta completa do Discord:');
            console.log('  - Tamanho total:', data.length, 'bytes');
            console.log('  - Conteúdo:', data.substring(0, 500) + (data.length > 500 ? '...' : ''));
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const json = JSON.parse(data);
                console.log('📋 JSON parseado:', JSON.stringify(json, null, 2));
                
                if (json && json.attachments && json.attachments[0] && json.attachments[0].url) {
                  console.log('✅ URL do arquivo extraída:', json.attachments[0].url);
                  resolve(json.attachments[0].url);
                } else {
                  console.log('❌ Nenhuma attachment encontrada na resposta');
                  console.log('📋 Estrutura da resposta:', Object.keys(json || {}));
                  resolve(null);
                }
              } catch (e) {
                console.log('❌ Erro ao fazer parse do JSON:', e.message);
                console.log('📄 Dados brutos:', data);
                resolve(null);
              }
            } else {
              console.error('❌ Erro HTTP ao enviar arquivo para Discord:', res.statusCode);
              console.error('📄 Resposta de erro:', data);
              resolve(null);
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('❌ Erro de rede ao enviar arquivo para Discord:', error.message);
          console.error('🔍 Detalhes do erro:', error);
          resolve(null);
        });
        
        console.log('📤 Enviando dados para Discord...');
        req.write(payloadBuffer);
        req.write(fileBuffer);
        req.write(endBuffer);
        req.end();
        console.log('📤 Dados enviados, aguardando resposta...');
      });
    } catch (error) {
      console.error('❌ Erro ao preparar envio de arquivo para Discord:', error.message);
      console.error('🔍 Stack trace:', error.stack);
      return null;
    }
  }

  /**
   * Verifica se o webhook está configurado e funcionando
   */
  async testWebhook() {
    if (!this.enabled) {
      console.log('❌ Webhook não configurado');
      return false;
    }

    try {
      const result = await this.sendInfoLog('🧪 Teste de conectividade do webhook', {
        endpoint: 'TEST',
        user: 'SYSTEM'
      });
      
      // Se chegou até aqui sem erro, o webhook está funcionando
      console.log('✅ Webhook testado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao testar webhook:', error.message);
      return false;
    }
  }
}

module.exports = DiscordWebhook; 