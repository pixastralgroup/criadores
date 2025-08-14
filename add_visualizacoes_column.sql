-- Script para adicionar coluna visualizacoes na tabela criadores
-- Execute este script se você já tem um banco de dados existente

USE bot_criador;

-- Adicionar coluna visualizacoes se não existir
ALTER TABLE criadores 
ADD COLUMN IF NOT EXISTS visualizacoes INT DEFAULT 0;

-- Atualizar visualizações existentes baseado nos vídeos já registrados
UPDATE criadores c 
SET visualizacoes = (
    SELECT COALESCE(SUM(ct.visualizacoes), 0)
    FROM conteudos ct 
    WHERE ct.criador_id = c.id 
    AND ct.tipo = 'video'
);

-- Verificar se a coluna foi adicionada
DESCRIBE criadores; 