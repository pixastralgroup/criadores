# 📊 Novos Campos na Tabela Criadores

## 🎯 Objetivo
Adicionar campos para controlar valores de contrato e bônus dos criadores de conteúdo.

## 📋 Campos Adicionados

### 💰 Valores de Contrato (Padrão: 0.00)
- **`valor_hora_live`** - Valor por hora de live (DECIMAL(10,2))
- **`valor_10k_visualizacao`** - Valor para cada 10k de visualização no vídeo (DECIMAL(10,2))
- **`valor_indicacao`** - Valor por indicação (DECIMAL(10,2))
- **`percentual_cupom`** - % do que foi vendido no cupom (DECIMAL(5,2))
- **`limite_ganhos`** - Limite de ganhos caso necessário (DECIMAL(10,2))

### 🎁 Valores de Bônus (Padrão conforme especificado)
- **`bonus_hora_live`** - Bônus por 1 hora de live (DECIMAL(10,2)) - **Padrão: 5.00**
- **`bonus_foto`** - Bônus por 1 foto (DECIMAL(10,2)) - **Padrão: 7.00**
- **`bonus_video`** - Bônus por 1 vídeo (DECIMAL(10,2)) - **Padrão: 10.00**

## 🔧 Implementação

### 1. **Arquivos Modificados**
- `database.js` - Tabela MySQL principal
- `database-mysql.js` - Tabelas MySQL e SQLite

### 2. **Método createCreator Atualizado**
O método agora inclui os novos campos com valores padrão:
```javascript
// Valores de contrato (padrão 0.00)
creator.valor_hora_live || 0.00,
creator.valor_10k_visualizacao || 0.00,
creator.valor_indicacao || 0.00,
creator.percentual_cupom || 0.00,
creator.limite_ganhos || 0.00,

// Valores de bônus (padrão conforme especificado)
creator.bonus_hora_live || 5.00,
creator.bonus_foto || 7.00,
creator.bonus_video || 10.00
```

### 3. **Script de Migração**
Arquivo `add_new_fields.sql` para adicionar campos a bancos existentes.

## 🚀 Como Usar

### Para Novos Criadores
Os campos são automaticamente preenchidos com valores padrão durante o cadastro.

### Para Criadores Existentes
Execute o script SQL:
```bash
mysql -u seu_usuario -p seu_banco < add_new_fields.sql
```

### Para Atualizar Valores
Use queries SQL ou implemente métodos específicos:
```sql
UPDATE criadores SET 
valor_hora_live = 50.00,
valor_10k_visualizacao = 25.00,
valor_indicacao = 10.00,
percentual_cupom = 15.00,
limite_ganhos = 1000.00
WHERE id = 1;
```

## 📊 Estrutura da Tabela

```sql
CREATE TABLE criadores (
  -- ... campos existentes ...
  valor_hora_live DECIMAL(10,2) DEFAULT 0.00,
  valor_10k_visualizacao DECIMAL(10,2) DEFAULT 0.00,
  valor_indicacao DECIMAL(10,2) DEFAULT 0.00,
  percentual_cupom DECIMAL(5,2) DEFAULT 0.00,
  limite_ganhos DECIMAL(10,2) DEFAULT 0.00,
  bonus_hora_live DECIMAL(10,2) DEFAULT 5.00,
  bonus_foto DECIMAL(10,2) DEFAULT 7.00,
  bonus_video DECIMAL(10,2) DEFAULT 10.00,
  -- ... outros campos ...
);
```

## ✅ Status
- [x] Campos adicionados à estrutura da tabela
- [x] Método createCreator atualizado
- [x] Script de migração criado
- [x] Documentação criada
- [ ] Interface para editar valores (futuro)
- [ ] Cálculos automáticos de ganhos (futuro) 