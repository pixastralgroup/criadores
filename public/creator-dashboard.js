// Configuração do Socket.IO
const socket = io();

// Listener para atualizações de conteúdo
socket.on('content-status-updated', (data) => {
    console.log('🔄 Conteúdo atualizado via Socket.IO:', data);
    // Recarregar estatísticas quando conteúdo for aprovado
    if (data.status === 'aprovado') {
        console.log('✅ Conteúdo aprovado - recarregando estatísticas...');
        loadStats();
        loadContentList();
    }
});

// Elementos do DOM
const contentList = document.getElementById('contentList');
const toast = document.getElementById('toast');

// Verificar se o elemento toast foi encontrado
console.log('🔍 Elemento toast encontrado:', !!toast);
if (!toast) {
    console.error('❌ Elemento toast não encontrado! Verifique se existe <div id="toast" class="toast"></div> no HTML');
}

// Estatísticas
const conteudosAprovados = document.getElementById('conteudos-aprovados');
const conteudosPendentes = document.getElementById('conteudos-pendentes');
const bonusResgate = document.getElementById('bonus-resgate');
const valorVendidoCupom = document.getElementById('valor-vendido-cupom');
const cupomName = document.getElementById('cupom-name');

// Elementos da barra de progresso
const currentLevel = document.getElementById('current-level');
const nextLevel = document.getElementById('next-level');
const levelProgressFill = document.getElementById('level-progress-fill');
const hoursCurrent = document.getElementById('hours-current');
const hoursNeeded = document.getElementById('hours-needed');
const hoursCompleted = document.getElementById('hours-completed');
const hoursRemaining = document.getElementById('hours-remaining');
const daysRemaining = document.getElementById('days-remaining');
const timeRemaining = document.getElementById('time-remaining');

// Elementos do card de progresso
const currentLevelDisplay = document.getElementById('current-level-display');
const nextLevelDisplay = document.getElementById('next-level-display');
const hoursCurrentDisplay = document.getElementById('hours-current-display');
const hoursNeededDisplay = document.getElementById('hours-needed-display');
const progressFillDisplay = document.getElementById('progress-fill-display');

// Variáveis globais
let currentImageData = null;
let currentCreator = null;
let currentPublicationImageData = null;
let currentPublicationFile = null; // NOVA: Variável global para o arquivo da publicação
let currentAvatarFile = null;
let liveTimer = null;
let liveEndTime = null;
let isLiveActive = false;
let cupomButton = null;

// Variáveis para modal de publicação

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando painel do criador...');
    
    // Verificar autenticação
    checkAuth();
    
    // Carregar dados iniciais
    loadCreatorData().then(() => {
        // Só carregar conteúdo e estatísticas se o criador estiver aprovado
        const blockedScreen = document.getElementById('blocked-screen');
        if (blockedScreen.classList.contains('hidden')) {
            loadContentList();
            loadStats();
        }
    });
    
    // Configurar eventos
    setupEventListeners();
    
    // Configurar atualização automática do progresso
    setupProgressUpdate();
    
    // Adicionar event listener para o formulário de publicação
    const newPublicationForm = document.getElementById('newPublicationForm');
    if (newPublicationForm) {
        newPublicationForm.addEventListener('submit', handleNewPublicationSubmit);
    }
    
    // Verificar status quando a página ganha foco (usuário retorna à aba)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('🔄 Página ganhou foco - verificando status...');
            checkCreatorStatus();
        }
    });
    
    console.log('✅ Painel do criador inicializado com sucesso!');
    
    // Carregar rankings
    loadRankings();
});

// Verificar autenticação
function checkAuth() {
    const token = localStorage.getItem('creator_token');
    
    if (!token || token.trim() === '') {
        showToast('❌ Acesso negado. Faça login novamente.', 'error');
        setTimeout(() => {
            window.location.href = '/creator-login.html';
        }, 2000);
        return false;
    }
    
    // Verificar se o token tem formato básico de JWT (3 partes separadas por ponto)
    if (!token.includes('.') || token.split('.').length !== 3) {
        localStorage.removeItem('creator_token');
        showToast('❌ Token inválido. Faça login novamente.', 'error');
        setTimeout(() => {
            window.location.href = '/creator-login.html';
        }, 2000);
        return false;
    }
    
    return true;
}

// Verificar status do criador e mostrar tela de bloqueio se necessário
async function checkCreatorStatus() {
    try {
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const creator = await response.json();
            
            // Verificar se o status é pendente ou suspenso
            if (creator.status === 'pendente' || creator.status === 'suspenso') {
                showBlockedScreen(creator.status);
                return false;
            }
            
            // Se estiver aprovado, esconder tela de bloqueio
            hideBlockedScreen();
            return true;
        } else {
            console.error('❌ Erro ao verificar status do criador');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status do criador:', error);
        return false;
    }
}

// Verificar status apenas quando necessário (após ações específicas)
async function checkStatusIfNeeded() {
    // Só verificar se a tela de bloqueio não estiver visível
    const blockedScreen = document.getElementById('blocked-screen');
    if (!blockedScreen.classList.contains('hidden')) {
        await checkCreatorStatus();
    }
}

// Mostrar tela de bloqueio
function showBlockedScreen(status) {
    const blockedScreen = document.getElementById('blocked-screen');
    const dashboardContent = document.getElementById('dashboard-content');
    const blockedTitle = document.getElementById('blocked-title');
    const blockedMessage = document.getElementById('blocked-message');
    const blockedStatusBadge = document.getElementById('blocked-status-badge');
    
    // Configurar conteúdo baseado no status
    if (status === 'pendente') {
        blockedTitle.textContent = 'Cadastro em Análise';
        blockedMessage.textContent = 'Seu cadastro está sendo analisado pela nossa equipe. Aguarde a aprovação para acessar o painel.';
        blockedStatusBadge.textContent = 'Pendente';
        blockedStatusBadge.className = 'status-badge pending';
    } else if (status === 'suspenso') {
        blockedTitle.textContent = 'Conta Suspensa';
        blockedMessage.textContent = 'Sua conta foi suspensa. Entre em contato com a administração para mais informações.';
        blockedStatusBadge.textContent = 'Suspenso';
        blockedStatusBadge.className = 'status-badge suspended';
    }
    
    // Mostrar tela de bloqueio e esconder dashboard
    blockedScreen.classList.remove('hidden');
    dashboardContent.style.display = 'none';
}

// Esconder tela de bloqueio
function hideBlockedScreen() {
    const blockedScreen = document.getElementById('blocked-screen');
    const dashboardContent = document.getElementById('dashboard-content');
    
    blockedScreen.classList.add('hidden');
    dashboardContent.style.display = 'block';
}

// Configurar event listeners
function setupEventListeners() {
    // Avatar modal
    setupAvatarModal();
    
    // Inicializar botão de criar cupom
    const createCupomBtn = document.getElementById('create-cupom-btn');
    if (createCupomBtn) {
        createCupomBtn.classList.add('hidden'); // Começa escondido
        console.log('🔧 Botão de criar cupom inicializado');
    }
    
    // Adicionar event listener para formulário de saque
    const saqueForm = document.getElementById('saqueForm');
    if (saqueForm) {
        saqueForm.addEventListener('submit', handleSaqueSubmit);
        console.log('🔧 Formulário de saque inicializado');
    }
}

// Configurar atualização automática do progresso
function setupProgressUpdate() {
    // Atualizar progresso a cada 30 segundos
    setInterval(async () => {
        try {
            const token = localStorage.getItem('creator_token');
            const response = await fetch('/api/creators/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const stats = await response.json();
                updateLevelProgress(stats);
                console.log('📊 Progresso de nível atualizado automaticamente');
            }
        } catch (error) {
            console.log('⚠️ Erro ao atualizar progresso:', error);
        }
    }, 30000); // 30 segundos
}

// Carregar dados do criador
async function loadCreatorData() {
    try {
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            let data;
            try {
                data = await response.json();
                console.log('👤 Dados do criador carregados:', data);
                
                // Verificar status antes de mostrar o dashboard
                if (data.status === 'pendente' || data.status === 'suspenso') {
                    showBlockedScreen(data.status);
                    return;
                }
                
                // Se estiver aprovado, mostrar dashboard
                hideBlockedScreen();
                displayCreatorProfile(data);
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta:', error);
                const responseText = await response.text();
                console.error('📄 Resposta recebida:', responseText);
                throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
            }
        } else {
            console.error('❌ Erro ao carregar dados do criador');
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
    }
}

// Exibir informações do perfil
function displayCreatorProfile(creator) {
    // Definir dados do criador globalmente
    window.creatorData = creator;
    console.log('👤 Dados do criador definidos globalmente:', window.creatorData);
    
    // Aplicar tema preto se o criador for contratado
    if (creator.contratado) {
        document.body.classList.add('contratado-theme');
        console.log('🎨 Tema preto aplicado para criador contratado');
    } else {
        document.body.classList.remove('contratado-theme');
        console.log('🎨 Tema padrão aplicado para criador não contratado');
    }
    
    // Nome
    const creatorNameEl = document.getElementById('creator-name');
    if (creatorNameEl) creatorNameEl.textContent = creator.nome;
    
    // ID do Jogo
    const creatorGameIdEl = document.getElementById('creator-game-id');
    if (creatorGameIdEl) creatorGameIdEl.textContent = creator.game_id;
    
    // Discord ID
    const creatorDiscordEl = document.getElementById('creator-discord');
    if (creatorDiscordEl) creatorDiscordEl.textContent = creator.discord_id;
    
    // Categorias (Áreas)
    const areasText = creator.areas && creator.areas.length > 0 
      ? creator.areas.map(area => area.nome).join(', ')
      : creator.area_nome || 'Não definida';
    const creatorCategoryEl = document.getElementById('creator-category');
    if (creatorCategoryEl) creatorCategoryEl.textContent = areasText;
    
    // Nível
    const creatorLevelEl = document.getElementById('creator-level');
    if (creatorLevelEl) creatorLevelEl.textContent = creator.nivel || 1;
    
    // Status da Conta
    const statusElement = document.getElementById('creator-status');
    if (statusElement) {
        if (creator.contratado) {
            statusElement.innerHTML = '<span class="contratado-badge">👑 CONTRATADO</span>';
            statusElement.className = 'profile-value status-contratado';
        } else {
            const statusText = getStatusText(creator.status);
            statusElement.textContent = statusText;
            statusElement.className = `profile-value status-${creator.status}`;
        }
    }
    
    // Data de Cadastro
    const date = new Date(creator.created_at);
    const creatorDateEl = document.getElementById('creator-date');
    if (creatorDateEl) creatorDateEl.textContent = date.toLocaleDateString('pt-BR');
    
    // Avatar
    const profileImageEl = document.getElementById('profile-image');
    const profilePlaceholderEl = document.getElementById('profile-avatar-placeholder');
    if (creator.profile_image && profileImageEl && profilePlaceholderEl) {
        profileImageEl.src = creator.profile_image;
        profileImageEl.style.display = 'block';
        profilePlaceholderEl.style.display = 'none';
    }
    
    // Mostrar botão de live apenas para categoria "live"
    const liveButtonContainer = document.getElementById('live-button-container');
    if (liveButtonContainer) {
        const temAreaLive = creator.areas && creator.areas.some(area => 
          area.nome.toLowerCase().includes('live')
        ) || (creator.area_nome && creator.area_nome.toLowerCase().includes('live'));
        
        if (temAreaLive) {
            liveButtonContainer.style.display = 'block';
            console.log('🎥 Botão de live ativado para categorias:', creator.area_nome);
            
            // Verificar status atual da live
            checkLiveStatus();
        } else {
            liveButtonContainer.style.display = 'none';
        }
    }
    
    // Filtrar tipos de conteúdo baseado nas áreas do criador
    filterContentTypes(creator);
}

