-- Script para verificar dados da tabela conteudos

-- Verificar estrutura da tabela
DESCRIBE conteudos;

-- Verificar se há dados
SELECT COUNT(*) as total_conteudos FROM conteudos;

-- Verificar alguns registros
SELECT id, criador_id, tipo, status, postado, created_at 
FROM conteudos 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar vídeos especificamente
SELECT id, criador_id, tipo, status, postado, created_at 
FROM conteudos 
WHERE tipo = 'video'
ORDER BY created_at DESC;

-- Verificar vídeos não postados
SELECT id, criador_id, tipo, status, postado, created_at 
FROM conteudos 
WHERE tipo = 'video' AND postado = FALSE
ORDER BY created_at DESC; 