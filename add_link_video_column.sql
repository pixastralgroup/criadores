-- Script para adicionar as colunas link_video e link_foto na tabela conteudos
-- Execute este script se você já tem um banco de dados existente

-- Para MySQL
ALTER TABLE conteudos ADD COLUMN link_video TEXT AFTER tempo_live;
ALTER TABLE conteudos ADD COLUMN link_foto TEXT AFTER link_video;

-- Para SQLite (se necessário)
-- ALTER TABLE conteudos ADD COLUMN link_video TEXT;
-- ALTER TABLE conteudos ADD COLUMN link_foto TEXT;

-- Verificar se as colunas foram adicionadas
DESCRIBE conteudos; 