// Obter texto do status da conta
function getStatusText(status) {
    const statuses = {
        'pendente': 'Pendente de Aprovação',
        'aprovado': 'Conta Aprovada',
        'rejeitado': 'Conta Rejeitada'
    };
    return statuses[status] || 'Status Desconhecido';
}

// Função utilitária para remover acentos
function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
// Filtrar tipos de conteúdo baseado nas áreas do criador
function filterContentTypes(creator) {
    const tipoSelect = document.getElementById('tipo');
    if (!tipoSelect) return;
    const areas = creator.areas || [];
    // Normalizar nomes das áreas
    const areaNomes = areas.map(area => removerAcentos(area.nome));
    if (areas.length === 0 && creator.area_nome) {
        areaNomes.push(removerAcentos(creator.area_nome));
    }
    console.log('Áreas do criador para filtro:', areaNomes);
    // Limpar opções existentes
    tipoSelect.innerHTML = '<option value="">Selecione o tipo</option>';
    let opcoesAdicionadas = 0;
    if (areaNomes.some(area => area.includes('foto'))) {
        const option = document.createElement('option');
        option.value = 'fotos';
        option.textContent = 'Fotos';
        tipoSelect.appendChild(option);
        opcoesAdicionadas++;
    }
    if (areaNomes.some(area => area.includes('video'))) {
        const option = document.createElement('option');
        option.value = 'video';
        option.textContent = 'Vídeo';
        tipoSelect.appendChild(option);
        opcoesAdicionadas++;
    }
    if (areaNomes.some(area => area.includes('live'))) {
        const option = document.createElement('option');
        option.value = 'live';
        option.textContent = 'Live';
        tipoSelect.appendChild(option);
        opcoesAdicionadas++;
    }
    // Só mostrar todas as opções se NÃO houver nenhuma área válida
    if (opcoesAdicionadas === 0) {
        const allOptions = [
            { value: 'fotos', text: 'Fotos' },
            { value: 'video', text: 'Vídeo' },
            { value: 'live', text: 'Live' }
        ];
        allOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            tipoSelect.appendChild(option);
        });
        console.log('Nenhuma área válida encontrada, mostrando todas as opções.');
    }
}

// Carregar lista de conteúdos
async function loadContentList() {
    try {
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/conteudos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            let conteudos;
            try {
                conteudos = await response.json();
                renderContentList(conteudos);
                console.log('📋 Lista de conteúdos carregada:', conteudos.length, 'itens');
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta:', error);
                const responseText = await response.text();
                console.error('📄 Resposta recebida:', responseText);
                throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
            }
        } else {
            showContentListError();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar conteúdos:', error);
        showContentListError();
    }
}

