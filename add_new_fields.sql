-- Script para adicionar novos campos à tabela criadores
-- Execute este script se o banco de dados já existir com dados

-- Adicionar novos campos para valores de contrato e bônus
ALTER TABLE criadores 
ADD COLUMN valor_hora_live DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN valor_10k_visualizacao DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN valor_indicacao DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN percentual_cupom DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN limite_ganhos DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN bonus_hora_live DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN bonus_foto DECIMAL(10,2) DEFAULT 7.00,
ADD COLUMN bonus_video DECIMAL(10,2) DEFAULT 10.00;

-- Atualizar registros existentes com valores padrão
UPDATE criadores SET 
valor_hora_live = 0.00,
valor_10k_visualizacao = 0.00,
valor_indicacao = 0.00,
percentual_cupom = 0.00,
limite_ganhos = 0.00,
bonus_hora_live = 5.00,
bonus_foto = 7.00,
bonus_video = 10.00
WHERE valor_hora_live IS NULL;

-- Verificar se os campos foram adicionados corretamente
SELECT 
    id, 
    nome, 
    valor_hora_live,
    valor_10k_visualizacao,
    valor_indicacao,
    percentual_cupom,
    limite_ganhos,
    bonus_hora_live,
    bonus_foto,
    bonus_video
FROM criadores 
LIMIT 5; 