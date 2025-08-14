# 💰 Sistema de Saque para Criadores

## 📋 Visão Geral
Sistema completo para gerenciamento de solicitações de saque dos criadores contratados que atingiram suas metas.

## 🎯 Funcionalidades Principais

### 1. **Solicitação de Saque pelo Criador**
- ✅ Botão "Efetuar Saque" aparece quando todas as metas são atingidas
- ✅ Modal com formulário para dados PIX
- ✅ Validação de campos obrigatórios
- ✅ Confirmação com prazo de 10 dias úteis

### 2. **Painel Administrativo de Pagamentos**
- ✅ Nova aba "Pagamentos" no painel admin
- ✅ Lista completa de todas as solicitações
- ✅ Estatísticas em tempo real (pendentes, aprovados, pagos, rejeitados)
- ✅ Filtros por status e busca por nome
- ✅ Ações específicas por status

### 3. **Processo de Solicitação de Saque**
- ✅ **Salvamento de Progressos**: Ao solicitar um saque, o sistema salva automaticamente:
  - Horas de live
  - Número de indicados
  - Fotos aprovadas
  - Vídeos aprovados
  - Visualizações
  - Valor das vendas do cupom (buscado da API da Hydrus)
  - ID do cupom atual

- ✅ **Zeramento de Progressos**: Após salvar, todos os progressos são zerados:
  - `horas_live = 0`
  - `fotos_aprovadas = 0`
  - `videos_aprovados = 0`
  - `indicados = 0`
  - `visualizacoes = 0`
  - *Valor das vendas do cupom é sempre buscado da API da Hydrus*

- ✅ **Recriação de Cupom**: Processo automático:
  - Deleta cupom antigo da Hydrus.gg
  - Aguarda 2 segundos
  - Cria novo cupom com mesmo nome
  - Atualiza `cupom_id` no banco

### 4. **Processo de Aprovação de Saque**
- ✅ **Aprovação Simples**: Admin apenas aprova o saque
- ✅ **Status Alterado**: De "pendente" para "aprovado"
- ✅ **Log de Aprovação**: Registra quem aprovou e quando

### 5. **Visualização de Histórico**
- ✅ Linha expandida mostra progressos salvos no momento do saque
- ✅ Informações visíveis para saques aprovados e pagos
- ✅ Layout responsivo para mobile

## 🗄️ Estrutura do Banco de Dados

### Tabela `saques`
```sql
CREATE TABLE saques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  criador_id INT NOT NULL,
  valor_solicitado DECIMAL(10,2) NOT NULL,
  tipo_chave ENUM('cpf', 'cnpj', 'email', 'telefone', 'aleatoria') NOT NULL,
  chave_pix VARCHAR(255) NOT NULL,
  nome_beneficiario VARCHAR(255) NOT NULL,
  status ENUM('pendente', 'aprovado', 'pago', 'rejeitado') DEFAULT 'pendente',
  data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_aprovacao TIMESTAMP NULL,
  data_pagamento TIMESTAMP NULL,
  observacoes TEXT,
  aprovado_por INT,
  -- Campos para salvar informações do criador no momento do saque
  horas_live_saque DECIMAL(10,2) DEFAULT 0,
  indicados_saque INT DEFAULT 0,
  fotos_aprovadas_saque INT DEFAULT 0,
  videos_aprovados_saque INT DEFAULT 0,
  visualizacoes_saque INT DEFAULT 0,
  valor_vendas_cupom_saque DECIMAL(10,2) DEFAULT 0,
  cupom_id_saque INT NULL,
  FOREIGN KEY (criador_id) REFERENCES criadores(id) ON DELETE CASCADE,
  FOREIGN KEY (aprovado_por) REFERENCES staff(id) ON DELETE SET NULL
)
```

## 🔄 Fluxo de Aprovação

### 1. **Saque Pendente**
- Criador solicita saque
- Admin vê na lista de pendentes
- Botões disponíveis: Ver, Aprovar, Rejeitar

### 2. **Solicitação de Saque (Processo Completo)**
```
1. Criador clica em "Efetuar Saque"
2. Sistema valida metas e valor disponível
3. Sistema busca valor das vendas do cupom da API da Hydrus
4. Sistema salva progressos atuais do criador + valor das vendas
5. Sistema zera todos os progressos
6. Sistema deleta cupom antigo da Hydrus
7. Sistema aguarda 2 segundos
8. Sistema cria novo cupom com mesmo nome
9. Sistema atualiza cupom_id no banco
10. Sistema cria registro de saque com status "pendente"
```