// Renderizar lista de conteúdos
function renderContentList(conteudos) {
    if (conteudos.length === 0) {
        contentList.innerHTML = `
            <div style="text-align: center; color: #718096; padding: 40px;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhum conteúdo registrado ainda</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Comece registrando seu primeiro conteúdo!</p>
            </div>
        `;
        return;
    }
    
    // Mostrar apenas os últimos 3 conteúdos
    const recentConteudos = conteudos.slice(0, 3);
    
    const contentHTML = recentConteudos.map(conteudo => `
        <div class="content-item">
            <div class="content-header">
                <span class="content-type">${getContentTypeLabel(conteudo.tipo)}</span>
                <span class="content-status ${getStatusClass(conteudo.status)}">
                    ${getStatusLabel(conteudo.status)}
                </span>
            </div>
            <div class="content-details">
                ${conteudo.visualizacoes > 0 ? `<p><strong>Visualizações:</strong> ${conteudo.visualizacoes}</p>` : ''}
                ${conteudo.tipo === 'live' && conteudo.tempo_live ? `<p><strong>Tempo da Live:</strong> ${conteudo.tempo_live} horas</p>` : ''}
                ${conteudo.observacoes ? `<p><strong>Observações:</strong> ${conteudo.observacoes}</p>` : ''}
                <p><strong>Data:</strong> ${new Date(conteudo.created_at).toLocaleDateString('pt-BR')}</p>
                ${(conteudo.print_video || conteudo.print_foto) ? `
                    <div style="margin-top: 8px;">
                        <button class="btn btn-sm btn-outline" onclick="viewContentImage('${conteudo.print_video || conteudo.print_foto}', '${conteudo.tipo}')">
                            <i class="fas fa-image"></i> Ver Comprovante
                        </button>
                    </div>
                ` : ''}
                ${((conteudo.tipo === 'fotos' && conteudo.link_foto) || (conteudo.tipo === 'video' && conteudo.link_video)) ? `
                    <div style="margin-top: 8px;">
                        <button class="btn btn-sm btn-primary" onclick="window.open('${conteudo.tipo === 'fotos' ? conteudo.link_foto : conteudo.link_video}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Abrir Conteúdo
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    // Adicionar link para ver todos se houver mais de 3
    const viewAllLink = conteudos.length > 3 ? `
        <div class="view-all-content">
            <button class="btn btn-secondary" onclick="showAllContent()">
                <i class="fas fa-list"></i>
                Ver Todos os Conteúdos (${conteudos.length})
            </button>
        </div>
    ` : '';
    
    contentList.innerHTML = contentHTML + viewAllLink;
}

// Carregar estatísticas
async function loadStats() {
    try {
        // Verificar autenticação primeiro
        if (!checkAuth()) {
            return;
        }
        
        const token = localStorage.getItem('creator_token');
        
        const response = await fetch('/api/creators/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            let stats;
            try {
                stats = await response.json();
                updateStats(stats);
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta:', error);
                throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
            }
        } else {
            if (response.status === 401) {
                localStorage.removeItem('creator_token');
                window.location.href = '/creator-login.html';
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
    }
}

// Atualizar estatísticas
function updateStats(stats) {
    conteudosAprovados.textContent = stats.aprovados || 0;
    conteudosPendentes.textContent = stats.pendentes || 0;
    
    // Atualizar indicações
    const totalIndicacoes = document.getElementById('total-indicacoes');
    if (totalIndicacoes) {
        totalIndicacoes.textContent = stats.indicados || 0;
    }
    
    // Formatar bônus para resgate
    const bonus = parseFloat(stats.bonus || 0);
    bonusResgate.textContent = `R$ ${bonus.toFixed(2).replace('.', ',')}`;
    
    // Atualizar dados do cupom
    if (stats.cupom && stats.cupom.nome_cupom && stats.cupom.nome_cupom !== 'N/A') {
        const valorVendido = parseFloat(stats.cupom.valor_vendido || 0);
        valorVendidoCupom.textContent = `R$ ${valorVendido.toFixed(2).replace('.', ',')}`;
        cupomName.textContent = stats.cupom.nome_cupom;
        
        // Atualizar botão de copiar
        const copyBtn = document.getElementById('copy-cupom-btn');
        if (copyBtn) {
            copyBtn.onclick = () => copyCupom(stats.cupom.nome_cupom);
            copyBtn.classList.remove('hidden');
        }
        
        // Adicionar evento de clique no container do cupom para copiar
        const cupomInfo = document.querySelector('.cupom-info');
        if (cupomInfo) {
            cupomInfo.onclick = () => copyCupom(stats.cupom.nome_cupom);
            cupomInfo.classList.add('clickable');
        }
        
        // Esconder botão de criar cupom se já existe um
        const createBtn = document.getElementById('create-cupom-btn');
        if (createBtn) {
            createBtn.classList.add('hidden');
        }
    } else {
        // Mostrar botão de criar cupom se não existe cupom válido
        valorVendidoCupom.textContent = 'R$ 0,00';
        cupomName.textContent = 'N/A';
        
        const createBtn = document.getElementById('create-cupom-btn');
        if (createBtn) {
            createBtn.classList.remove('hidden');
        }
        
        // Esconder botão de copiar se não há cupom válido
        const copyBtn = document.getElementById('copy-cupom-btn');
        if (copyBtn) {
            copyBtn.classList.add('hidden');
            console.log('🚫 Botão de copiar cupom escondido');
        }
        
        // Remover evento de clique do container do cupom se não há cupom válido
        const cupomInfo = document.querySelector('.cupom-info');
        if (cupomInfo) {
            cupomInfo.onclick = null;
            cupomInfo.classList.remove('clickable');
            console.log('🚫 Clique no cupom-info desativado');
        }
    }
    
    // Atualizar botão de resgate
    const redeemBtn = document.getElementById('redeem-btn');
    if (redeemBtn) {
        redeemBtn.disabled = bonus <= 0;
        if (bonus <= 0) {
            redeemBtn.innerHTML = '<i class="fas fa-gift"></i> Sem Bônus';
        } else {
            redeemBtn.innerHTML = '<i class="fas fa-gift"></i> Resgatar';
        }
    }
    
    // Atualizar valor ganho com conteúdo monetizado (apenas para contratados)
    const valorGanhoConteudoCard = document.getElementById('valor-ganho-conteudo-card');
    const valorGanhoConteudoElement = document.getElementById('valor-ganho-conteudo');
    const saqueBtn = document.getElementById('saque-btn');
    
    console.log('🔍 Debug - valorGanhoConteudoCard:', valorGanhoConteudoCard);
    console.log('🔍 Debug - valorGanhoConteudoElement:', valorGanhoConteudoElement);
    console.log('🔍 Debug - window.creatorData:', window.creatorData);
    console.log('🔍 Debug - stats.valor_ganho_conteudo:', stats.valor_ganho_conteudo);
    
    if (valorGanhoConteudoCard && valorGanhoConteudoElement) {
        const valorGanhoConteudo = parseFloat(stats.valor_ganho_conteudo || 0);
        
        // Ocultar card por padrão
        valorGanhoConteudoCard.style.display = 'none';
        
        // Mostrar card apenas se o criador for contratado
        if (window.creatorData && window.creatorData.contratado) {
            valorGanhoConteudoCard.style.display = 'block';
            valorGanhoConteudoElement.textContent = `R$ ${valorGanhoConteudo.toFixed(2).replace('.', ',')}`;
            console.log('💰 Valor ganho com conteúdo monetizado (lives, vídeos e indicações):', valorGanhoConteudo);
            console.log('✅ Card de valor ganho exibido para criador contratado');
            
            // Verificar se pode fazer saque (bateu todas as metas e tem valor disponível)
            const metasCompletas = verificarMetasCompletas(stats);
            const temValor = valorGanhoConteudo > 0;
            
            if (saqueBtn) {
                if (metasCompletas && temValor) {
                    saqueBtn.style.display = 'block';
                    saqueBtn.disabled = false;
                } else {
                    saqueBtn.style.display = 'none';
                }
            }
        } else {
            console.log('🚫 Card de valor ganho oculto - criador não contratado');
        }
    } else {
        console.log('❌ Elementos do card de valor ganho não encontrados no DOM');
    }
    
    // Atualizar barra de progresso de nível
    updateLevelProgress(stats);
    
    // Remover banners antigos se não for contratado
    if (!window.creatorData || !window.creatorData.contratado) {
        const saqueRequiredBanner = document.getElementById('saque-required-banner');
        if (saqueRequiredBanner) saqueRequiredBanner.remove();
    }
    
    console.log('✅ Estatísticas atualizadas no frontend');
    console.log('💰 Bônus formatado:', bonusResgate.textContent);
}

// Atualizar barra de progresso de nível
function updateLevelProgress(stats) {
    const nivel = parseInt(stats.nivel || 1);
    
    // Atualizar nível
    const currentLevel = document.getElementById('current-level');
    const nextLevel = document.getElementById('next-level');
    if (currentLevel) currentLevel.textContent = nivel;
    if (nextLevel) nextLevel.textContent = nivel + 1;
    
    // Criar barras de progresso por área
    createAreasProgress(stats);
}

function createAreasProgress(stats) {
    const container = document.getElementById('areas-progress-container');
    if (!container) return;
    
    // Limpar container
    container.innerHTML = '';
    
    // Obter áreas do criador
    const areas = stats.areas || [];
    if (areas.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 20px;">Nenhuma área selecionada</p>';
        return;
    }
    
    // Log para debug das metas
    console.log('🎯 Metas personalizadas carregadas:', {
        meta_horas_live: stats.meta_horas_live,
        meta_fotos: stats.meta_fotos,
        meta_videos: stats.meta_videos
    });
    
    // Mapear tipos de conteúdo para áreas (usando metas personalizadas do banco)
    const areaTypeMapping = {
        'video': { 
            meta: parseFloat(stats.meta_videos || 0), 
            icon: 'fas fa-video', 
            label: 'Vídeos' 
        },
        'fotos': { 
            meta: parseFloat(stats.meta_fotos || 0), 
            icon: 'fas fa-camera', 
            label: 'Fotos' 
        },
        'live': { 
            meta: parseFloat(stats.meta_horas_live || 0), 
            icon: 'fas fa-broadcast-tower', 
            label: 'Horas de Live' 
        }
    };
    
    // Usar dados do banco de dados (mais confiável)
    const contadores = {
        video: parseInt(stats.videos_aprovados || 0),
        fotos: parseInt(stats.fotos_aprovadas || 0),
        live: parseFloat(stats.horas_live || 0)
    };
    
    console.log('📈 Contadores do banco de dados:', contadores);
    console.log('📊 Stats completos:', stats);
    
    // Determinar quais tipos de conteúdo mostrar baseado nas áreas do criador
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
    
    // Se não encontrou mapeamento específico, mostrar todas as áreas que o criador tem
    if (tiposParaMostrar.size === 0) {
        areas.forEach(area => {
            // Mapeamento genérico baseado no nome da área
            const areaName = area.nome.toLowerCase();
            if (areaName.includes('video') || areaName.includes('vídeo') || areaName.includes('youtube')) {
                tiposParaMostrar.add('video');
            } else if (areaName.includes('foto') || areaName.includes('fotografia') || areaName.includes('instagram')) {
                tiposParaMostrar.add('fotos');
            } else if (areaName.includes('live') || areaName.includes('stream') || areaName.includes('twitch')) {
                tiposParaMostrar.add('live');
            }
        });
    }
    
    // Criar barra de progresso apenas para as áreas que o criador faz parte
    tiposParaMostrar.forEach(tipo => {
        const config = areaTypeMapping[tipo];
        if (!config) return;
        
        const atual = contadores[tipo];
        const meta = config.meta;
        
        // Se não há meta definida, mostrar apenas o atual
        if (meta <= 0) {
            const areaProgress = document.createElement('div');
            areaProgress.className = 'area-progress-item';
            areaProgress.innerHTML = `
                <div class="area-progress-header">
                    <div class="area-progress-title">
                        <div class="area-progress-icon ${tipo}">
                            <i class="${config.icon}"></i>
                        </div>
                        ${config.label}
                    </div>
                    <div class="area-progress-text">
                        ${atual} (Meta não definida)
                    </div>
                </div>
                <div class="area-progress-bar-container">
                    <div class="area-progress-bar ${tipo}" style="width: 0%;"></div>
                </div>
                <div class="area-progress-details">
                    <span class="area-progress-completed">Concluído: ${atual}</span>
                    <span class="area-progress-remaining">Meta: Não definida</span>
                </div>
            `;
            container.appendChild(areaProgress);
            return;
        }
        
        const progresso = Math.min((atual / meta) * 100, 100);
        
        const areaProgress = document.createElement('div');
        areaProgress.className = 'area-progress-item';
        areaProgress.innerHTML = `
            <div class="area-progress-header">
                <div class="area-progress-title">
                    <div class="area-progress-icon ${tipo}">
                        <i class="${config.icon}"></i>
                    </div>
                    ${config.label}
                </div>
                <div class="area-progress-text">
                    ${atual} / ${meta}
                </div>
            </div>
            <div class="area-progress-bar-container">
                <div class="area-progress-bar ${tipo}" style="width: ${progresso}%;"></div>
            </div>
            <div class="area-progress-details">
                <span class="area-progress-completed">Concluído: ${atual}</span>
                <span class="area-progress-remaining">Restante: ${Math.max(0, meta - atual)}</span>
            </div>
        `;
        
        container.appendChild(areaProgress);
    });
    
    // Verificar se pode upar de nível (todas as metas das áreas do criador atingidas)
    const areasComMetas = Array.from(tiposParaMostrar).filter(tipo => {
        const config = areaTypeMapping[tipo];
        return config.meta > 0;
    });
    
    const podeUpar = areasComMetas.length > 0 && areasComMetas.every(tipo => {
        const config = areaTypeMapping[tipo];
        const atual = contadores[tipo];
        const meta = config.meta;
        return atual >= meta;
    });
    
    // Para criadores contratados, up automático acontece no saque
    if (podeUpar && tiposParaMostrar.size > 0) {
        // Verificar se é contratado
        if (window.creatorData && window.creatorData.contratado) {
            // Para contratados, mostrar banner de que precisa fazer saque para upar
            showSaqueRequiredBanner();
        } else {
            // Criador não contratado pode upar normalmente
            showLevelUpBanner();
        }
    } else {
        const banner = document.getElementById('level-up-banner');
        if (banner) banner.remove();
    }
}

// Mostrar toast
function showToast(message, type = 'success') {
    console.log('🔔 showToast chamado:', { message, type });
    
    if (!toast) {
        console.error('❌ Elemento toast não encontrado!');
        // Fallback: usar alert
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    // Definir ícones para cada tipo
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    // Substituir quebras de linha por <br> para HTML
    const htmlMessage = message.replace(/\n/g, '<br>');
    
    // Criar estrutura HTML moderna
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <i class="${icons[type] || icons['info']}"></i>
            </div>
            <div class="toast-text">${htmlMessage}</div>
            <button class="toast-close" onclick="this.parentElement.parentElement.classList.remove('show')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    toast.className = `toast toast-${type}`;
    toast.classList.add('show');
    
    console.log('✅ Toast configurado:', {
        message: htmlMessage,
        className: toast.className,
        hasShow: toast.classList.contains('show'),
        element: toast,
        computedStyle: window.getComputedStyle(toast)
    });
    
    // Forçar reflow para garantir que a animação funcione
    toast.offsetHeight;
    
    // Aumentar tempo para mensagens longas
    const duration = message.length > 100 ? 8000 : 5000;
    
    setTimeout(() => {
        toast.classList.remove('show');
        console.log('🔔 Toast removido após', duration, 'ms');
    }, duration);
}

// Mostrar erro na lista de conteúdos
function showContentListError() {
    contentList.innerHTML = `
        <div style="text-align: center; color: #e53e3e; padding: 40px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
            <p>Erro ao carregar conteúdos</p>
            <button onclick="loadContentList()" class="btn btn-secondary" style="margin-top: 15px;">
                <i class="fas fa-redo"></i> Tentar Novamente
            </button>
        </div>
    `;
}

// Funções auxiliares
function getContentTypeLabel(tipo) {
    const labels = {
        'video': 'Vídeo',
        'fotos': 'Fotos',
        'live': 'Live'
    };
    return labels[tipo] || tipo;
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Pendente',
        'approved': 'Aprovado',
        'rejected': 'Rejeitado'
    };
    return labels[status] || status;
}

function getStatusClass(status) {
    const classes = {
        'pending': 'status-pending',
        'approved': 'status-approved',
        'rejected': 'status-rejected'
    };
    return classes[status] || 'status-pending';
}

// Eventos do Socket.IO
socket.on('connect', () => {
    console.log('🔌 Conectado ao servidor via Socket.IO');
});

socket.on('content-updated', () => {
    console.log('🔄 Atualização recebida via Socket.IO');
    loadContentList();
    loadStats();
});

socket.on('conteudo_aprovado', (data) => {
    console.log('🎉 Conteúdo aprovado recebido:', data);
    showToast('🎉 Seu conteúdo foi aprovado!', 'success');
    loadContentList();
    loadStats();
    
    // Verificar se houve up de nível
    if (data.horas_live && data.horas_live >= 60) {
        setTimeout(() => {
            loadStats(); // Recarregar stats para verificar se subiu de nível
        }, 1000);
    }
});

socket.on('disconnect', () => {
    console.log('🔌 Desconectado do servidor');
});

// Logout
function logout() {
    localStorage.removeItem('creator_token');
    window.location.href = '/creator-login.html';
}

// Funções do Avatar Modal
let newAvatarData = null;

function setupAvatarModal() {
    const avatarUploadArea = document.getElementById('avatarUploadArea');
    const avatarInput = document.getElementById('avatarInput');
    
    // Click para selecionar arquivo
    avatarUploadArea.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', handleAvatarSelect);
    
    // Drag and drop
    avatarUploadArea.addEventListener('dragover', handleAvatarDragOver);
    avatarUploadArea.addEventListener('dragleave', handleAvatarDragLeave);
    avatarUploadArea.addEventListener('drop', handleAvatarDrop);
}

function openEditAvatar() {
    const modal = document.getElementById('avatar-modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeEditAvatar() {
    const modal = document.getElementById('avatar-modal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Reset modal
    resetAvatarModal();
}

function handleAvatarSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processAvatarFile(file);
    }
}

function handleAvatarDragOver(e) {
    e.preventDefault();
    document.getElementById('avatarUploadArea').classList.add('dragover');
}

function handleAvatarDragLeave(e) {
    e.preventDefault();
    document.getElementById('avatarUploadArea').classList.remove('dragover');
}

function handleAvatarDrop(e) {
    e.preventDefault();
    document.getElementById('avatarUploadArea').classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processAvatarFile(files[0]);
    }
}

function processAvatarFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('❌ Por favor, selecione apenas arquivos de imagem', 'error');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showToast('❌ A imagem deve ter menos de 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        newAvatarData = e.target.result;
        document.getElementById('avatarPreview').src = newAvatarData;
        document.getElementById('avatarPreview').style.display = 'block';
        document.getElementById('saveAvatarBtn').disabled = false;
        
        // Atualizar área de upload
        document.getElementById('avatarUploadArea').innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-check-circle" style="color: #38a169;"></i>
            </div>
            <div class="upload-text">Nova foto selecionada!</div>
            <div class="upload-hint">Clique para trocar a imagem</div>
        `;
        
        console.log('🖼️ Nova foto do avatar processada');
    };
    
    reader.readAsDataURL(file);
}

function resetAvatarModal() {
    newAvatarData = null;
    document.getElementById('avatarPreview').style.display = 'none';
    document.getElementById('saveAvatarBtn').disabled = true;
    
    // Restaurar área de upload
    document.getElementById('avatarUploadArea').innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <div class="upload-text">Arraste uma nova foto aqui ou clique para selecionar</div>
        <div class="upload-hint">PNG, JPG até 2MB</div>
    `;
}

// Função para salvar avatar (agora envia como FormData)
async function saveAvatar() {
    const avatarInput = document.getElementById('avatarInput');
    const file = avatarInput.files[0];
    if (!file) {
        showToast('❌ Selecione uma nova foto primeiro', 'error');
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('❌ Por favor, selecione apenas arquivos de imagem', 'error');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('❌ A imagem deve ter menos de 2MB', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('creator_token');
        const formData = new FormData();
        formData.append('profile_image', file);
        const response = await fetch('/api/creators/update-avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            showToast('✅ Foto do perfil atualizada com sucesso!', 'success');
            // Atualizar avatar na tela com o link retornado
            document.getElementById('profile-image').src = result.profile_image;
            document.getElementById('profile-image').style.display = 'block';
            document.getElementById('profile-avatar-placeholder').style.display = 'none';
            closeEditAvatar();
        } else {
            throw new Error(result.error || 'Erro ao atualizar foto');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar avatar:', error);
        showToast(`❌ ${error.message}`, 'error');
    }
}

// Verificar status da live
async function checkLiveStatus() {
    try {
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/live-status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const status = await response.json();
            
            if (status.active) {
                // Live está ativa, mostrar timer
                startLiveTimer(status.endTime);
            } else {
                // Live não está ativa, mostrar botão normal
                const liveButton = document.getElementById('live-button');
                liveButton.disabled = false;
                liveButton.innerHTML = '<i class="fas fa-play"></i> Ativar Live';
            }
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status da live:', error);
    }
}

// Função para ativar live
async function activateLive() {
    try {
        const liveButton = document.getElementById('live-button');
        const originalText = liveButton.innerHTML;
        
        // Desabilitar botão e mostrar loading
        liveButton.disabled = true;
        liveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ativando...';
        
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/activate-live', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('✅ Live ativada! Cargo concedido por 1 hora no Discord', 'success');
            
            // Atualizar botão para mostrar tempo restante
            startLiveTimer(result.endTime);
        } else {
            throw new Error(result.error || 'Erro ao ativar live');
        }
        
    } catch (error) {
        console.error('❌ Erro ao ativar live:', error);
        showToast(`❌ ${error.message}`, 'error');
        
        // Restaurar botão
        const liveButton = document.getElementById('live-button');
        liveButton.disabled = false;
        liveButton.innerHTML = '<i class="fas fa-play"></i> Ativar Live';
    }
}

// Iniciar timer do botão de live
function startLiveTimer(endTime) {
    const liveButton = document.getElementById('live-button');
    
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance <= 0) {
            clearInterval(timer);
            liveButton.disabled = false;
            liveButton.innerHTML = '<i class="fas fa-play"></i> Ativar Live';
            showToast('⏰ Tempo da live expirado', 'error');
        } else {
            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            liveButton.innerHTML = `<i class="fas fa-clock"></i> ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Função para gerar códigos de WL
async function generateWLCodes() {
    try {
        console.log('🚀 Iniciando geração de códigos WL...');
        
        // Perguntar quantidade ao usuário
        const quantityInput = prompt('Quantos códigos de WL você deseja gerar?', '1');
        
        // Verificar se o usuário cancelou
        if (quantityInput === null) {
            console.log('❌ Usuário cancelou a operação');
            return;
        }
        
        const quantity = parseInt(quantityInput);
        console.log('📊 Quantidade solicitada:', quantity);
        
        // Validar entrada
        if (isNaN(quantity)) {
            showToast('❌ Por favor, digite um número válido', 'error');
            return;
        }
        
        // Validações
        if (quantity < 1 || quantity > 50) {
            showToast('❌ Quantidade deve ser entre 1 e 50', 'error');
            return;
        }
        
        // Mostrar toast de loading
        showToast(`🔄 Gerando ${quantity} código(s)...`, 'info');
        
        const token = localStorage.getItem('creator_token');
        console.log('🔑 Token encontrado:', !!token);
        
        const response = await fetch('/api/creators/generate-wl-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                quantity: quantity
            })
        });
        
        console.log('📡 Resposta do servidor:', response.status);
        const result = await response.json();
        console.log('📦 Resultado:', result);
        
        if (response.ok) {
            showToast(`✅ ${quantity} código(s) gerado(s) com sucesso!`, 'success');
            
            // Mostrar códigos gerados
            showGeneratedCodes(result.codes);
        } else {
            throw new Error(result.error || 'Erro ao gerar códigos');
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerar códigos:', error);
        showToast(`❌ ${error.message}`, 'error');
    }
}

// Mostrar códigos gerados
function showGeneratedCodes(codes) {
    console.log('🔍 Criando modal de códigos:', codes);
    
    // Remover modal existente se houver
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const codesList = codes.map(code => `
        <div class="code-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e9ecef;">
            <span class="code-text" style="font-family: monospace; font-size: 1.1rem; font-weight: 600; color: #495057; letter-spacing: 1px;">${code}</span>
            <button class="copy-btn" onclick="copyToClipboard('${code}')" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; transition: all 0.3s ease;">
                <i class="fas fa-copy"></i>
            </button>
        </div>
    `).join('');
    
    // Criar modal para mostrar códigos
    const modal = document.createElement('div');
    modal.id = 'codes-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 90%; max-width: 700px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 24px 24px 0 24px; margin-bottom: 24px;">
                <h3 style="font-size: 1.25rem; font-weight: 600; color: #1a202c; display: flex; align-items: center; gap: 8px; margin: 0;">
                    <i class="fas fa-ticket-alt"></i> Códigos Gerados
                </h3>
                <button onclick="document.getElementById('codes-modal').remove()" style="background: none; border: none; font-size: 1.25rem; color: #6b7280; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s ease;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 0 24px 24px 24px;">
                <div style="background: #2d2d2d; border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <i class="fas fa-clock" style="color: #fbbf24; margin-right: 10px; font-size: 1.2em;"></i>
                        <strong style="color: #fbbf24;">Horário Restrito</strong>
                    </div>
                    <p style="color: #cccccc; margin: 0; font-size: 0.9em;">
                        ⚠️ Os códigos WL <strong>não podem ser usados entre 00:00 e 07:00</strong>. 
                        Informe aos seus indicados para tentarem novamente após as 07:00.
                    </p>
                </div>
                <div style="margin-bottom: 20px;">
                    <button onclick="copyAllCodes(['${codes.join("', '")}'])" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-copy"></i> Copiar Todos os Códigos
                    </button>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${codesList}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('✅ Modal criado e adicionado ao DOM');
}

// Função de teste para verificar se o modal está funcionando
function testModal() {
    console.log('🧪 Testando modal...');
    const testCodes = ['TESTE001', 'TESTE002', 'TESTE003'];
    showGeneratedCodes(testCodes);
}

// Copiar código para clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ Código copiado!', 'success');
    }).catch(() => {
        showToast('❌ Erro ao copiar código', 'error');
    });
}

function copyCupom(cupomName) {
    if (cupomName && cupomName !== 'N/A') {
        copyToClipboard(cupomName);
    } else {
        showToast('❌ Nenhum cupom disponível para copiar', 'error');
    }
}

// Copiar todos os códigos para clipboard
function copyAllCodes(codes) {
    const allCodes = codes.join('\n');
    navigator.clipboard.writeText(allCodes).then(() => {
        showToast(`✅ ${codes.length} códigos copiados!`, 'success');
    }).catch(() => {
        showToast('❌ Erro ao copiar códigos', 'error');
    });
}

// Funções para gerenciar cupom
function createCupom() {
    const modal = document.getElementById('create-cupom-modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeCreateCupomModal() {
    const modal = document.getElementById('create-cupom-modal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Limpar formulário
    document.getElementById('createCupomForm').reset();
}

// Event listener para o formulário de criação de cupom
document.addEventListener('DOMContentLoaded', function() {
    const createCupomForm = document.getElementById('createCupomForm');
    if (createCupomForm) {
        createCupomForm.addEventListener('submit', handleCreateCupomSubmit);
    }
});

async function handleCreateCupomSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const cupomData = {
            nome: formData.get('nome'),
            desconto: 10, // Desconto fixo de 10%
            uso_maximo: null // Uso ilimitado
        };
        
        // Validar dados
        if (!cupomData.nome) {
            showToast('❌ Nome do cupom é obrigatório', 'error');
            return;
        }
        
        // Mostrar loading
        const loading = document.getElementById('cupom-loading');
        const form = document.getElementById('createCupomForm');
        loading.style.display = 'flex';
        form.style.display = 'none';
        
        // Verificar token antes de enviar
        const token = localStorage.getItem('creator_token');
        console.log('🔍 Token para criar cupom:', token ? token.substring(0, 20) + '...' : 'NENHUM');
        
        if (!token) {
            showToast('❌ Token não encontrado. Faça login novamente.', 'error');
            setTimeout(() => {
                window.location.href = '/creator-login.html';
            }, 2000);
            return;
        }
        
        // Enviar requisição
        const response = await fetch('/api/creators/cupom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cupomData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('✅ Cupom criado com sucesso!', 'success');
            closeCreateCupomModal();
            
            // Recarregar estatísticas para mostrar o novo cupom
            await loadStats();
        } else {
            throw new Error(result.error || 'Erro ao criar cupom');
        }
        
    } catch (error) {
        console.error('❌ Erro ao criar cupom:', error);
        showToast(`❌ ${error.message}`, 'error');
    } finally {
        // Esconder loading e mostrar formulário
        const loading = document.getElementById('cupom-loading');
        const form = document.getElementById('createCupomForm');
        loading.style.display = 'none';
        form.style.display = 'block';
    }
}

// Funções da Modal de Nova Publicação
function openNewPublicationModal() {
    console.log('🔍 === ABRINDO MODAL DE NOVA PUBLICAÇÃO ===');
    
    const modal = document.getElementById('new-publication-modal');
    console.log('🔍 Modal encontrado:', !!modal);
    
    if (!modal) {
        console.log('❌ Modal não encontrado!');
        return;
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Verificar elementos do modal
    const uploadArea = document.getElementById('publicationUploadArea');
    const imageInput = document.getElementById('publicationImageInput');
    const imagePreview = document.getElementById('publicationImagePreview');
    
    console.log('🔍 Elementos do modal:');
    console.log('  - uploadArea:', !!uploadArea);
    console.log('  - imageInput:', !!imageInput);
    console.log('  - imagePreview:', !!imagePreview);
    
    // Configurar eventos de upload com pequeno delay para garantir carregamento
    setTimeout(() => {
        console.log('🔍 Configurando upload após delay...');
        setupPublicationImageUpload();
    }, 100);
}

function closeNewPublicationModal() {
    const modal = document.getElementById('new-publication-modal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Limpar formulário
    clearPublicationForm();
}

function togglePublicationFields() {
    const tipo = document.getElementById('pub-tipo').value;
    const liveField = document.getElementById('pub-live-field');
    const videoFields = document.getElementById('pub-video-fields');
    const fotosFields = document.getElementById('pub-fotos-fields');
    const tempoLiveInput = document.getElementById('pub-tempo-live');
    const visualizacoesInput = document.getElementById('pub-visualizacoes');
    const likesInput = document.getElementById('pub-likes');
    const linkVideoInput = document.getElementById('pub-link-video');
    const linkFotoInput = document.getElementById('pub-link-foto');
    
    // Ocultar todos os campos específicos primeiro
    liveField.style.display = 'none';
    videoFields.style.display = 'none';
    fotosFields.style.display = 'none';
    tempoLiveInput.required = false;
    visualizacoesInput.required = false;
    likesInput.required = false;
    linkVideoInput.required = false;
    linkFotoInput.required = false;
    
    // Limpar valores
    tempoLiveInput.value = '';
    visualizacoesInput.value = '';
    likesInput.value = '';
    linkVideoInput.value = '';
    linkFotoInput.value = '';
    
    if (tipo === 'live') {
        liveField.style.display = 'block';
        tempoLiveInput.required = true;
    } else if (tipo === 'video') {
        videoFields.style.display = 'block';
        visualizacoesInput.required = true;
        likesInput.required = true;
        linkVideoInput.required = true;
    } else if (tipo === 'fotos') {
        fotosFields.style.display = 'block';
        linkFotoInput.required = true;
    }
}

function clearPublicationForm() {
    document.getElementById('newPublicationForm').reset();
    currentPublicationImageData = null;
    
    // Resetar preview de imagem
    document.getElementById('publicationImagePreview').style.display = 'none';
    
    // Resetar área de upload
    document.getElementById('publicationUploadArea').innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <div class="upload-text">Arraste uma imagem aqui ou clique para selecionar</div>
        <div class="upload-hint">PNG, JPG até 5MB • Use Ctrl+V para colar</div>
    `;
    
    // Resetar campos específicos
    togglePublicationFields();
}

function setupPublicationImageUpload() {
    const uploadArea = document.getElementById('publicationUploadArea');
    const imageInput = document.getElementById('publicationImageInput');
    const imagePreview = document.getElementById('publicationImagePreview');
    
    console.log('🔍 Verificando elementos do upload:', {
        uploadArea: !!uploadArea,
        imageInput: !!imageInput,
        imagePreview: !!imagePreview
    });
    
    // Verificar se os elementos existem antes de configurar
    if (!uploadArea) {
        console.log('❌ Elemento publicationUploadArea não encontrado');
        return;
    }
    
    if (!imageInput) {
        console.log('❌ Elemento publicationImageInput não encontrado');
        return;
    }
    
    if (!imagePreview) {
        console.log('❌ Elemento publicationImagePreview não encontrado');
        return;
    }
    
    console.log('✅ Todos os elementos encontrados, configurando upload...');
    
    // Click para selecionar arquivo
    uploadArea.onclick = () => imageInput.click();
    
    // File input change
    imageInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processPublicationImage(file);
        }
    };
    
    // Drag and drop
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    };
    
    uploadArea.ondragleave = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    };
    
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processPublicationImage(files[0]);
        }
    };
    
    // Paste do clipboard
    document.addEventListener('paste', (e) => {
        console.log('Paste event detected in creator dashboard');
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                console.log('Image found in clipboard:', file.name, file.size, 'bytes');
                processPublicationImage(file);
                break;
            }
        }
    });
    
    console.log('✅ Upload de imagem configurado com sucesso');
}

