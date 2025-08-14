const DiscordWebhook = require('./discord-webhook');

class ErrorLogger {
  constructor() {
    this.webhook = new DiscordWebhook();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Configura handlers globais para capturar erros
   */
  setupGlobalErrorHandlers() {
    // Capturar erros não tratados
    process.on('uncaughtException', (error) => {
      console.error('❌ Erro não tratado:', error);
      this.webhook.sendErrorLog(error, {
        endpoint: 'UNCAUGHT_EXCEPTION',
        user: 'SYSTEM',
        severity: 'error'
      });
    });

    // Capturar rejeições de promises não tratadas
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.webhook.sendErrorLog(error, {
        endpoint: 'UNHANDLED_REJECTION',
        user: 'SYSTEM',
        severity: 'error',
        requestData: { promise: promise.toString() }
      });
    });

    // Capturar erros de sintaxe
    process.on('uncaughtException', (error) => {
      if (error instanceof SyntaxError) {
        console.error('❌ Erro de sintaxe:', error);
        this.webhook.sendErrorLog(error, {
          endpoint: 'SYNTAX_ERROR',
          user: 'SYSTEM',
          severity: 'error'
        });
      }
    });
  }

  /**
   * Middleware para Express que captura erros
   */
  errorHandler() {
    return (error, req, res, next) => {
      // Extrair informações da requisição
      const requestData = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      // Remover dados sensíveis
      if (requestData.body && requestData.body.password) {
        requestData.body.password = '[PROTEGIDO]';
      }
      if (requestData.body && requestData.body.profile_image) {
        requestData.body.profile_image = '[IMAGEM]';
      }

      // Determinar usuário
      let user = 'Desconhecido';
      if (req.user) {
        user = req.user.nome || req.user.username || req.user.id;
      } else if (req.body && req.body.email) {
        user = req.body.email;
      } else if (req.body && req.body.discord_id) {
        user = req.body.discord_id;
      }

      // Enviar log para Discord
      this.webhook.sendErrorLog(error, {
        endpoint: `${req.method} ${req.path}`,
        user: user,
        requestData: requestData,
        severity: 'error'
      });

      // Continuar com o handler de erro padrão
      next(error);
    };
  }

  /**
   * Middleware para capturar erros de validação
   */
  validationErrorHandler() {
    return (error, req, res, next) => {
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        // Log de warning para erros de validação
        this.webhook.sendWarningLog(`Erro de validação: ${error.message}`, {
          endpoint: `${req.method} ${req.path}`,
          user: req.body?.email || req.body?.discord_id || 'Desconhecido',
          requestData: {
            method: req.method,
            url: req.url,
            body: req.body,
            validationError: error.message
          },
          severity: 'warning'
        });
      }
      next(error);
    };
  }

  /**
   * Middleware para capturar erros de banco de dados
   */
  databaseErrorHandler() {
    return (error, req, res, next) => {
      if (error.code === 'ER_DUP_ENTRY' || 
          error.code === 'ER_NO_REFERENCED_ROW_2' ||
          error.code === 'ER_ROW_IS_REFERENCED_2' ||
          error.code === 'ER_BAD_FIELD_ERROR' ||
          error.code === 'ER_PARSE_ERROR') {
        
        this.webhook.sendErrorLog(error, {
          endpoint: `${req.method} ${req.path}`,
          user: req.body?.email || req.body?.discord_id || 'Desconhecido',
          requestData: {
            method: req.method,
            url: req.url,
            body: req.body,
            databaseError: error.message,
            code: error.code
          },
          severity: 'error'
        });
      }
      next(error);
    };
  }

  /**
   * Middleware para capturar erros de rede
   */
  networkErrorHandler() {
    return (error, req, res, next) => {
      if (error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET') {
        
        this.webhook.sendErrorLog(error, {
          endpoint: `${req.method} ${req.path}`,
          user: req.body?.email || req.body?.discord_id || 'Desconhecido',
          requestData: {
            method: req.method,
            url: req.url,
            networkError: error.message,
            code: error.code
          },
          severity: 'error'
        });
      }
      next(error);
    };
  }

  /**
   * Função para logar erros manualmente
   */
  logError(error, context = {}) {
    this.webhook.sendErrorLog(error, context);
  }

  /**
   * Função para logar warnings manualmente
   */
  logWarning(message, context = {}) {
    this.webhook.sendWarningLog(message, context);
  }

  /**
   * Função para logar informações manualmente
   */
  logInfo(message, context = {}) {
    this.webhook.sendInfoLog(message, context);
  }

  /**
   * Função para logar sucessos manualmente
   */
  logSuccess(message, context = {}) {
    this.webhook.sendSuccessLog(message, context);
  }

  /**
   * Testa a conectividade do webhook
   */
  async testWebhook() {
    return await this.webhook.testWebhook();
  }
}

module.exports = ErrorLogger; 