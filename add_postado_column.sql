-- Script para adicionar a coluna postado na tabela conteudos
-- Execute este script se você já tem um banco de dados existente

-- Para MySQL
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS postado BOOLEAN DEFAULT FALSE AFTER status;

-- Verificar se a coluna foi adicionada
DESCRIBE conteudos; 