function processPublicationImage(file) {
    console.log('🖼️ Iniciando processamento da imagem:', {
        name: file.name,
        size: file.size,
        type: file.type
    });
    
    if (!file.type.startsWith('image/')) {
        showToast('❌ Por favor, selecione apenas arquivos de imagem', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('❌ A imagem deve ter menos de 5MB', 'error');
        return;
    }
    
    // Salvar arquivo na variável global
    currentPublicationFile = file;
    console.log('✅ Arquivo salvo na variável global:', currentPublicationFile.name);
    
    // Definir o arquivo no input file
    const imageInput = document.getElementById('publicationImageInput');
    if (imageInput) {
        // Criar um novo FileList com o arquivo
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;
        console.log('✅ Arquivo definido no input:', imageInput.files[0].name);
    } else {
        console.log('❌ Input de imagem não encontrado');
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentPublicationImageData = e.target.result;
        
        const imagePreview = document.getElementById('publicationImagePreview');
        if (imagePreview) {
            imagePreview.src = currentPublicationImageData;
            imagePreview.style.display = 'block';
        }
        
        // Atualizar área de upload
        const uploadArea = document.getElementById('publicationUploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-check-circle" style="color: #10b981;"></i>
                </div>
                <div class="upload-text">Imagem carregada com sucesso!</div>
                <div class="upload-hint">Clique para trocar a imagem</div>
            `;
        }
        
        console.log('🖼️ Imagem da publicação processada com sucesso');
        console.log('🖼️ currentPublicationImageData definido:', !!currentPublicationImageData);
        console.log('🖼️ currentPublicationFile definido:', !!currentPublicationFile);
        console.log('🖼️ currentPublicationFile nome:', currentPublicationFile ? currentPublicationFile.name : 'N/A');
    };
    
    reader.readAsDataURL(file);
}

// Função para envio de nova publicação (agora envia como FormData)
async function handleNewPublicationSubmit(e) {
    e.preventDefault();
    document.getElementById('publication-loading').style.display = 'block';
    try {
        const form = e.target;
        const formData = new FormData(form);
        
        // Log dos dados do formulário
        console.log('📝 Dados do formulário:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        
        // Corrigir nome do campo tempo_live (de tempo-live para tempo_live)
        const tempoLiveValue = formData.get('tempo-live');
        if (tempoLiveValue) {
            formData.delete('tempo-live');
            formData.set('tempo_live', tempoLiveValue);
            console.log('✅ Campo tempo-live corrigido para tempo_live:', tempoLiveValue);
        }
        
        // Processar campos específicos de vídeo
        const tipo = formData.get('tipo');
        if (tipo === 'video') {
            // Corrigir nomes dos campos de vídeo
            const visualizacoesValue = formData.get('visualizacoes');
            const likesValue = formData.get('likes');
            const linkVideoValue = formData.get('link-video');
            
            if (visualizacoesValue) {
                formData.delete('visualizacoes');
                formData.set('visualizacoes', visualizacoesValue);
                console.log('✅ Campo visualizacoes processado:', visualizacoesValue);
            }
            
            if (likesValue) {
                formData.delete('likes');
                formData.set('likes', likesValue);
                console.log('✅ Campo likes processado:', likesValue);
            }
            
            if (linkVideoValue) {
                formData.delete('link-video');
                formData.set('link_video', linkVideoValue);
                console.log('✅ Campo link-video corrigido para link_video:', linkVideoValue);
            }
        }
        
        // Processar campos específicos de fotos
        if (tipo === 'fotos') {
            const linkFotoValue = formData.get('link-foto');
            
            if (linkFotoValue) {
                formData.delete('link-foto');
                formData.set('link_foto', linkFotoValue);
                console.log('✅ Campo link-foto corrigido para link_foto:', linkFotoValue);
            }
        }
        
        // Adicionar arquivos manualmente se existirem
        console.log('🔍 === VERIFICAÇÃO DE ARQUIVOS ===');
        console.log('🔍 currentPublicationFile existe?', !!currentPublicationFile);
        
        if (currentPublicationFile) {
            console.log('📁 Arquivo encontrado na variável global:', {
                name: currentPublicationFile.name,
                size: currentPublicationFile.size,
                type: currentPublicationFile.type
            });
            
            const tipo = formData.get('tipo');
            console.log('📝 Tipo de conteúdo:', tipo);
            
            // Adicionar arquivo com nome correto baseado no tipo
            if (tipo === 'fotos') {
                formData.set('print_foto', currentPublicationFile);
                console.log('✅ Arquivo adicionado como print_foto');
            } else if (tipo === 'video' || tipo === 'live') {
                formData.set('print_video', currentPublicationFile);
                console.log('✅ Arquivo adicionado como print_video');
            } else {
                console.log('❌ Tipo inválido para upload:', tipo);
            }
        } else {
            console.log('❌ Nenhum arquivo encontrado na variável global');
            
            // Fallback: tentar pegar do input (caso ainda funcione)
            const imageInput = document.getElementById('publicationImageInput');
            console.log('🔍 Fallback - imageInput existe?', !!imageInput);
            if (imageInput && imageInput.files[0]) {
                const file = imageInput.files[0];
                const tipo = formData.get('tipo');
                console.log('📁 Arquivo encontrado no input (fallback):', {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
                
                if (tipo === 'fotos') {
                    formData.set('print_foto', file);
                    console.log('✅ Arquivo adicionado como print_foto (fallback)');
                } else if (tipo === 'video' || tipo === 'live') {
                    formData.set('print_video', file);
                    console.log('✅ Arquivo adicionado como print_video (fallback)');
                }
            } else {
                console.log('❌ Nenhum arquivo encontrado em nenhum lugar');
            }
        }
        
        // LOGS DETALHADOS ANTES DO ENVIO
        console.log('🔍 === VERIFICAÇÃO FINAL ANTES DO ENVIO ===');
        console.log('🔍 currentPublicationFile existe?', !!currentPublicationFile);
        if (currentPublicationFile) {
            console.log('🔍 currentPublicationFile detalhes:', {
                name: currentPublicationFile.name,
                size: currentPublicationFile.size,
                type: currentPublicationFile.type
            });
        }
        
        console.log('📝 Dados finais do FormData:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}: [ARQUIVO] ${value.name} (${value.size} bytes)`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }
        console.log('🔍 Verificação específica dos arquivos:');
        console.log('  - print_foto no FormData:', formData.has('print_foto'));
        console.log('  - print_video no FormData:', formData.has('print_video'));
        
        if (formData.has('print_foto')) {
            const file = formData.get('print_foto');
            console.log('  - print_foto é File?', file instanceof File);
            console.log('  - print_foto nome:', file.name);
            console.log('  - print_foto tamanho:', file.size);
        }
        
        if (formData.has('print_video')) {
            const file = formData.get('print_video');
            console.log('  - print_video é File?', file instanceof File);
            console.log('  - print_video nome:', file.name);
            console.log('  - print_video tamanho:', file.size);
        }
        
        console.log('🔍 === FIM DA VERIFICAÇÃO ===');
        
        // Se houver campo para vídeo, pode adicionar aqui (exemplo: print_video)
        // formData.set('print_video', ...);
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/conteudo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        let result;
        try {
            result = await response.json();
        } catch (error) {
            const responseText = await response.text();
            throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
        }
        if (response.ok) {
            showToast('🎉 Publicação registrada com sucesso!', 'success');
            closeNewPublicationModal();
            loadContentList();
            loadStats();
            socket.emit('content-registered');
            setTimeout(() => { loadStats(); }, 2000);
            setTimeout(() => { checkStatusIfNeeded(); }, 3000);
        } else {
            throw new Error(result.message || result.error || 'Erro ao registrar publicação');
        }
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    } finally {
        document.getElementById('publication-loading').style.display = 'none';
    }
}

// Expor funções globais
window.logout = logout;
window.openEditAvatar = openEditAvatar;
window.closeEditAvatar = closeEditAvatar;
window.saveAvatar = saveAvatar;
window.activateLive = activateLive;
window.generateWLCodes = generateWLCodes;
window.copyToClipboard = copyToClipboard;
window.copyAllCodes = copyAllCodes;
window.openNewPublicationModal = openNewPublicationModal;
window.closeNewPublicationModal = closeNewPublicationModal;
window.togglePublicationFields = togglePublicationFields;
window.showAllContent = showAllContent;

// Funções do sistema de resgate
window.openRedeemModal = openRedeemModal;
window.closeRedeemModal = closeRedeemModal;
window.copyCoupon = copyCoupon;
window.accessStore = accessStore;

// Variáveis globais para resgate
let currentBonusAmount = 0;
let generatedCoupon = null;

// Abrir modal de resgate
function openRedeemModal() {
    const modal = document.getElementById('redeem-modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Atualizar valor disponível
    const bonusText = document.getElementById('bonus-resgate').textContent;
    const bonusValue = parseFloat(bonusText.replace('R$ ', '').replace(',', '.'));
    currentBonusAmount = bonusValue;
    
    document.getElementById('available-bonus').textContent = bonusText;
    
    // Configurar valor máximo no input
    const amountInput = document.getElementById('redeem-amount');
    amountInput.max = bonusValue;
    
    // Configurar evento do formulário
    const redeemForm = document.getElementById('redeemForm');
    redeemForm.onsubmit = handleRedeemSubmit;
    
    // Resetar modal
    showRedeemFormSection();
}

// Fechar modal de resgate
function closeRedeemModal() {
    const modal = document.getElementById('redeem-modal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Resetar formulário
    document.getElementById('redeemForm').reset();
    showRedeemFormSection();
}

// Mostrar seção do formulário
function showRedeemFormSection() {
    document.getElementById('redeem-form-section').classList.remove('hidden');
    document.getElementById('redeem-success-section').classList.add('hidden');
    document.getElementById('redeem-loading').style.display = 'none';
}

// Mostrar seção de sucesso
function showRedeemSuccessSection() {
    document.getElementById('redeem-form-section').classList.add('hidden');
    document.getElementById('redeem-success-section').classList.remove('hidden');
    document.getElementById('redeem-loading').style.display = 'none';
}

// Manipular envio do resgate
async function handleRedeemSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('amount'));
    // Validações
    if (!amount || amount <= 0) {
        showToast('❌ Digite um valor válido', 'error');
        return;
    }
    if (amount > currentBonusAmount) {
        showToast('❌ Valor maior que o bônus disponível', 'error');
        return;
    }
    if (amount < 1) {
        showToast('❌ Valor mínimo é R$ 1,00', 'error');
        return;
    }
    // Mostrar loading
    document.getElementById('redeem-loading').style.display = 'block';
    document.getElementById('redeem-form-section').classList.add('hidden');
    try {
        // Chamar API para gerar cupom real na Hydrus
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/redeem-bonus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ valor: amount })
        });
        let result;
        try {
            result = await response.json();
        } catch (error) {
            console.error('❌ Erro ao fazer parse da resposta:', error);
            const responseText = await response.text();
            console.error('📄 Resposta recebida:', responseText);
            throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
        }
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao gerar cupom');
        }
        // Atualizar interface de sucesso com dados reais do cupom
        document.getElementById('generated-coupon').textContent = result.coupon.name;
        document.getElementById('coupon-value').textContent = `R$ ${parseFloat(result.coupon.value).toFixed(2).replace('.', ',')}`;
        document.getElementById('coupon-expiry').textContent = new Date(result.coupon.expires).toLocaleDateString('pt-BR');
        generatedCoupon = result.coupon.name;
        // Mostrar seção de sucesso
        showRedeemSuccessSection();
        showToast('🎉 Resgate realizado com sucesso!', 'success');
        // Atualizar bônus disponível
        const newBonus = result.novoBonus;
        document.getElementById('bonus-resgate').textContent = `R$ ${newBonus.toFixed(2).replace('.', ',')}`;
        // Recarregar estatísticas
        setTimeout(() => {
            loadStats();
        }, 1000);
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
        // Voltar para o formulário
        document.getElementById('redeem-loading').style.display = 'none';
        document.getElementById('redeem-form-section').classList.remove('hidden');
    }
}
// Gerar código do cupom
function generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'BONUS';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Copiar cupom
function copyCoupon() {
    if (generatedCoupon) {
        navigator.clipboard.writeText(generatedCoupon).then(() => {
            showToast('✅ Código do cupom copiado!', 'success');
        }).catch(() => {
            showToast('❌ Erro ao copiar código', 'error');
        });
    }
}

