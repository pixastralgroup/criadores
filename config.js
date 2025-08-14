const config = {
  // Configurações do MySQL
  database: {
    // Configurações do MySQL
    mysql: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'altoastral',
      charset: 'utf8mb4',
      
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
  },

  // Configurações de JWT
  jwt: {
    // Chave secreta para assinar tokens JWT
    secret: process.env.JWT_SECRET || 'minha_chave_super_secreta_2024',  // Mude aqui!
    
    // Tempo de expiração do token (em segundos)
    expiresIn: '30d' // Mude aqui: '7d' = 7 dias, '30d' = 30 dias, '1h' = 1 hora
  },

  // Configurações do Servidor
  server: {
    // Porta do servidor
    port: process.env.PORT || 3000,  // Mude aqui: 3000, 8080, 5000, etc.
    
    // Host do servidor
    host: process.env.HOST || 'localhost'  // Mude aqui: localhost, 0.0.0.0, IP específico
  },

  // Configurações de Upload
  upload: {
    // Tamanho máximo de arquivo (em bytes)
    maxFileSize: 5 * 1024 * 1024, // 5MB
    
    // Tipos de arquivo permitidos
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // Diretório para salvar uploads
    uploadDir: './uploads'
  },

  // Configurações de Staff Padrão
  defaultStaff: {
    username: 'admin',
    password: 'admin123', // Mude em produção!
    nome: 'Administrador',
    email: 'admin@botcriador.com',
    nivel: 'admin'
  },

  // Configurações de Áreas Padrão
  defaultAreas: [
    {
      nome: 'FOTOS',
      descricao: 'Criação e compartilhamento de fotos do seu personagem',
      perguntas: [
        'Conte a historia do seu personagem?',
        'Link da rede social que vai criar conteudo?',
        'Quantos seguidores você tem?',
        'Já trabalhou para outra cidade, fale quais era os beneficios e pagamentos?'
      ]
    },
    {
      nome: 'VIDEO',
      descricao: 'Criação e compartilhamento de vídeos do seu personagem',
      perguntas: [
        'Conte a historia do seu personagem?',
        'Link da rede social que vai criar conteudo?',
        'Quantos seguidores você tem?',
        'Já trabalhou para outra cidade, fale quais era os beneficios e pagamentos?'
      ]
    },
    {
      nome: 'LIVE',
      descricao: 'Transmissões ao vivo de gameplay',
      perguntas: [
        'Conte a historia do seu personagem?',
        'Link da rede social que vai criar conteudo?',
        'Quantos seguidores você tem?',
        'Já trabalhou para outra cidade, fale quais era os beneficios e pagamentos?'
      ]
    }
  ],

  // Configurações de Valores Padrão para Criadores
  defaultCreatorValues: {
    // Valores de contrato (padrão 0.00 - sem contrato)
    valor_hora_live: 0.00,
    valor_10k_visualizacao: 0.00,
    valor_indicacao: 0.00,
    percentual_cupom: 0.00,
    limite_ganhos: 0.00,
    
    // Valores de bônus (padrão conforme especificado)
    bonus_hora_live: 5.00,
    bonus_foto: 7.00,
    bonus_video: 10.00
  }
};

// Configurações da API Hydrus.gg
const HYDRAUS_CONFIG = {
    apiUrl: 'https://api.hydrus.gg',
    storeId: process.env.HYDRUS_STORE_ID || '5970',
    token: process.env.HYDRUS_TOKEN || '',
    couponSettings: {
        value: 10, // 10% de desconto
        is_flat: false, // Percentual, não valor fixo
        minimum: 0, // Sem valor mínimo
        remaining: null, // Uso ilimitado
        is_ephemeral: false, // Não é descartável
        partner_commission: 0 // Sem comissão de parceiro
    }
};

module.exports = {
    config,
    HYDRAUS_CONFIG
}; 