### 3. **Aprovação (Processo Simples)**
```
1. Admin clica em "Aprovar"
2. Sistema altera status de "pendente" para "aprovado"
3. Sistema registra quem aprovou e quando
4. Sistema cria log da aprovação
```

### 4. **Saque Aprovado**
- Botões disponíveis: Ver, Marcar como Pago
- Linha expandida mostra progressos salvos
- Criador pode solicitar novo saque quando atingir metas novamente

### 5. **Saque Pago**
- Botão disponível: Ver
- Processo finalizado

## 🛠️ API Endpoints

### **GET /api/admin/saques**
- Lista todas as solicitações com estatísticas
- Inclui dados do criador (nome, email)

### **GET /api/admin/saques/:id**
- Detalhes completos de um saque específico

### **POST /api/creators/saque**
- **Funcionalidade Principal**: Cria solicitação de saque e executa processo completo
- Valida metas e valor disponível
- Busca valor das vendas da API da Hydrus
- Salva progressos + valor das vendas, zera criador, recria cupom
- Retorna confirmação de sucesso

### **POST /api/admin/saques/:id/aprovar**
- **Funcionalidade Principal**: Aprova saque existente
- Apenas altera status de "pendente" para "aprovado"
- Registra admin que aprovou e data/hora
- Retorna mensagem de sucesso

### **POST /api/admin/saques/:id/rejeitar**
- Rejeita saque com motivo
- Não afeta progressos do criador

### **POST /api/admin/saques/:id/pagar**
- Marca saque como pago
- Processo final

## 🎨 Interface do Usuário

### **Aba de Pagamentos**
- Estatísticas em cards coloridos
- Tabela com ordenação
- Filtros por status e busca
- Botões de ação contextuais

### **Linha de Detalhes**
- Aparece para saques aprovados/pagos
- Mostra progressos salvos no momento
- Design responsivo
- Cores diferenciadas

## 📊 Logs e Auditoria

### **Logs Automáticos**
- Todas as ações são logadas
- Dados anteriores e novos salvos
- Rastreamento completo de mudanças

### **Informações Logadas na Solicitação**
```json
{
  "acao": "SOLICITAR_SAQUE",
  "dados_anteriores": {
    "criador_progresso": {
      "horas_live": 150.5,
      "indicados": 25,
      "fotos_aprovadas": 50,
      "videos_aprovados": 30,
      "visualizacoes": 15000,
      "valor_vendas_cupom_api": 2500.00,
      "cupom_id": 12345
    }
  },
  "dados_novos": {
    "criador_progresso_zerado": true,
    "cupom_recriado": true,
    "saque_criado": true
  }
}
```

### **Informações Logadas na Aprovação**
```json
{
  "acao": "APROVAR_SAQUE",
  "dados_anteriores": {
    "status": "pendente"
  },
  "dados_novos": {
    "status": "aprovado"
  }
}
```

## 🔧 Configurações e Dependências

### **Serviços Externos**
- **Hydrus.gg API**: Para gerenciamento de cupons
- **MySQL**: Banco de dados principal

### **Arquivos Principais**
- `routes/admin.js`: Rotas da API
- `public/staff.html`: Interface administrativa
- `public/staff.js`: Lógica frontend
- `public/staff.css`: Estilos
- `database.js`: Estrutura do banco

## 🚀 Próximas Melhorias Sugeridas

1. **Modal de Detalhes Completo**
   - Histórico completo do criador
   - Gráficos de progresso
   - Comprovantes de pagamento

2. **Notificações Automáticas**
   - E-mail para criador sobre status
   - SMS para pagamentos aprovados
   - Notificações push

3. **Relatórios Avançados**
   - Exportação em PDF/Excel
   - Relatórios mensais/anuais
   - Análise de tendências

4. **Validações Adicionais**
   - Verificação de chave PIX
   - Validação de CPF/CNPJ
   - Limites de valor por período

## ✅ Status Atual
**Sistema 100% Funcional** com todas as funcionalidades principais implementadas e testadas! 🎉 