// Acessar loja
async function accessStore() {
    try {
        showToast('🏪 Redirecionando para a loja...', 'info');
        
        // Obter URL da loja do backend
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/store-url', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Redirecionar para a loja em nova aba
            window.open(data.url, '_blank');
        } else {
            // Fallback para URL padrão
            window.open('https://vip.altoastralrp.com/categories/339970', '_blank');
        }
    } catch (error) {
        console.error('❌ Erro ao obter URL da loja:', error);
        // Fallback para URL padrão
        window.open('https://vip.altoastralrp.com/categories/339970', '_blank');
    }
}

// Função para mostrar todos os conteúdos
function showAllContent() {
    // Criar modal para mostrar todos os conteúdos
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh;">
            <div class="modal-header">
                <h3><i class="fas fa-list"></i> Todos os Meus Conteúdos</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = 'auto';">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="max-height: calc(90vh - 120px); overflow-y: auto;">
                <div id="all-content-list">
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #6366f1;"></i>
                        <p>Carregando todos os conteúdos...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Carregar todos os conteúdos
    loadAllContentForModal();
}

// Carregar todos os conteúdos para a modal
async function loadAllContentForModal() {
    try {
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/conteudos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const conteudos = await response.json();
            renderAllContentInModal(conteudos);
        } else {
            document.getElementById('all-content-list').innerHTML = `
                <div style="text-align: center; color: #e53e3e; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                    <p>Erro ao carregar conteúdos</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar todos os conteúdos:', error);
        document.getElementById('all-content-list').innerHTML = `
            <div style="text-align: center; color: #e53e3e; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Erro ao carregar conteúdos</p>
            </div>
        `;
    }
}

// Renderizar todos os conteúdos na modal
function renderAllContentInModal(conteudos) {
    const allContentList = document.getElementById('all-content-list');
    
    if (conteudos.length === 0) {
        allContentList.innerHTML = `
            <div style="text-align: center; color: #718096; padding: 40px;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhum conteúdo registrado ainda</p>
            </div>
        `;
        return;
    }
    
    const contentHTML = conteudos.map(conteudo => `
        <div class="content-item" style="margin-bottom: 16px;">
            <div class="content-header">
                <span class="content-type">${getContentTypeLabel(conteudo.tipo)}</span>
                <span class="content-status ${getStatusClass(conteudo.status)}">
                    ${getStatusLabel(conteudo.status)}
                </span>
            </div>
            <div class="content-details">
                ${conteudo.visualizacoes > 0 ? `<p><strong>Visualizações:</strong> ${conteudo.visualizacoes}</p>` : ''}
                ${conteudo.tipo === 'live' && conteudo.tempo_live ? `<p><strong>Tempo da Live:</strong> ${conteudo.tempo_live} horas</p>` : ''}
                ${conteudo.observacoes ? `<p><strong>Observações:</strong> ${conteudo.observacoes}</p>` : ''}
                <p><strong>Data:</strong> ${new Date(conteudo.created_at).toLocaleDateString('pt-BR')}</p>
                ${(conteudo.print_video || conteudo.print_foto) ? `
                    <div style="margin-top: 8px;">
                        <button class="btn btn-sm btn-outline" onclick="viewContentImage('${conteudo.print_video || conteudo.print_foto}', '${conteudo.tipo}')">
                            <i class="fas fa-image"></i> Ver Comprovante
                        </button>
                    </div>
                ` : ''}
                ${((conteudo.tipo === 'fotos' && conteudo.link_foto) || (conteudo.tipo === 'video' && conteudo.link_video)) ? `
                    <div style="margin-top: 8px;">
                        <button class="btn btn-sm btn-primary" onclick="window.open('${conteudo.tipo === 'fotos' ? conteudo.link_foto : conteudo.link_video}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Abrir Conteúdo
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    allContentList.innerHTML = contentHTML;
}

// Adicionar exibição das áreas do criador no modal de novo conteúdo
function showCreatorAreasInPublicationModal(creator) {
    const modal = document.getElementById('new-publication-modal');
    if (!modal) return;
    let areas = creator.areas && creator.areas.length > 0
        ? creator.areas.map(area => area.nome)
        : (creator.area_nome ? [creator.area_nome] : []);
    let html = '';
    if (areas.length > 0) {
        html = `<div class="creator-areas-info" style="margin-bottom:16px;">
            <strong>Suas Categorias:</strong> <span style="color:#6366f1;font-weight:600;">${areas.join(', ')}</span>
        </div>`;
    }
    // Insere no topo do modal, antes do formulário
    const form = modal.querySelector('form');
    if (form && !modal.querySelector('.creator-areas-info')) {
        form.insertAdjacentHTML('afterbegin', html);
    }
}

// Chamar exibição das áreas ao abrir o modal de novo conteúdo
const openNewPublicationModalOrig = window.openNewPublicationModal;
window.openNewPublicationModal = function() {
    if (typeof window.currentCreatorData === 'object') {
        showCreatorAreasInPublicationModal(window.currentCreatorData);
        filterContentTypes(window.currentCreatorData); // Garante que o select será filtrado
    }
    openNewPublicationModalOrig();
};



function showLevelUpBanner() {
    if (document.getElementById('level-up-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'level-up-banner';
    banner.style = 'background:#10b981;color:white;padding:24px 16px;border-radius:12px;margin:24px 0;text-align:center;font-size:1.3em;box-shadow:0 2px 12px rgba(16,185,129,0.15);';
    
    // Verificar se é contratado para mostrar mensagem específica
    const isContratado = window.creatorData && window.creatorData.contratado;
    
    let bannerContent = '';
    if (isContratado) {
        bannerContent = `🎉 <b>Parabéns!</b> Você atingiu todas as metas e já solicitou saque!<br><span style='display:block;margin:10px 0 18px 0;font-size:0.95em;color:#fff;background:#059669;padding:8px 12px;border-radius:8px;'>Agora você pode upar de nível! Ao upar, seu cupom será resetado e todos os códigos de WL serão apagados. O cupom será recriado automaticamente.</span>`;
    } else {
        bannerContent = `🎉 <b>Parabéns!</b> Você atingiu todas as metas para upar de nível!<br><span style='display:block;margin:10px 0 18px 0;font-size:0.95em;color:#fff;background:#059669;padding:8px 12px;border-radius:8px;'>Ao upar de nível, seu cupom será resetado e todos os códigos de WL serão apagados. O cupom de valor vendido será recriado com o mesmo nome e atualizado automaticamente.</span>`;
    }
    
    banner.innerHTML = bannerContent + `<button id='btn-up-level' style='margin-top:8px;padding:12px 32px;font-size:1.1em;background:#fff;color:#10b981;border:none;border-radius:8px;cursor:pointer;font-weight:600;box-shadow:0 1px 6px rgba(16,185,129,0.10);transition:background 0.2s;'>⬆️ Upar de nível agora</button>`;
    
    document.querySelector('.progress-card').appendChild(banner);
    document.getElementById('btn-up-level').onclick = async function() {
        this.disabled = true;
        this.textContent = 'Processando...';
        try {
            const token = localStorage.getItem('creator_token');
            const response = await fetch('/api/creators/level-up', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) {
                banner.innerHTML = `✅ <b>Nível upado com sucesso!</b> Cupom e códigos WL resetados.`;
                setTimeout(() => { banner.remove(); loadStats(); }, 2500);
            } else {
                banner.innerHTML = `<span style='color:#fff;background:#e53e3e;padding:8px 16px;border-radius:6px;'>${result.error || 'Erro ao upar de nível'}</span>`;
                setTimeout(() => { banner.remove(); }, 3000);
            }
        } catch (e) {
            banner.innerHTML = `<span style='color:#fff;background:#e53e3e;padding:8px 16px;border-radius:6px;'>Erro ao upar de nível</span>`;
            setTimeout(() => { banner.remove(); }, 3000);
        }
    };
}
// A verificação de up de nível agora é feita dentro de createAreasProgress

// Função para visualizar imagem de comprovante
function viewContentImage(imageUrl, contentType) {
    if (!imageUrl) {
        showToast('❌ Nenhuma imagem de comprovante disponível', 'error');
        return;
    }
    
    // Criar modal para visualizar a imagem
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            position: relative;
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 10px;
            ">
                <h3 style="margin: 0; color: #374151;">
                    <i class="fas fa-image"></i> 
                    Comprovante - ${getContentTypeLabel(contentType)}
                </h3>
                <button onclick="this.closest('.modal').remove()" style="
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 5px;
                ">×</button>
            </div>
            <div style="text-align: center;">
                <img src="${imageUrl}" alt="Comprovante" style="
                    max-width: 100%;
                    max-height: 70vh;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                ">
            </div>
            <div style="
                margin-top: 15px;
                text-align: center;
                padding-top: 10px;
                border-top: 1px solid #e2e8f0;
            ">
                <button onclick="this.closest('.modal').remove()" style="
                    background: #6366f1;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">Fechar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Expor função globalmente
window.viewContentImage = viewContentImage;

// ===== SISTEMA DE SAQUE =====

// Função para verificar se o criador bateu todas as metas
function verificarMetasCompletas(stats) {
    if (!window.creatorData || !window.creatorData.contratado) {
        return false;
    }
    
    // Pegar as áreas do criador (usar areas_ids da API se disponível, senão do window.creatorData)
    let areasIds = [];
    
    if (stats.areas_ids && Array.isArray(stats.areas_ids)) {
        // Usar areas_ids da API (já processado)
        areasIds = stats.areas_ids;
    } else {
        // Fallback para window.creatorData
        try {
            if (window.creatorData.areas_ids) {
                areasIds = JSON.parse(window.creatorData.areas_ids);
                // Garantir que é um array
                if (!Array.isArray(areasIds)) {
                    areasIds = [];
                }
            }
        } catch (error) {
            console.error('❌ Erro ao fazer parse das áreas:', error);
            areasIds = [];
        }
    }
    
    // Se não tem áreas definidas, não pode fazer saque
    if (areasIds.length === 0) {
        return false;
    }
    
    const metaHorasLive = parseFloat(stats.meta_horas_live || 0);
    const metaFotos = parseFloat(stats.meta_fotos || 0);
    const metaVideos = parseFloat(stats.meta_videos || 0);
    
    const horasLive = parseFloat(stats.horas_live || 0);
    const fotosAprovadas = parseInt(stats.fotos_aprovadas || 0);
    const videosAprovados = parseInt(stats.videos_aprovados || 0);
    
    // Verificar apenas as metas das áreas que o criador tem
    let metasCompletas = true;
    
    // Verificar meta de horas live (se tem área LIVE)
    if (areasIds.includes(3)) { // ID da área LIVE
        const horasCompletas = metaHorasLive > 0 ? horasLive >= metaHorasLive : true;
        metasCompletas = metasCompletas && horasCompletas;
    }
    
    // Verificar meta de fotos (se tem área FOTOS)
    if (areasIds.includes(1)) { // ID da área FOTOS
        const fotosCompletas = metaFotos > 0 ? fotosAprovadas >= metaFotos : true;
        metasCompletas = metasCompletas && fotosCompletas;
    }
    
    // Verificar meta de vídeos (se tem área VIDEO)
    if (areasIds.includes(2)) { // ID da área VIDEO
        const videosCompletos = metaVideos > 0 ? videosAprovados >= metaVideos : true;
        metasCompletas = metasCompletas && videosCompletos;
    }
    
    return metasCompletas;
}



// Função para debug do status do criador
async function debugCriadorStatus() {
    try {
        const token = localStorage.getItem('creator_token');
        const response = await fetch('/api/creators/debug-status', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('🔍 DEBUG - Status do Criador:', result);
            
            // Mostrar informações no console e em um alert para facilitar
            const debugInfo = `
🔍 DEBUG - Status do Criador

👤 Criador:
- ID: ${result.criador.id}
- Nome: ${result.criador.nome}
- Contratado: ${result.criador.contratado ? 'Sim' : 'Não'}
- Nível: ${result.criador.nivel}


💰 Saques:
- Total de Saques: ${result.todosSaques.length}
- Saques Válidos (Pendente/Aprovado/Pago): ${result.saquesValidos}
- Pode Upar: ${result.podeUpar ? 'Sim' : 'Não'}

📋 Detalhes dos Saques:
${result.todosSaques.map(saque => 
  `- ID: ${saque.id}, Status: ${saque.status}, Valor: R$ ${saque.valor_solicitado}, Data: ${saque.data_solicitacao}`
).join('\n')}
            `;
            
            console.log(debugInfo);
            alert(debugInfo);
        } else {
            console.error('❌ Erro no debug:', result.error);
            alert('Erro ao buscar debug: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Erro no debug:', error);
        alert('Erro ao buscar debug: ' + error.message);
    }
}

// Função para mostrar banner de que precisa fazer saque antes de upar
function showSaqueRequiredBanner() {
    if (document.getElementById('saque-required-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'saque-required-banner';
    banner.style = 'background:#f59e0b;color:white;padding:24px 16px;border-radius:12px;margin:24px 0;text-align:center;font-size:1.3em;box-shadow:0 2px 12px rgba(245,158,11,0.15);';
    banner.innerHTML = `🎯 <b>Metas Atingidas!</b> Solicite um saque para upar automaticamente!<br><span style='display:block;margin:10px 0 18px 0;font-size:0.95em;color:#fff;background:#d97706;padding:8px 12px;border-radius:8px;'>Criadores contratados são upados automaticamente quando solicitam saque. Solicite seu saque quando tiver valor disponível.</span><div style='margin-top:8px;'><button id='btn-saque-info' style='padding:12px 32px;font-size:1.1em;background:#fff;color:#f59e0b;border:none;border-radius:8px;cursor:pointer;font-weight:600;box-shadow:0 1px 6px rgba(245,158,11,0.10);transition:background 0.2s;'>💰 Ver Saque Disponível</button></div>`;
    
    document.querySelector('.progress-card').appendChild(banner);
    
    document.getElementById('btn-saque-info').onclick = function() {
        // Fechar banner
        banner.remove();
        // Mostrar toast informativo
        showToast('💡 Verifique se você tem valor disponível para saque no card "Ganhos com Conteúdo"', 'info');
    };
}

// Função para abrir modal de saque
function openSaqueModal() {
    const modal = document.getElementById('saque-modal');
    const valorDisponivel = document.getElementById('valor-saque-disponivel');
    const valorGanhoConteudo = document.getElementById('valor-ganho-conteudo');
    
    // Pegar o valor atual do card de ganhos
    const valorTexto = valorGanhoConteudo.textContent;
    const valor = parseFloat(valorTexto.replace('R$ ', '').replace(',', '.'));
    
    valorDisponivel.textContent = valorTexto;
    
    // Resetar formulário
    document.getElementById('saqueForm').reset();
    
    // Mostrar seção do formulário
    document.getElementById('saque-form-section').style.display = 'block';
    document.getElementById('saque-success-section').style.display = 'none';
    document.getElementById('saque-loading').style.display = 'none';
    
    modal.classList.add('show');
}

// Função para fechar modal de saque
function closeSaqueModal() {
    const modal = document.getElementById('saque-modal');
    modal.classList.remove('show');
}

// Função para processar solicitação de saque
async function handleSaqueSubmit(e) {
    e.preventDefault();
    
    const loading = document.getElementById('saque-loading');
    const formSection = document.getElementById('saque-form-section');
    
    // Mostrar loading
    loading.style.display = 'flex';
    formSection.style.display = 'none';
    
    try {
        const formData = new FormData(e.target);
        const token = localStorage.getItem('creator_token');
        
        const response = await fetch('/api/creators/saque', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_chave: formData.get('tipo_chave'),
                chave_pix: formData.get('chave_pix'),
                nome_beneficiario: formData.get('nome_beneficiario')
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Preencher dados de confirmação
            document.getElementById('saque-valor-confirmado').textContent = result.valor_solicitado;
            document.getElementById('saque-chave-confirmada').textContent = result.chave_pix;
            document.getElementById('saque-beneficiario-confirmado').textContent = result.nome_beneficiario;
            
            // Mostrar seção de sucesso
            showSaqueSuccessSection();
            
            // Se houve up automático, mostrar mensagem especial
            if (result.up_automatico) {
                showToast('🎉 Saque solicitado e nível upado automaticamente!', 'success');
            }
            
            // Recarregar estatísticas para atualizar o valor disponível e nível
            setTimeout(() => {
                loadStats();
                loadCreatorData(); // Recarregar dados do criador para atualizar nível
            }, 1000);
            
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao processar solicitação de saque');
        }
        
    } catch (error) {
        console.error('❌ Erro ao solicitar saque:', error);
        showToast(`❌ ${error.message}`, 'error');
        
        // Voltar para o formulário
        loading.style.display = 'none';
        formSection.style.display = 'block';
    }
}

// Função para mostrar seção de sucesso
function showSaqueSuccessSection() {
    document.getElementById('saque-loading').style.display = 'none';
    document.getElementById('saque-form-section').style.display = 'none';
    document.getElementById('saque-success-section').style.display = 'block';
}

// Expor funções globalmente
window.openSaqueModal = openSaqueModal;
window.closeSaqueModal = closeSaqueModal;
window.handleSaqueSubmit = handleSaqueSubmit;

// Funções de Ranking
async function loadRankings() {
    try {
        console.log('🏆 Carregando rankings...');
        
        // Carregar todos os rankings em paralelo
        const [videosRanking, livesRanking, indicacoesRanking] = await Promise.all([
            loadVideosRanking(),
            loadLivesRanking(),
            loadIndicacoesRanking()
        ]);
        
        console.log('✅ Rankings carregados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar rankings:', error);
    }
}

async function loadVideosRanking() {
    try {
        const response = await fetch('/api/creators/ranking/videos', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('creator_token')}`
            }
        });
        
        if (response.ok) {
            const ranking = await response.json();
            renderVideosRanking(ranking);
            return ranking;
        } else {
            throw new Error('Erro ao carregar ranking de vídeos');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar ranking de vídeos:', error);
        showRankingError('videos-ranking-list');
    }
}

