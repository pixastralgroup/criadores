-- Script para verificar e adicionar a coluna postado na tabela conteudos

-- Verificar se a coluna postado existe
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'bot_criador' 
AND TABLE_NAME = 'conteudos' 
AND COLUMN_NAME = 'postado';

-- Se não existir, adicionar a coluna
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS postado BOOLEAN DEFAULT FALSE AFTER status;

-- Verificar a estrutura da tabela
DESCRIBE conteudos;

-- Verificar alguns registros para ver se a coluna está funcionando
SELECT id, tipo, status, postado, created_at FROM conteudos LIMIT 5; 