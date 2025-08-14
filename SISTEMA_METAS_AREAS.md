# Sistema de Metas por Área - Bot Criador

## 📋 **Visão Geral**

O sistema foi modificado para usar metas baseadas em conteúdos específicos (vídeos, fotos, horas de live) em vez do sistema de XP anterior. Agora cada criador precisa atingir metas específicas em cada área para poder upar de nível.

## 🎯 **Metas por Área**

### **Metas Atuais:**
- **Vídeos:** 10 vídeos aprovados
- **Fotos:** 20 fotos aprovadas  
- **Live:** 50 horas de live aprovadas

### **Regras:**
- ✅ **Apenas as áreas que o criador faz parte** são exibidas
- ✅ **TODAS** as metas das áreas do criador devem ser atingidas para upar de nível
- ✅ Apenas conteúdos **aprovados** contam no progresso
- ✅ Para lives, conta o tempo total em horas
- ✅ Para vídeos e fotos, conta a quantidade de publicações
- ✅ Se o criador não tem áreas selecionadas, mostra mensagem "Nenhuma área selecionada"

## 🎨 **Interface**

### **Barras de Progresso:**
- Cada área tem sua própria barra de progresso
- Cores diferentes para cada tipo:
  - 🔴 **Vídeos:** Vermelho
  - 🔵 **Fotos:** Azul  
  - 🟢 **Live:** Verde

### **Informações Exibidas:**
- Progresso atual vs meta
- Quantidade concluída
- Quantidade restante
- Ícone específico para cada área

## 🔧 **Implementação Técnica**

### **Frontend:**
- `public/creator-dashboard.html`: Estrutura das barras de progresso
- `public/creator-dashboard.css`: Estilos para as barras por área
- `public/creator-dashboard.js`: Lógica de criação e atualização das barras

### **Backend:**
- `routes/creators.js`: Rota `/stats` modificada para retornar conteúdos
- `database.js`: Função `getConteudosByCriador()` para buscar dados

### **Funções Principais:**
```javascript
// Criar barras de progresso por área
createAreasProgress(stats)

// Verificar se pode upar de nível
const podeUpar = Object.entries(metas).every(([tipo, config]) => {
    const atual = contadores[tipo];
    const meta = config.meta;
    return atual >= meta;
});
```

## 📊 **Estrutura de Dados**

### **Resposta da API `/stats`:**
```json
{
  "nivel": 1,
  "conteudos": [
    {
      "id": 1,
      "tipo": "video",
      "status": "aprovado",
      "tempo_live": null
    },
    {
      "id": 2, 
      "tipo": "live",
      "status": "aprovado",
      "tempo_live": 2.5
    }
  ],
  "areas": [
    {
      "id": 1,
      "nome": "Vídeos",
      "descricao": "Criação de vídeos"
    },
    {
      "id": 2,
      "nome": "Live",
      "descricao": "Transmissões ao vivo"
    }
  ]
}
```

### **Mapeamento de Áreas:**
```javascript
// Determinar quais tipos mostrar baseado nas áreas do criador
const tiposParaMostrar = new Set();

areas.forEach(area => {
  const areaName = area.nome.toLowerCase();
  if (areaName.includes('video') || areaName.includes('vídeo')) {
    tiposParaMostrar.add('video');
  }
  if (areaName.includes('foto') || areaName.includes('fotografia')) {
    tiposParaMostrar.add('fotos');
  }
  if (areaName.includes('live') || areaName.includes('stream')) {
    tiposParaMostrar.add('live');
  }
});
```

### **Contadores Calculados:**
```javascript
const contadores = {
  video: conteudos.filter(c => c.tipo === 'video' && c.status === 'aprovado').length,
  fotos: conteudos.filter(c => c.tipo === 'fotos' && c.status === 'aprovado').length,
  live: conteudos.reduce((total, c) => 
    total + (c.tipo === 'live' && c.status === 'aprovado' ? parseFloat(c.tempo_live || 0) : 0), 0)
};
```

## 🚀 **Benefícios**

1. **Personalização:** Cada criador vê apenas suas áreas específicas
2. **Transparência:** Criadores veem exatamente o que precisam fazer
3. **Motivação:** Progresso visual claro por área
4. **Flexibilidade:** Fácil ajuste das metas por área
5. **Clareza:** Sem confusão com cálculos de XP
6. **Foco:** Interface limpa sem áreas irrelevantes

## 🔄 **Próximos Passos**

- [ ] Interface para staff ajustar metas por área
- [ ] Sistema de notificações quando meta é atingida
- [ ] Histórico de progresso por área
- [ ] Metas personalizadas por criador (futuro)

## 📝 **Notas**

- O sistema anterior de XP foi completamente removido
- Todas as referências a XP foram substituídas por metas
- O banner de up de nível agora aparece quando todas as metas são atingidas
- O modal de informações foi atualizado com as novas regras 