async function loadLivesRanking() {
    try {
        const response = await fetch('/api/creators/ranking/lives', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('creator_token')}`
            }
        });
        
        if (response.ok) {
            const ranking = await response.json();
            renderLivesRanking(ranking);
            return ranking;
        } else {
            throw new Error('Erro ao carregar ranking de lives');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar ranking de lives:', error);
        showRankingError('lives-ranking-list');
    }
}

async function loadIndicacoesRanking() {
    try {
        const response = await fetch('/api/creators/ranking/indicacoes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('creator_token')}`
            }
        });
        
        if (response.ok) {
            const ranking = await response.json();
            renderIndicacoesRanking(ranking);
            return ranking;
        } else {
            throw new Error('Erro ao carregar ranking de indicações');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar ranking de indicações:', error);
        showRankingError('indicacoes-ranking-list');
    }
}

function renderVideosRanking(ranking) {
    const container = document.getElementById('videos-ranking-list');
    
    if (!ranking || ranking.length === 0) {
        container.innerHTML = `
            <div class="empty-ranking">
                <i class="fas fa-video"></i>
                <p>Nenhum vídeo aprovado ainda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = ranking.map((creator, index) => `
        <div class="ranking-item">
            <div class="ranking-position rank-${index + 1}">${index + 1}</div>
            <img src="${creator.foto_perfil || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdFRUEiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDUgMTUuMzQgNSAxOFYyMEgxOVYxOEMxOSAxNS4zNCAxNC42NyAxNCAxMiAxNFoiLz4KPC9zdmc+Cjwvc3ZnPgo='}" alt="${creator.nome}" class="ranking-avatar" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdFRUEiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDUgMTUuMzQgNSAxOFYyMEgxOVYxOEMxOSAxNS4zNCAxNC42NyAxNCAxMiAxNFoiLz4KPC9zdmc+Cjwvc3ZnPgo='">
            <div class="ranking-info">
                <div class="ranking-name">${creator.nome}</div>
                <div class="ranking-value">${creator.videos_aprovados} vídeos aprovados</div>
            </div>
            <div class="ranking-badge">
                <i class="fas fa-video"></i>
                ${creator.videos_aprovados}
            </div>
        </div>
    `).join('');
}

function renderLivesRanking(ranking) {
    const container = document.getElementById('lives-ranking-list');
    
    if (!ranking || ranking.length === 0) {
        container.innerHTML = `
            <div class="empty-ranking">
                <i class="fas fa-broadcast-tower"></i>
                <p>Nenhuma live registrada ainda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = ranking.map((creator, index) => {
        const horas = Math.floor(creator.total_horas_live);
        const minutos = Math.round((creator.total_horas_live - horas) * 60);
        const tempoFormatado = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;
        
        return `
            <div class="ranking-item">
                <div class="ranking-position rank-${index + 1}">${index + 1}</div>
                <img src="${creator.foto_perfil || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdFRUEiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDUgMTUuMzQgNSAxOFYyMEgxOVYxOEMxOSAxNS4zNCAxNC42NyAxNCAxMiAxNFoiLz4KPC9zdmc+Cjwvc3ZnPgo='}" alt="${creator.nome}" class="ranking-avatar" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdFRUEiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDUgMTUuMzQgNSAxOFYyMEgxOVYxOEMxOSAxNS4zNCAxNC42NyAxNCAxMiAxNFoiLz4KPC9zdmc+Cjwvc3ZnPgo='">
                <div class="ranking-info">
                    <div class="ranking-name">${creator.nome}</div>
                    <div class="ranking-value">${tempoFormatado} de live</div>
                </div>
                <div class="ranking-badge">
                    <i class="fas fa-broadcast-tower"></i>
                    ${horas}h
                </div>
            </div>
        `;
    }).join('');
}

function renderIndicacoesRanking(ranking) {
    const container = document.getElementById('indicacoes-ranking-list');
    
    if (!ranking || ranking.length === 0) {
        container.innerHTML = `
            <div class="empty-ranking">
                <i class="fas fa-users"></i>
                <p>Nenhuma indicação registrada ainda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = ranking.map((creator, index) => `
        <div class="ranking-item">
            <div class="ranking-position rank-${index + 1}">${index + 1}</div>
            <img src="${creator.foto_perfil || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdFRUEiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDUgMTUuMzQgNSAxOFYyMEgxOVYxOEMxOSAxNS4zNCAxNC42NyAxNCAxMiAxNFoiLz4KPC9zdmc+Cjwvc3ZnPgo='}" alt="${creator.nome}" class="ranking-avatar" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdFRUEiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDUgMTUuMzQgNSAxOFYyMEgxOVYxOEMxOSAxNS4zNCAxNC42NyAxNCAxMiAxNFoiLz4KPC9zdmc+Cjwvc3ZnPgo='">
            <div class="ranking-info">
                <div class="ranking-name">${creator.nome}</div>
                <div class="ranking-value">${creator.total_indicados} indicações</div>
            </div>
            <div class="ranking-badge">
                <i class="fas fa-users"></i>
                ${creator.total_indicados}
            </div>
        </div>
    `).join('');
}

function showRankingError(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="ranking-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Erro ao carregar ranking</p>
        </div>
    `;
}