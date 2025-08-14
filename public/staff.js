// Variáveis globais
let currentUser = null;
let creators = [];
let admins = [];
let logs = [];
let socket = null;
let currentEditingCreator = null;
let currentSort = { field: null, direction: 'asc' };

// Configuração da API base URL
const API_BASE_URL = '';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem('staff_token');
    if (token) {
        try {
            const response = await fetch('/api/admin/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                showDashboard();
                setupNavigation();
                loadData();
                connectSocket();
            } else {
                logout();
            }
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            logout();
        }
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Filtros
    document.getElementById('status-filter').addEventListener('change', filterCreators);
    document.getElementById('search-input').addEventListener('input', filterCreators);
    
    // Filtros de pagamentos
    const saqueStatusFilter = document.getElementById('saque-status-filter');
    const saqueSearchInput = document.getElementById('saque-search-input');
    
    if (saqueStatusFilter) {
        saqueStatusFilter.addEventListener('change', filterPagamentos);
    }
    if (saqueSearchInput) {
        saqueSearchInput.addEventListener('input', filterPagamentos);
    }
    
    // Headers de ordenação
    document.querySelectorAll('.creators-table th.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    // Headers de ordenação para outras tabelas (quando implementadas)
    document.querySelectorAll('.admins-table th.sortable, .logs-table th.sortable, .contratados-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            // Implementar ordenação específica para cada tabela quando necessário
            console.log('Sort clicked:', th.dataset.sort);
        });
    });
    
    // Modal
    document.getElementById('creator-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // Formulário de edição de criador
    document.getElementById('creator-edit-form').addEventListener('submit', handleCreatorEdit);

    // Formulário de novo admin
    document.getElementById('new-admin-form').addEventListener('submit', handleNewAdmin);
    
    // Formulário de novo contratado
    document.getElementById('new-contratado-form').addEventListener('submit', handleNewContratadoSubmit);

    // Formulário de edição de contratado
    document.getElementById('edit-contratado-form').addEventListener('submit', handleEditContratadoSubmit);

    // Fechar modais ao clicar fora
    document.getElementById('creator-edit-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCreatorEditModal();
        }
    });

    document.getElementById('new-admin-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeNewAdminModal();
        }
    });
    
    document.getElementById('new-contratado-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeNewContratadoModal();
        }
    });

    document.getElementById('edit-contratado-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditContratadoModal();
        }
    });

    document.getElementById('edit-contratado-areas-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditContratadoAreasModal();
        }
    });
}

// Manipular login
async function handleLogin(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(e.target);
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            localStorage.setItem('staff_token', result.token);
            currentUser = result.user;
            showDashboard();
            setupNavigation();
            loadData();
            connectSocket();
            showToast('Login realizado com sucesso!', 'success');
        } else {
            throw new Error(result.error || 'Erro no login');
        }
        
    } catch (error) {
        console.error('Erro no login:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Mostrar dashboard
function showDashboard() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Atualizar informações do usuário
    const userInfo = document.getElementById('user-info');
    userInfo.innerHTML = `
        <div class="user-name">${currentUser.nome}</div>
        <div class="user-level">${currentUser.nivel}</div>
        <button class="logout-btn" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Sair
        </button>
    `;
}

// Logout
function logout() {
    localStorage.removeItem('staff_token');
    currentUser = null;
    creators = [];
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('login-form').reset();
}

// Conectar Socket.IO
function connectSocket() {
    // Desabilitado - não conecta ao Socket.IO
    updateConnectionStatus('manual', 'Manual');
    console.log('Tempo real desabilitado - use o botão Atualizar');
    
    // Não inicializa socket
    // socket = io();
    
    // Não escuta eventos
    // socket.on('connect', () => {});
    // socket.on('creator-status-updated', () => {});
    // socket.on('new-creator-registered', () => {});
    // socket.on('disconnect', () => {});
}

function updateConnectionStatus(status, text) {
    const statusElement = document.getElementById('connection-status');
    const textElement = document.getElementById('connection-text');
    
    if (statusElement && textElement) {
        statusElement.className = `connection-status ${status}`;
        textElement.textContent = text;
    }
}

// Funções de atualização inteligente desabilitadas
// function updateCreatorInList(updatedCreator) { }
// function addNewCreatorToList(newCreator) { }
// function updateStatsOnly() { }

// Carregar dados
async function loadData() {
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        console.log('Token encontrado:', !!token);
        
        // Carregar criadores
        const creatorsResponse = await fetch('/api/staff/criadores', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response criadores status:', creatorsResponse.status);
        
        if (creatorsResponse.ok) {
            try {
                creators = await creatorsResponse.json();
                console.log('Criadores carregados:', creators.length);
                renderCreators();
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta:', error);
                const responseText = await creatorsResponse.text();
                console.error('📄 Resposta recebida:', responseText);
                throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
            }
        } else {
            let errorData;
            try {
                errorData = await creatorsResponse.json();
                console.error('Erro na resposta criadores:', errorData);
                throw new Error(errorData.error || 'Erro ao carregar criadores');
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta de erro:', error);
                throw new Error('Erro ao carregar criadores');
            }
        }
        
        // Carregar estatísticas
        const statsResponse = await fetch('/api/staff/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response stats status:', statsResponse.status);
        
        if (statsResponse.ok) {
            let stats;
            try {
                stats = await statsResponse.json();
                updateStats(stats);
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta de stats:', error);
                const responseText = await statsResponse.text();
                console.error('📄 Resposta de stats recebida:', responseText);
                throw new Error('Resposta inválida do servidor para estatísticas.');
            }
        } else {
            let errorData;
            try {
                errorData = await statsResponse.json();
                console.error('Erro na resposta stats:', errorData);
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta de erro de stats:', error);
                throw new Error('Erro ao carregar estatísticas');
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Atualizar estatísticas
function updateStats(stats) {
    document.getElementById('total-criadores').textContent = stats.total;
    document.getElementById('pendentes').textContent = stats.pendentes;
    document.getElementById('aprovados').textContent = stats.aprovados;
    document.getElementById('rejeitados').textContent = stats.rejeitados;
}

// Função auxiliar para processar áreas
function getAreasText(creator) {
    if (creator.areas_nomes && creator.areas_nomes.length > 0) {
        // areas_nomes pode ser uma string (GROUP_CONCAT) ou array
        return Array.isArray(creator.areas_nomes) ? creator.areas_nomes.join(', ') : creator.areas_nomes;
    } else if (creator.area_nome) {
        return creator.area_nome;
    }
    return 'N/A';
}

function formatMetas(creator) {
    const metaHorasLive = creator.meta_horas_live || 0;
    const metaFotos = creator.meta_fotos || 0;
    const metaVideos = creator.meta_videos || 0;
    
    const metas = [];
    
    if (metaHorasLive > 0) {
        metas.push(`Live: ${metaHorasLive}h`);
    }
    if (metaFotos > 0) {
        metas.push(`Fotos: ${metaFotos}`);
    }
    if (metaVideos > 0) {
        metas.push(`Vídeos: ${metaVideos}`);
    }
    
    if (metas.length === 0) {
        return '<span class="text-muted">Não definidas</span>';
    }
    
    return metas.join('<br>');
}

// Renderizar criadores
function renderCreators() {
    const tbody = document.getElementById('creators-tbody');
    tbody.innerHTML = '';
    
    // Aplicar ordenação se houver
    let sortedCreators = [...creators];
    if (currentSort.field) {
        sortedCreators = sortCreators(sortedCreators, currentSort.field, currentSort.direction);
    }
    
    sortedCreators.forEach(creator => {
        const row = document.createElement('tr');
        
        // Processar áreas
        let areasText = getAreasText(creator);
        
        // Formatar metas
        const metasText = formatMetas(creator);
        
        row.innerHTML = `
            <td>${creator.nome}</td>
            <td>${creator.discord_id || 'N/A'}</td>
            <td>${creator.game_id || 'N/A'}</td>
            <td>${areasText}</td>
            <td>
                <span class="cupom-badge">
                    ${creator.cupom_desconto || 'N/A'}
                </span>
            </td>
            <td>R$ ${(creator.cupom_vendas || 0).toFixed(2).replace('.', ',')}</td>
            <td>${creator.indicados || 0}</td>
            <td>${metasText}</td>
            <td>
                <span class="status-badge ${creator.contratado ? 'status-aprovado' : 'status-pendente'}">
                    ${creator.contratado ? 'Sim' : 'Não'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${creator.status}">
                    ${getStatusText(creator.status)}
                </span>
            </td>
            <td>${formatDate(creator.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewCreator(${creator.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-edit" onclick="editCreator(${creator.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${creator.status === 'pendente' ? `
                        <button class="btn-approve" onclick="approveCreator(${creator.id})" title="Aprovar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-reject" onclick="rejectCreator(${creator.id})" title="Rejeitar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Ordenar criadores
function handleSort(field) {
    // Alternar direção se clicar no mesmo campo
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    // Atualizar indicadores visuais
    updateSortIndicators();
    
    // Aplicar filtros e ordenação
    filterCreators();
}

// Atualizar indicadores visuais de ordenação
function updateSortIndicators() {
    // Remover todas as classes de ordenação
    document.querySelectorAll('.creators-table th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
    });
    
    // Adicionar classe ao campo atual
    if (currentSort.field) {
        const currentTh = document.querySelector(`[data-sort="${currentSort.field}"]`);
        if (currentTh) {
            currentTh.classList.add(currentSort.direction);
        }
    }
}

// Filtrar criadores
function filterCreators() {
    const statusFilter = document.getElementById('status-filter').value;
    const searchFilter = document.getElementById('search-input').value.toLowerCase();
    
    let filteredCreators = creators.filter(creator => {
        const matchesStatus = !statusFilter || creator.status === statusFilter;
        const matchesSearch = !searchFilter || 
            creator.nome.toLowerCase().includes(searchFilter) ||
            (creator.discord_id && creator.discord_id.toLowerCase().includes(searchFilter)) ||
            (creator.game_id && creator.game_id.toLowerCase().includes(searchFilter));
        
        return matchesStatus && matchesSearch;
    });
    
    // Aplicar ordenação
    if (currentSort.field) {
        filteredCreators = sortCreators(filteredCreators, currentSort.field, currentSort.direction);
    }
    
    renderFilteredCreators(filteredCreators);
}

// Função de ordenação
function sortCreators(creators, field, direction) {
    return creators.sort((a, b) => {
        let aValue, bValue;
        
        switch (field) {
            case 'nome':
                aValue = a.nome.toLowerCase();
                bValue = b.nome.toLowerCase();
                break;
            case 'discord_id':
                aValue = (a.discord_id || '').toLowerCase();
                bValue = (b.discord_id || '').toLowerCase();
                break;
            case 'game_id':
                aValue = (a.game_id || '').toLowerCase();
                bValue = (b.game_id || '').toLowerCase();
                break;
            case 'area':
                aValue = getAreasText(a).toLowerCase();
                bValue = getAreasText(b).toLowerCase();
                break;
            case 'cupom':
                aValue = (a.cupom_desconto || '').toLowerCase();
                bValue = (b.cupom_desconto || '').toLowerCase();
                break;
            case 'vendas':
                aValue = parseFloat(a.cupom_vendas || 0);
                bValue = parseFloat(b.cupom_vendas || 0);
                break;
            case 'indicados':
                aValue = parseInt(a.indicados || 0);
                bValue = parseInt(b.indicados || 0);
                break;
            case 'metas':
                // Ordenar pela soma total das metas
                const aTotalMetas = (a.meta_horas_live || 0) + (a.meta_fotos || 0) + (a.meta_videos || 0);
                const bTotalMetas = (b.meta_horas_live || 0) + (b.meta_fotos || 0) + (b.meta_videos || 0);
                aValue = aTotalMetas;
                bValue = bTotalMetas;
                break;
            case 'contratado':
                aValue = a.contratado ? 1 : 0;
                bValue = b.contratado ? 1 : 0;
                break;
            case 'status':
                aValue = a.status.toLowerCase();
                bValue = b.status.toLowerCase();
                break;
            case 'data':
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
                break;
            default:
                return 0;
        }
        
        if (direction === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
    });
}

// Renderizar criadores filtrados
function renderFilteredCreators(filteredCreators) {
    const tbody = document.getElementById('creators-tbody');
    tbody.innerHTML = '';
    
    if (filteredCreators.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 40px; color: #666;">
                    Nenhum criador encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    filteredCreators.forEach(creator => {
        const row = document.createElement('tr');
        
        // Processar áreas
        let areasText = getAreasText(creator);
        
        // Formatar metas
        const metasText = formatMetas(creator);
        
        row.innerHTML = `
            <td>${creator.nome}</td>
            <td>${creator.discord_id || 'N/A'}</td>
            <td>${creator.game_id || 'N/A'}</td>
            <td>${areasText}</td>
            <td>
                <span class="cupom-badge">
                    ${creator.cupom_desconto || 'N/A'}
                </span>
            </td>
            <td>R$ ${(creator.cupom_vendas || 0).toFixed(2).replace('.', ',')}</td>
            <td>${creator.indicados || 0}</td>
            <td>${metasText}</td>
            <td>
                <span class="status-badge ${creator.contratado ? 'status-aprovado' : 'status-pendente'}">
                    ${creator.contratado ? 'Sim' : 'Não'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${creator.status}">
                    ${getStatusText(creator.status)}
                </span>
            </td>
            <td>${formatDate(creator.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewCreator(${creator.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    ${creator.status === 'pendente' ? `
                        <button class="btn-approve" onclick="approveCreator(${creator.id})">
                            <i class="fas fa-check"></i> Aprovar
                        </button>
                        <button class="btn-reject" onclick="rejectCreator(${creator.id})">
                            <i class="fas fa-times"></i> Rejeitar
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Ver criador
async function viewCreator(id) {
    try {
        console.log('🔍 viewCreator chamada com ID:', id);
        console.log('🔍 Token staff:', localStorage.getItem('staff_token') ? 'Presente' : 'Ausente');
        
        showLoading();
        
        const response = await fetch(`/api/staff/criadores/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        
        if (response.ok) {
            const creator = await response.json();
            console.log('✅ Criador carregado:', creator.nome);
            console.log('✅ Dados completos do criador:', creator);
            
            // Verificar se a função showCreatorModal existe
            if (typeof showCreatorModal === 'function') {
                console.log('✅ Função showCreatorModal encontrada');
                showCreatorModal(creator);
            } else {
                console.error('❌ Função showCreatorModal não encontrada!');
                alert('Erro: Função showCreatorModal não encontrada');
            }
        } else {
            const errorData = await response.json();
            console.error('❌ Erro na resposta:', errorData);
            throw new Error('Erro ao carregar dados do criador');
        }
        
    } catch (error) {
        console.error('❌ Erro ao ver criador:', error);
        console.error('❌ Stack trace:', error.stack);
        showToast('Erro ao carregar dados do criador', 'error');
    } finally {
        hideLoading();
    }
}

// Mostrar modal do criador
function showCreatorModal(creator) {
    console.log('🎭 showCreatorModal chamada para:', creator.nome);
    console.log('🎭 Creator object:', creator);
    
    try {
        const modal = document.getElementById('creator-modal');
        const modalBody = document.getElementById('modal-body');
        
        console.log('🔍 Modal encontrado:', !!modal);
        console.log('🔍 Modal body encontrado:', !!modalBody);
        console.log('🔍 Modal element:', modal);
        console.log('🔍 Modal body element:', modalBody);
        
        if (!modal) {
            console.error('❌ Modal não encontrado!');
            alert('Erro: Modal não encontrado no DOM');
            return;
        }
        
        if (!modalBody) {
            console.error('❌ Modal body não encontrado!');
            alert('Erro: Modal body não encontrado no DOM');
            return;
        }
        
        // Armazenar criador atual para navegação
        currentEditingCreator = creator;
        console.log('💾 Criador armazenado em currentEditingCreator');
        
        const respostas = JSON.parse(creator.respostas || '[]');
        console.log('📝 Respostas carregadas:', respostas.length);
        console.log('📝 Tipo de respostas:', typeof respostas);
        console.log('📝 Respostas é array:', Array.isArray(respostas));
        console.log('📝 Conteúdo de respostas:', respostas);
        
        // Garantir que respostas seja sempre um array
        const respostasArray = Array.isArray(respostas) ? respostas : [];
        console.log('📝 Respostas como array:', respostasArray);
        
        console.log('🖼️ URL da imagem:', creator.profile_image);
        
        // Verificar se a URL do Discord é válida
        if (creator.profile_image && creator.profile_image.includes('discord.com')) {
            console.log('✅ URL do Discord detectada');
        } else if (creator.profile_image) {
            console.log('⚠️ URL não é do Discord:', creator.profile_image);
        } else {
            console.log('❌ Nenhuma imagem fornecida');
        }
        
        // Escapar a URL da imagem para evitar problemas no HTML
        const safeImageUrl = creator.profile_image ? creator.profile_image.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
        console.log('🔒 URL segura da imagem:', safeImageUrl);
        
        console.log('📝 Gerando HTML do modal...');
        
        const modalHTML = `
            <div class="creator-details">
                <div class="detail-group">
                    <label>Nome:</label>
                    <span>${creator.nome}</span>
                </div>
                <div class="detail-group">
                    <label>Email:</label>
                    <span>${creator.email}</span>
                </div>
                <div class="detail-group">
                    <label>Telefone:</label>
                    <span>${creator.telefone || 'Não informado'}</span>
                </div>
                <div class="detail-group">
                    <label>Discord ID:</label>
                    <span>${creator.discord_id || 'Não informado'}</span>
                </div>
                <div class="detail-group">
                    <label>ID do Jogo:</label>
                    <span>${creator.game_id || 'Não informado'}</span>
                </div>
                <div class="detail-group">
                    <label>Áreas:</label>
                    <span>${getAreasText(creator)}</span>
                </div>
                <div class="detail-group">
                    <label>Status:</label>
                    <span class="status-badge status-${creator.status}">
                        ${getStatusText(creator.status)}
                    </span>
                </div>
                <div class="detail-group">
                    <label>Data do Cadastro:</label>
                    <span>${formatDate(creator.created_at)}</span>
                </div>
                ${creator.observacoes ? `
                    <div class="detail-group">
                        <label>Observações:</label>
                        <span>${creator.observacoes}</span>
                    </div>
                ` : ''}
                ${creator.profile_image ? `
                    <div class="detail-group">
                        <label>Print do Perfil:</label>
                        <div class="profile-image-container">
                            <img src="${safeImageUrl}" alt="Print do perfil" class="profile-image" 
                                 onload="console.log('✅ Imagem carregada com sucesso:', '${safeImageUrl}')"
                                 onerror="console.error('❌ Erro ao carregar imagem:', '${safeImageUrl}'); this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div style="display: none; color: #666; font-style: italic; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                                <i class="fas fa-exclamation-triangle"></i> Imagem não disponível
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="detail-group">
                        <label>Print do Perfil:</label>
                        <span style="color: #999; font-style: italic;">Não fornecido</span>
                    </div>
                `}
            </div>
            
            ${respostasArray.length > 0 ? `
                <div class="responses-section">
                    <h4>Respostas às Perguntas da Área</h4>
                    ${respostasArray.map(resposta => `
                        <div class="response-item">
                            <div class="response-question">${resposta.pergunta}</div>
                            <div class="response-answer">${resposta.resposta}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            

            
            ${creator.status === 'pendente' ? `
                <div class="approval-form">
                    <h4>Aprovação</h4>
                    <div class="form-group">
                        <label for="observacoes">Observações (opcional):</label>
                        <textarea id="observacoes" rows="3" placeholder="Digite observações sobre a aprovação/rejeição..."></textarea>
                    </div>
                    <div class="approval-actions">
                        <button class="btn btn-approve" onclick="approveCreator(${creator.id})" title="Aprovar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-reject" onclick="rejectCreator(${creator.id})" title="Rejeitar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
        
        console.log('📝 HTML gerado com sucesso, tamanho:', modalHTML.length, 'caracteres');
        console.log('📝 Inserindo HTML no modal body...');
        
        modalBody.innerHTML = modalHTML;
        
        console.log('✅ HTML inserido no modal body');
        console.log('🎭 Removendo classe hidden do modal...');
        
        modal.classList.remove('hidden');
        
        // Forçar visibilidade e z-index alto
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        
        console.log('✅ Modal deve estar visível agora');
        console.log('🔍 Classes do modal:', modal.className);
        console.log('🔍 Display do modal:', modal.style.display);
        console.log('🔍 Z-index do modal:', modal.style.zIndex);
        console.log('🔍 Visibility do modal:', modal.style.visibility);
        console.log('🔍 Opacity do modal:', modal.style.opacity);
        
        // Verificar se o modal está realmente visível
        const computedStyle = window.getComputedStyle(modal);
        console.log('🔍 Computed display:', computedStyle.display);
        console.log('🔍 Computed visibility:', computedStyle.visibility);
        console.log('🔍 Computed opacity:', computedStyle.opacity);
        console.log('🔍 Computed z-index:', computedStyle.zIndex);
        
    } catch (error) {
        console.error('❌ Erro em showCreatorModal:', error);
        console.error('❌ Stack trace:', error.stack);
        alert('Erro ao mostrar modal: ' + error.message);
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('creator-modal').classList.add('hidden');
    currentEditingCreator = null;
}

// Voltar ao modal do criador
function backToCreatorModal() {
    if (currentEditingCreator) {
        showCreatorModal(currentEditingCreator);
    } else {
        closeModal();
    }
}

// Aprovar criador
async function approveCreator(id) {
    await updateCreatorStatus(id, 'aprovado');
}

// Rejeitar criador
async function rejectCreator(id) {
    await updateCreatorStatus(id, 'rejeitado');
}

// Atualizar status do criador
async function updateCreatorStatus(id, status) {
    try {
        const observacoes = document.getElementById('observacoes')?.value || '';
        
        const response = await fetch(`/api/staff/criadores/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            },
            body: JSON.stringify({
                status,
                observacoes
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`Criador ${status} com sucesso!`, 'success');
            closeModal();
            loadData();
        } else {
            // Se for erro de status já alterado, atualizar a página
            if (result.error && (result.error.includes('já está') || result.error.includes('já está aprovado') || result.error.includes('já está rejeitado') || result.error.includes('Criador aprovado não pode ser rejeitado') || result.error.includes('Apenas criadores pendentes podem ser alterados'))) {
                showToast('Dados desatualizados. Atualizando...', 'info');
                setTimeout(() => {
                    loadData();
                    closeModal();
                }, 1000);
                return;
            }
            throw new Error(result.error || 'Erro ao atualizar status');
        }
        
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showToast(error.message, 'error');
    }
}

// Editar áreas do criador
async function editCreatorAreas(creatorId) {
    console.log('editCreatorAreas chamada com ID:', creatorId);
    alert('Função editCreatorAreas chamada com ID: ' + creatorId);
    try {
        showLoading();
        
        // Buscar áreas disponíveis
        const areasResponse = await fetch('/api/creators/areas');
        const areas = await areasResponse.json();
        
        // Buscar criador atual
        const creatorResponse = await fetch(`/api/staff/criadores/${creatorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        const creator = await creatorResponse.json();
        
        const currentAreas = creator.areas_ids ? JSON.parse(creator.areas_ids) : [];
        
        // Criar modal de edição de áreas
        const modal = document.getElementById('creator-modal');
        const modalBody = document.getElementById('modal-body');
        
        modal.classList.remove('hidden');
        modalBody.innerHTML = `
            <div class="edit-areas-form">
                <h4>Editar Áreas do Criador</h4>
                <p><strong>Criador:</strong> ${creator.nome}</p>
                
                <div class="areas-selection">
                    <h5>Selecione as Áreas:</h5>
                    <div class="areas-grid-edit">
                        ${areas.map(area => `
                            <div class="area-card-edit ${currentAreas.includes(area.id) ? 'selected' : ''}" 
                                 onclick="toggleAreaSelection(${area.id}, this)">
                                <div class="area-icon">
                                    <i class="${getAreaIcon(area.nome)}"></i>
                                </div>
                                <div class="area-title">${area.nome}</div>
                                <div class="area-description">${area.descricao}</div>
                                <div class="area-checkbox">
                                    <i class="fas fa-check"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="edit-actions">
                    <button class="btn btn-secondary" onclick="backToCreatorModal()">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                    <button class="btn btn-primary" onclick="saveCreatorAreas(${creatorId})">
                        <i class="fas fa-save"></i> Salvar Áreas
                    </button>
                </div>
            </div>
        `;
        
        hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar áreas:', error);
        showToast('Erro ao carregar áreas', 'error');
        hideLoading();
    }
}

// Alternar seleção de área na edição
function toggleAreaSelection(areaId, element) {
    element.classList.toggle('selected');
}

// Salvar áreas do criador
async function saveCreatorAreas(creatorId) {
    try {
        showLoading();
        
        const selectedAreas = Array.from(document.querySelectorAll('.area-card-edit.selected'))
            .map(card => {
                const onclick = card.getAttribute('onclick');
                const match = onclick.match(/toggleAreaSelection\((\d+)/);
                return match ? parseInt(match[1]) : null;
            })
            .filter(id => id !== null);
        
        const response = await fetch(`/api/staff/criadores/${creatorId}/areas`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            },
            body: JSON.stringify({
                areas_ids: selectedAreas
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Áreas atualizadas com sucesso!', 'success');
            loadData();
            closeModal();
        } else {
            throw new Error(result.error || 'Erro ao atualizar áreas');
        }
        
    } catch (error) {
        console.error('Erro ao salvar áreas:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Editar dados do criador
async function editCreatorData(creatorId) {
    console.log('editCreatorData chamada com ID:', creatorId);
    alert('Função editCreatorData chamada com ID: ' + creatorId);
    try {
        showLoading();
        
        // Buscar criador atual
        const creatorResponse = await fetch(`/api/staff/criadores/${creatorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        const creator = await creatorResponse.json();
        
        // Criar modal de edição de dados
        const modal = document.getElementById('creator-modal');
        const modalBody = document.getElementById('modal-body');
        
        modal.classList.remove('hidden');
        modalBody.innerHTML = `
            <div class="edit-data-form">
                <h4>Editar Dados do Criador</h4>
                
                <form id="edit-creator-form">
                    <div class="form-group">
                        <label for="edit-nome">Nome:</label>
                        <input type="text" id="edit-nome" value="${creator.nome}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-email">Email:</label>
                        <input type="email" id="edit-email" value="${creator.email}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-telefone">Telefone:</label>
                        <input type="tel" id="edit-telefone" value="${creator.telefone || ''}" placeholder="(11) 99999-9999">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-discord">Discord ID:</label>
                        <input type="text" id="edit-discord" value="${creator.discord_id || ''}" placeholder="123456789012345678">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-game">ID do Jogo:</label>
                        <input type="text" id="edit-game" value="${creator.game_id || ''}" required>
                    </div>
                    
                    <div class="edit-actions">
                        <button type="button" class="btn btn-secondary" onclick="backToCreatorModal()">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar Dados
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        // Adicionar event listener para o formulário
        document.getElementById('edit-creator-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveCreatorData(creatorId);
        });
        
        hideLoading();
        
    } catch (error) {
        console.error('Erro ao carregar dados do criador:', error);
        showToast('Erro ao carregar dados do criador', 'error');
        hideLoading();
    }
}

// Salvar dados do criador
async function saveCreatorData(creatorId) {
    try {
        showLoading();
        
        const formData = {
            nome: document.getElementById('edit-nome').value,
            email: document.getElementById('edit-email').value,
            telefone: document.getElementById('edit-telefone').value,
            discord_id: document.getElementById('edit-discord').value,
            game_id: document.getElementById('edit-game').value
        };
        
        const response = await fetch(`/api/staff/criadores/${creatorId}/data`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Dados atualizados com sucesso!', 'success');
            loadData();
            closeModal();
        } else {
            throw new Error(result.error || 'Erro ao atualizar dados');
        }
        
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Função auxiliar para obter ícone da área
function getAreaIcon(areaName) {
    const icons = {
        'video': 'fas fa-video',
        'fotos': 'fas fa-camera',
        'live': 'fas fa-broadcast-tower',
        'default': 'fas fa-th-large'
    };
    
    const name = areaName.toLowerCase();
    if (name.includes('video')) return icons.video;
    if (name.includes('foto')) return icons.fotos;
    if (name.includes('live')) return icons.live;
    return icons.default;
}

// Atualizar dados
function refreshData() {
    // Resetar ordenação
    currentSort = { field: null, direction: 'asc' };
    updateSortIndicators();
    loadData();
}

// Utilitários
function getStatusText(status) {
    const texts = {
        'pendente': 'Cadastro em Análise',
        'aprovado': 'Aprovado',
        'rejeitado': 'Rejeitado',
        'suspenso': 'Conta Suspensa'
    };
    return texts[status] || 'Desconhecido';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Loading
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 
                 'fas fa-info-circle';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remover toast após 5 segundos
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Funções globais
window.logout = logout;
window.viewCreator = viewCreator;
window.approveCreator = approveCreator;
window.rejectCreator = rejectCreator;
window.closeModal = closeModal;
window.refreshData = refreshData;

// ===== FUNÇÕES DO ADMIN =====

// Configurar navegação baseada no nível do usuário
function setupNavigation() {
    const adminsTab = document.querySelector('[data-tab="admins"]');
    
    if (currentUser && currentUser.nivel === 'super_admin') {
        if (adminsTab) {
            adminsTab.style.display = 'block';
        }
    } else {
        if (adminsTab) {
            adminsTab.style.display = 'none';
        }
    }
}

// Trocar entre abas
function switchTab(tabName) {
    // Ocultar todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover classe active de todos os botões
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Carregar dados da aba
    switch(tabName) {
        case 'criadores':
            loadData();
            break;
        case 'contratados':
            loadContratados();
            break;
        case 'pagamentos':
            loadPagamentos();
            break;
        case 'admins':
            loadAdmins();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

// Carregar admins (apenas super admin)
async function loadAdmins() {
    if (!currentUser || currentUser.nivel !== 'super_admin') {
        return;
    }
    
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/admins`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            admins = data.admins || data || [];
            renderAdmins();
        } else {
            throw new Error(`Erro ao carregar admins: ${response.status}`);
        }
    } catch (error) {
        console.error('Erro ao carregar admins:', error);
        showToast('Erro ao carregar admins', 'error');
    } finally {
        hideLoading();
    }
}

// Renderizar admins
function renderAdmins() {
    const tbody = document.getElementById('admins-tbody');
    
    if (!tbody) {
        console.error('Elemento admins-tbody não encontrado!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (admins.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    Nenhum admin encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    admins.forEach((admin) => {
        const row = document.createElement('tr');
        
        const nome = admin.nome || 'N/A';
        const username = admin.username || 'N/A';
        const email = admin.email || 'N/A';
        const nivel = admin.nivel || 'admin';
        const ativo = admin.ativo !== false;
        
        const rowHTML = `
            <td>${nome}</td>
            <td>${username}</td>
            <td>${email}</td>
            <td>
                <span class="status-badge status-${nivel}">
                    ${nivel.toUpperCase()}
                </span>
            </td>
            <td>
                <span class="status-badge status-${ativo ? 'aprovado' : 'rejeitado'}">
                    ${ativo ? 'ATIVO' : 'INATIVO'}
                </span>
            </td>
            <td>${admin.ultimo_login ? formatDate(admin.ultimo_login) : 'Nunca'}</td>
            <td>${formatDate(admin.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editAdmin(${admin.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-danger" onclick="removeAdmin(${admin.id}, '${nome.replace(/'/g, "\\'")}')" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });
}

// Editar admin
function editAdmin(adminId) {
    showToast('Funcionalidade em desenvolvimento', 'info');
}

// Remover admin
async function removeAdmin(adminId, adminName) {
    if (!confirm(`Tem certeza que deseja remover o admin "${adminName}"? Esta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/admins/${adminId}/deactivate`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Admin removido com sucesso!', 'success');
            loadAdmins();
        } else {
            throw new Error('Erro ao remover admin');
        }
    } catch (error) {
        console.error('Erro ao remover admin:', error);
        showToast('Erro ao remover admin', 'error');
    } finally {
        hideLoading();
    }
}

// Abrir modal de novo admin
function openNewAdminModal() {
    document.getElementById('new-admin-modal').classList.remove('hidden');
}

// Fechar modal de novo admin
function closeNewAdminModal() {
    document.getElementById('new-admin-modal').classList.add('hidden');
    document.getElementById('new-admin-form').reset();
}

// Manipular criação de novo admin
async function handleNewAdmin(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(e.target);
        const adminData = {
            username: formData.get('new-admin-username'),
            password: formData.get('new-admin-password'),
            nome: formData.get('new-admin-nome'),
            email: formData.get('new-admin-email'),
            nivel: formData.get('new-admin-nivel')
        };
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/admins`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adminData)
        });
        
        if (response.ok) {
            showToast('Admin criado com sucesso!', 'success');
            closeNewAdminModal();
            loadAdmins();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar admin');
        }
    } catch (error) {
        console.error('Erro ao criar admin:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Carregar logs
async function loadLogs() {
    try {
        console.log('🔄 Iniciando carregamento de logs...');
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        console.log('🔑 Token encontrado:', !!token);
        
        const filters = getLogFilters();
        console.log('📋 Filtros aplicados:', filters);
        
        const queryParams = new URLSearchParams(filters).toString();
        const url = `${API_BASE_URL}/api/admin/logs?${queryParams}`;
        console.log('🌐 URL da requisição:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Status da resposta:', response.status);
        console.log('📡 Headers da resposta:', response.headers);
        
        if (response.ok) {
            let data;
            try {
                data = await response.json();
                console.log('📊 Dados recebidos:', data);
                logs = data.logs || [];
                console.log('📝 Logs processados:', logs.length);
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta:', error);
                const responseText = await response.text();
                console.error('📄 Resposta recebida:', responseText);
                throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
            }
            
            // Log de teste para verificar se há logs
            if (logs.length === 0) {
                console.log('⚠️ Nenhum log encontrado. Isso pode indicar que:');
                console.log('   1. Não há logs na tabela admin_logs');
                console.log('   2. As ações não estão sendo registradas');
                console.log('   3. Há um problema na consulta SQL');
            }
            
            renderLogs();
        } else {
            const errorData = await response.json();
            console.error('❌ Erro na resposta:', errorData);
            console.error('❌ Status da resposta:', response.status);
            throw new Error(`Erro ao carregar logs: ${response.status} - ${errorData.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar logs:', error);
        console.error('❌ Stack trace:', error.stack);
        showToast(`Erro ao carregar logs: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Obter filtros de logs
function getLogFilters() {
    return {
        admin_id: document.getElementById('log-admin').value,
        acao: document.getElementById('log-action').value,
        tabela: document.getElementById('log-table').value,
        data_inicio: document.getElementById('log-date-start').value,
        data_fim: document.getElementById('log-date-end').value
    };
}

// Aplicar filtros de logs
function applyLogFilters() {
    loadLogs();
}

// Renderizar logs
function renderLogs() {
    const tbody = document.getElementById('logs-tbody');
    
    if (!tbody) {
        console.error('❌ Elemento logs-tbody não encontrado!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    Nenhum log encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    logs.forEach((log, index) => {
        const row = document.createElement('tr');
        
        const rowHTML = `
            <td>${formatDate(log.created_at)}</td>
            <td>${log.admin_nome || 'N/A'}</td>
            <td>${log.acao || 'N/A'}</td>
            <td>${log.tabela || 'N/A'}</td>
            <td>${log.registro_id || 'N/A'}</td>
            <td>${log.dados_anteriores ? JSON.stringify(log.dados_anteriores, null, 2) : 'N/A'}</td>
            <td>${log.dados_novos ? JSON.stringify(log.dados_novos, null, 2) : 'N/A'}</td>
        `;
        
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });
}

// Atualizar admins
function refreshAdmins() {
    loadAdmins();
}

// Atualizar logs
function refreshLogs() {
    loadLogs();
}

// Criar log de teste
async function createTestLog() {
    try {
        console.log('🧪 Iniciando criação de log de teste...');
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        console.log('🔑 Token para teste:', !!token);
        
        const response = await fetch(`${API_BASE_URL}/api/admin/test-log`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Status da resposta do teste:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Log de teste criado:', result);
            showToast('Log de teste criado com sucesso!', 'success');
            
            // Recarregar logs após criar o teste
            setTimeout(() => {
                loadLogs();
            }, 1000);
        } else {
            const errorData = await response.json();
            console.error('❌ Erro ao criar log de teste:', errorData);
            throw new Error(errorData.error || 'Erro ao criar log de teste');
        }
    } catch (error) {
        console.error('❌ Erro ao criar log de teste:', error);
        showToast(`Erro ao criar log de teste: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ===== FUNÇÕES DE EDIÇÃO DE CRIADOR =====

// Editar criador
async function editCreator(creatorId) {
    const creator = creators.find(c => c.id == creatorId);
    if (!creator) {
        showToast('Criador não encontrado', 'error');
        return;
    }
    
    currentEditingCreator = creator;
    
    // Preencher formulário
    document.getElementById('edit-nome').value = creator.nome;
    // Preencher os campos de display
    
    document.getElementById('display-nivel').textContent = creator.nivel || 1;
    document.getElementById('display-nivel').setAttribute('data-field', 'nivel');
    document.getElementById('display-bonus').textContent = creator.bonus_acumulado || 0;
    document.getElementById('display-bonus').setAttribute('data-field', 'bonus');
    document.getElementById('display-ultimo-up').textContent = creator.ultimo_up_nivel ? formatDate(creator.ultimo_up_nivel) : 'Nunca';
    document.getElementById('display-ultimo-up').setAttribute('data-field', 'ultimo-up');
    document.getElementById('display-cupom-atual').textContent = creator.cupom_desconto || 'N/A';
    document.getElementById('display-cupom-atual').setAttribute('data-field', 'cupom-atual');
    document.getElementById('display-cupom-novo').textContent = 'Clique no lápis para editar';
    document.getElementById('display-cupom-novo').setAttribute('data-field', 'cupom-novo');
    // Novos campos:
    document.getElementById('display-email').textContent = creator.email || '';
    document.getElementById('edit-email').value = creator.email || '';
    document.getElementById('display-discord').textContent = creator.discord_id || '';
    document.getElementById('edit-discord').value = creator.discord_id || '';
    // Áreas
    let areasText = getAreasText(creator);
    document.getElementById('display-areas').textContent = areasText;
    document.getElementById('display-areas').setAttribute('data-field', 'areas');
    document.getElementById('edit-areas-container').innerHTML = '';
    
    // Status da conta
    const statusText = getStatusText(creator.status);
    document.getElementById('display-status').textContent = statusText;
    document.getElementById('edit-status').value = creator.status;
    // Mostrar modal
    document.getElementById('creator-edit-modal').classList.remove('hidden');
}

// Fechar modal de edição de criador
function closeCreatorEditModal() {
    document.getElementById('creator-edit-modal').classList.add('hidden');
    resetAllFieldsToDisplay();
    currentEditingCreator = null;
}

// Alternar modo de edição de campo
function toggleFieldEdit(fieldName) {
    const displayElement = document.getElementById(`display-${fieldName}`);
    const inputElement = document.getElementById(`edit-${fieldName}`);
    if (fieldName === 'areas') {
        if (displayElement.style.display !== 'none') {
            displayElement.style.display = 'none';
            document.getElementById('edit-areas-container').style.display = 'block';
            loadAreasForEdit();
            displayElement.classList.add('editing');
        } else {
            displayElement.style.display = 'block';
            document.getElementById('edit-areas-container').style.display = 'none';
            displayElement.classList.remove('editing');
        }
        return;
    }
    
    if (fieldName === 'status') {
        if (displayElement.style.display !== 'none') {
            displayElement.style.display = 'none';
            inputElement.style.display = 'block';
            displayElement.classList.add('editing');
        } else {
            displayElement.style.display = 'block';
            inputElement.style.display = 'none';
            displayElement.classList.remove('editing');
            
            // Atualizar texto de exibição baseado no valor selecionado
            const selectedOption = inputElement.options[inputElement.selectedIndex];
            displayElement.textContent = selectedOption ? selectedOption.text : 'Desconhecido';
        }
        return;
    }
    if (displayElement && inputElement) {
        if (displayElement.style.display !== 'none') {
            displayElement.style.display = 'none';
            inputElement.style.display = 'block';
            inputElement.focus();
            displayElement.classList.add('editing');
        } else {
            displayElement.style.display = 'block';
            inputElement.style.display = 'none';
            displayElement.classList.remove('editing');
            
            // Atualizar texto de exibição baseado no valor do input
            if (fieldName === 'ultimo-up') {
                const dateValue = inputElement.value;
                displayElement.textContent = dateValue ? formatDate(dateValue) : 'Nunca';
            } else if (fieldName === 'cupom-novo') {
                displayElement.textContent = inputElement.value || 'Clique no lápis para editar';
            } else {
                displayElement.textContent = inputElement.value;
            }
        }
    }
}

// Resetar todos os campos para modo de exibição
function resetAllFieldsToDisplay() {
            const fields = ['nivel', 'bonus', 'ultimo-up', 'cupom-novo', 'status'];
    fields.forEach(field => {
        const displayElement = document.getElementById(`display-${field}`);
        const inputElement = document.getElementById(`edit-${field}`);
        
        if (displayElement && inputElement) {
            displayElement.style.display = 'block';
            inputElement.style.display = 'none';
            displayElement.classList.remove('editing');
        }
    });
}

// Manipular edição de criador
async function handleCreatorEdit(e) {
    e.preventDefault();
    
    if (!currentEditingCreator) {
        showToast('Nenhum criador selecionado', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const fields = ['nivel', 'bonus', 'ultimo-up', 'cupom-novo', 'email', 'discord', 'areas', 'status'];
        let hasChanges = false;
        
        for (const field of fields) {
            if (field === 'areas') {
                const container = document.getElementById('edit-areas-container');
                if (container.style.display !== 'none') {
                    // Salvar áreas
                    const selected = Array.from(container.querySelectorAll('.area-card-edit.selected')).map(card => parseInt(card.getAttribute('data-area-id')));
                    const original = currentEditingCreator.areas_ids ? JSON.parse(currentEditingCreator.areas_ids) : [];
                    if (JSON.stringify(selected.sort()) !== JSON.stringify(original.sort())) {
                        await updateCreatorField('areas', selected);
                        hasChanges = true;
                    }
                }
                continue;
            }
            
            if (field === 'status') {
                const inputElement = document.getElementById(`edit-${field}`);
                if (inputElement && inputElement.style.display !== 'none') {
                    const newStatus = inputElement.value;
                    const originalStatus = currentEditingCreator.status;
                    
                    if (newStatus !== originalStatus) {
                        await updateCreatorAccountStatus(newStatus);
                        hasChanges = true;
                    }
                }
                continue;
            }
            const inputElement = document.getElementById(`edit-${field}`);
            if (inputElement && inputElement.style.display !== 'none') {
                // Campo está em modo de edição
                let value = inputElement.value;
                let parsedValue = value;
                
                // Converter valores conforme necessário
                if (field === 'xp' || field === 'bonus') {
                    parsedValue = value ? parseFloat(value) : 0;
                    if (isNaN(parsedValue)) {
                        showToast('Bônus deve ser um número válido', 'error');
                        return;
                    }
                } else if (field === 'nivel') {
                    parsedValue = value ? parseInt(value) : 1;
                    if (isNaN(parsedValue) || parsedValue < 1) {
                        showToast('Nível deve ser um número positivo', 'error');
                        return;
                    }
                }
                
                // Verificar se o valor mudou
                const originalValue = currentEditingCreator[
            
                    field === 'nivel' ? 'nivel' :
                    field === 'bonus' ? 'bonus_acumulado' :
                    field === 'ultimo-up' ? 'ultimo_up_nivel' :
                    field === 'cupom-novo' ? 'cupom_desconto' :
                    field === 'email' ? 'email' :
                    field === 'discord' ? 'discord_id' :
                    null
                ];
                
                if (parsedValue !== originalValue) {
                    await updateCreatorField(field, parsedValue);
                    hasChanges = true;
                }
            }
        }
        
        if (!hasChanges) {
            showToast('Nenhuma alteração foi feita', 'info');
            return;
        }
        
        showToast('Criador atualizado com sucesso!', 'success');
        closeCreatorEditModal();
        loadData();
        
    } catch (error) {
        console.error('Erro ao editar criador:', error);
        showToast('Erro ao editar criador', 'error');
    } finally {
        hideLoading();
    }
}

// Atualizar status da conta do criador
async function updateCreatorAccountStatus(newStatus) {
    try {
        const token = localStorage.getItem('staff_token');
        const creatorId = currentEditingCreator.id;
        
        const response = await fetch(`/api/staff/criadores/${creatorId}/account-status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: newStatus,
                observacoes: `Status alterado via painel de edição`
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`Status da conta alterado para ${getStatusText(newStatus)}`, 'success');
            currentEditingCreator.status = newStatus;
        } else {
            // Se for erro de status já alterado, atualizar a página
            if (result.error && (result.error.includes('já está') || result.error.includes('já está aprovado') || result.error.includes('já está rejeitado') || result.error.includes('suspenso') || result.error.includes('Criador aprovado não pode ser rejeitado') || result.error.includes('Apenas criadores pendentes podem ser alterados'))) {
                showToast('Dados desatualizados. Atualizando...', 'info');
                setTimeout(() => {
                    loadData();
                    closeCreatorEditModal();
                }, 1000);
                return;
            }
            throw new Error(result.error || 'Erro ao alterar status da conta');
        }
        
    } catch (error) {
        console.error('Erro ao alterar status da conta:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

// Atualizar campo específico do criador
async function updateCreatorField(field, value) {
    const token = localStorage.getItem('staff_token');
    const creatorId = currentEditingCreator.id;
    
    let endpoint = '';
    let payload = {};
    
    switch (field) {
        case 'nivel':
            endpoint = `${API_BASE_URL}/api/admin/criadores/${creatorId}/nivel`;
            payload = { nivel: value };
            break;
        case 'bonus':
            endpoint = `${API_BASE_URL}/api/admin/criadores/${creatorId}/bonus`;
            payload = { bonus: value };
            break;
        case 'ultimo-up':
            endpoint = `${API_BASE_URL}/api/admin/criadores/${creatorId}/ultimo-up`;
            payload = { data: value };
            break;
        case 'cupom-novo':
            endpoint = `${API_BASE_URL}/api/admin/criadores/${creatorId}/cupom`;
            payload = { cupom_nome: value };
            break;
        case 'email':
            endpoint = `${API_BASE_URL}/api/admin/criadores/${creatorId}/email`;
            payload = { email: value };
            break;
        case 'discord':
            endpoint = `${API_BASE_URL}/api/admin/criadores/${creatorId}/discord`;
            payload = { discord_id: value };
            break;
        case 'areas':
            endpoint = `${API_BASE_URL}/api/admin/criadores/${creatorId}/areas`;
            payload = { areas_ids: value };
            break;
    }
    
    const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar campo');
    }
}

// Carregar áreas para edição
async function loadAreasForEdit() {
    const container = document.getElementById('edit-areas-container');
    container.innerHTML = '<span style="color:#888">Carregando áreas...</span>';
    
    try {
        const response = await fetch('/api/creators/areas');
        const areas = await response.json();
        
        const selectedIds = currentEditingCreator.areas_ids ? JSON.parse(currentEditingCreator.areas_ids) : [];
        
        container.innerHTML = `
            <div class="areas-grid-edit">
                ${areas.map(area => `
                    <div class="area-card-edit ${selectedIds.includes(area.id) ? 'selected' : ''}" 
                         data-area-id="${area.id}" 
                         onclick="toggleAreaEditSelection(${area.id}, this)">
                        <div class="area-icon">
                            <i class="${getAreaIcon(area.nome)}"></i>
                        </div>
                        <div class="area-title">${area.nome}</div>
                        <div class="area-description">${area.descricao}</div>
                        <div class="area-checkbox">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar áreas:', error);
        container.innerHTML = '<span style="color:#e53e3e">Erro ao carregar áreas</span>';
    }
}

// Alternar seleção de área na edição
window.toggleAreaEditSelection = function(areaId, element) {
    element.classList.toggle('selected');
};

// Deletar cupom do criador
async function deleteCreatorCoupon() {
    if (!currentEditingCreator) {
        showToast('Nenhum criador selecionado', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja deletar o cupom deste criador?')) {
        return;
    }
    
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/criadores/${currentEditingCreator.id}/cupom`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showToast('Cupom deletado com sucesso!', 'success');
            document.getElementById('display-cupom-atual').textContent = 'N/A';
            currentEditingCreator.cupom_desconto = null;
        } else {
            throw new Error('Erro ao deletar cupom');
        }
    } catch (error) {
        console.error('Erro ao deletar cupom:', error);
        showToast('Erro ao deletar cupom', 'error');
    } finally {
        hideLoading();
    }
}

// Funções globais adicionais
window.switchTab = switchTab;
window.editCreator = editCreator;
window.closeCreatorEditModal = closeCreatorEditModal;
window.toggleFieldEdit = toggleFieldEdit;
window.openNewAdminModal = openNewAdminModal;
window.closeNewAdminModal = closeNewAdminModal;
window.editAdmin = editAdmin;
window.removeAdmin = removeAdmin;
window.refreshAdmins = refreshAdmins;
window.refreshLogs = refreshLogs;
window.applyLogFilters = applyLogFilters;
window.deleteCreatorCoupon = deleteCreatorCoupon;
window.createTestLog = createTestLog;

// ===== FUNÇÕES PARA GERENCIAMENTO DE CONTRATADOS =====

// Carregar contratados
async function loadContratados() {
    try {
        console.log('🔍 Iniciando loadContratados...');
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        console.log('🔑 Token obtido:', token ? 'Sim' : 'Não');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/contratados`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Dados recebidos:', data);
            
            contratados = data.contratados || data || [];
            console.log('👥 Contratados carregados:', contratados.length);
            
            updateContratadosStats();
            renderContratados();
        } else {
            const errorText = await response.text();
            console.error('❌ Response error:', errorText);
            throw new Error(`Erro ao carregar contratados: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar contratados:', error);
        showToast('Erro ao carregar contratados', 'error');
    } finally {
        hideLoading();
    }
}

// Atualizar estatísticas dos contratados
function updateContratadosStats() {
    const total = contratados.length;
    const comConteudos = contratados.filter(c => (c.conteudos_aprovados || 0) > 0).length;
    
    // Calcular total de ganhos dos contratados
    const totalGanhos = contratados.reduce((total, contratado) => {
        const valorHoraLive = parseFloat(contratado.valor_hora_live) || 0;
        const valor10kVisualizacao = parseFloat(contratado.valor_10k_visualizacao) || 0;
        const valorIndicacao = parseFloat(contratado.valor_indicacao) || 0;
        
        const totalHorasLive = parseFloat(contratado.total_horas_live) || 0;
        const totalVisualizacoesVideo = parseFloat(contratado.total_visualizacoes_video) || 0;
        const indicados = parseInt(contratado.indicados) || 0;
        
        let ganhosContratado = 0;
        ganhosContratado += totalHorasLive * valorHoraLive;  // Live aprovada
        
        // Calcular valor de vídeos baseado em visualizações
        const valorVideo = (totalVisualizacoesVideo / 10000) * valor10kVisualizacao;
        ganhosContratado += valorVideo;  // Vídeos aprovados
        
        ganhosContratado += indicados * valorIndicacao;  // Indicações
        
        return total + ganhosContratado;
    }, 0);
    
    document.getElementById('total-contratados').textContent = total;
    document.getElementById('contratados-ativos').textContent = comConteudos;
    document.getElementById('contratados-pendentes').textContent = `R$ ${totalGanhos.toFixed(2).replace('.', ',')}`;
}

// Renderizar contratados
function renderContratados() {
    console.log('🎨 Iniciando renderContratados...');
    console.log('📋 Contratados para renderizar:', contratados);
    
    const tbody = document.getElementById('contratados-tbody');
    
    if (!tbody) {
        console.error('❌ Elemento contratados-tbody não encontrado!');
        return;
    }
    
    console.log('✅ Elemento tbody encontrado');
    tbody.innerHTML = '';
    
    if (contratados.length === 0) {
        console.log('📭 Nenhum contratado encontrado, exibindo mensagem vazia');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-user-tie" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Nenhum criador contratado encontrado</p>
                    <button class="btn btn-primary" onclick="openNewContratadoModal()">
                        <i class="fas fa-plus"></i> Contratar Primeiro Criador
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    contratados.forEach((contratado) => {
        const row = document.createElement('tr');
        
        const gameId = contratado.game_id || 'N/A';
        const nome = contratado.nome || 'N/A';
        const areas = contratado.areas_nomes || 'N/A';
        
        // Usar dados do banco de dados (mais confiável)
        const totalConteudos = contratado.conteudos_aprovados || 0;
        const totalHorasLive = parseFloat(contratado.total_horas_live || 0);
        const totalFotos = parseInt(contratado.total_fotos || 0);
        const totalVideos = parseInt(contratado.total_videos || 0);
        
        // Obter metas do contratado
        const metaHorasLive = contratado.meta_horas_live || 0;
        const metaFotos = contratado.meta_fotos || 0;
        const metaVideos = contratado.meta_videos || 0;
        
        // Log para debug
        console.log(`📊 Progresso para ${contratado.nome}:`, {
            totalHorasLive,
            totalFotos,
            totalVideos,
            metaHorasLive,
            metaFotos,
            metaVideos
        });
        
        // Calcular progresso individual por área
        const progressLive = metaHorasLive > 0 ? Math.min((totalHorasLive / metaHorasLive) * 100, 100) : 0;
        const progressFotos = metaFotos > 0 ? Math.min((totalFotos / metaFotos) * 100, 100) : 0;
        const progressVideos = metaVideos > 0 ? Math.min((totalVideos / metaVideos) * 100, 100) : 0;
        
        // Criar barras de progresso para cada área
        const progressBars = [];
        
        // Barra de progresso para Live
        if (metaHorasLive > 0) {
            progressBars.push(`
                <div class="area-progress">
                    <div class="area-progress-header">
                        <i class="fas fa-broadcast-tower"></i>
                        <span>Live: ${totalHorasLive}h/${metaHorasLive}h</span>
                    </div>
                    <div class="progress-bar" data-progress="${progressLive.toFixed(0)}%">
                        <div class="progress-fill ${getProgressClass(progressLive)}" style="width: ${progressLive}%"></div>
                    </div>
                </div>
            `);
        } else if (totalHorasLive > 0) {
            progressBars.push(`
                <div class="area-progress">
                    <div class="area-progress-header">
                        <i class="fas fa-broadcast-tower"></i>
                        <span>Live: ${totalHorasLive}h</span>
                    </div>
                    <div class="progress-bar" data-progress="0%">
                        <div class="progress-fill low" style="width: 0%"></div>
                    </div>
                </div>
            `);
        }
        
        // Barra de progresso para Fotos
        if (metaFotos > 0) {
            progressBars.push(`
                <div class="area-progress">
                    <div class="area-progress-header">
                        <i class="fas fa-camera"></i>
                        <span>Fotos: ${totalFotos}/${metaFotos}</span>
                    </div>
                    <div class="progress-bar" data-progress="${progressFotos.toFixed(0)}%">
                        <div class="progress-fill ${getProgressClass(progressFotos)}" style="width: ${progressFotos}%"></div>
                    </div>
                </div>
            `);
        } else if (totalFotos > 0) {
            progressBars.push(`
                <div class="area-progress">
                    <div class="area-progress-header">
                        <i class="fas fa-camera"></i>
                        <span>Fotos: ${totalFotos}</span>
                    </div>
                    <div class="progress-bar" data-progress="0%">
                        <div class="progress-fill low" style="width: 0%"></div>
                    </div>
                </div>
            `);
        }
        
        // Barra de progresso para Vídeos
        if (metaVideos > 0) {
            progressBars.push(`
                <div class="area-progress">
                    <div class="area-progress-header">
                        <i class="fas fa-video"></i>
                        <span>Vídeos: ${totalVideos}/${metaVideos}</span>
                    </div>
                    <div class="progress-bar" data-progress="${progressVideos.toFixed(0)}%">
                        <div class="progress-fill ${getProgressClass(progressVideos)}" style="width: ${progressVideos}%"></div>
                    </div>
                </div>
            `);
        } else if (totalVideos > 0) {
            progressBars.push(`
                <div class="area-progress">
                    <div class="area-progress-header">
                        <i class="fas fa-video"></i>
                        <span>Vídeos: ${totalVideos}</span>
                    </div>
                    <div class="progress-bar" data-progress="0%">
                        <div class="progress-fill low" style="width: 0%"></div>
                    </div>
                </div>
            `);
        }
        
        // Se não há nenhuma área com conteúdo ou meta
        if (progressBars.length === 0) {
            const temMetas = metaHorasLive > 0 || metaFotos > 0 || metaVideos > 0;
            if (temMetas) {
                progressBars.push(`
                    <div class="area-progress">
                        <div class="area-progress-header">
                            <i class="fas fa-info-circle"></i>
                            <span>Nenhum conteúdo aprovado</span>
                        </div>
                        <div class="progress-bar" data-progress="0%">
                            <div class="progress-fill low" style="width: 0%"></div>
                        </div>
                    </div>
                `);
            } else {
                progressBars.push(`
                    <div class="area-progress">
                        <div class="area-progress-header">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Metas não definidas</span>
                        </div>
                        <div class="progress-bar" data-progress="0%">
                            <div class="progress-fill low" style="width: 0%"></div>
                        </div>
                    </div>
                `);
            }
        }
        
        const indicados = contratado.indicados || 0;
        
        // Calcular valor a receber
        const valorHoraLive = parseFloat(contratado.valor_hora_live) || 0;
        const valor10kVisualizacao = parseFloat(contratado.valor_10k_visualizacao) || 0;
        const valorIndicacao = parseFloat(contratado.valor_indicacao) || 0;
        
        let valorReceber = 0;
        valorReceber += totalHorasLive * valorHoraLive;  // Live aprovada
        
        // Calcular valor de vídeos baseado em visualizações
        const totalVisualizacoesVideo = parseFloat(contratado.total_visualizacoes_video) || 0;
        const valorVideo = (totalVisualizacoesVideo / 10000) * valor10kVisualizacao;
        valorReceber += valorVideo;  // Vídeos aprovados
        
        valorReceber += indicados * valorIndicacao;  // Indicações
        
        // Log para debug
        console.log(`💰 Valor a receber para ${contratado.nome}:`, {
            totalHorasLive,
            valorHoraLive,
            valorLive: totalHorasLive * valorHoraLive,
            totalVisualizacoesVideo,
            valor10kVisualizacao,
            valorVideo,
            indicados,
            valorIndicacao,
            valorIndicacoes: indicados * valorIndicacao,
            valorReceber
        });
        
        const valorReceberText = valorReceber > 0 ? `R$ ${valorReceber.toFixed(2)}` : 'R$ 0,00';
        
        // Processar áreas para remover duplicatas
        const areasArray = areas !== 'N/A' ? 
            [...new Set(areas.split(', ').filter(area => area.trim()))] : 
            [];
        
        const areasHTML = areasArray.length > 0 ? 
            areasArray.map(area => `<span class="area-badge">${area.trim()}</span>`).join('') :
            '<span class="area-badge">Nenhuma área</span>';
        
        row.innerHTML = `
            <td><strong>${gameId}</strong></td>
            <td>${nome}</td>
            <td>
                <div class="areas-badges">
                    ${areasHTML}
                </div>
            </td>
            <td>
                <div class="progress-info">
                    ${progressBars.join('')}
                </div>
            </td>
            <td>
                <span class="indicados-count">${indicados}</span>
            </td>
            <td>
                <span class="valor-receber">${valorReceberText}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewContratado(${contratado.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editContratado(${contratado.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removeContratado(${contratado.id}, '${nome}')" title="Remover Status de Contratado">
                        <i class="fas fa-user-times"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Obter classe CSS do status do contratado
function getContratadoStatusClass(status) {
    const classes = {
        'ativo': 'status-approved',
        'inativo': 'status-rejected',
        'pendente': 'status-pending'
    };
    return classes[status] || 'status-pending';
}

// Obter texto do status do contratado
function getContratadoStatusText(status) {
    const texts = {
        'ativo': 'Ativo',
        'inativo': 'Inativo',
        'pendente': 'Pendente'
    };
    return texts[status] || 'Pendente';
}

// Obter classe CSS baseada no progresso
function getProgressClass(progress) {
    if (progress >= 100) return 'complete';
    if (progress >= 70) return 'high';
    if (progress >= 40) return 'medium';
    return 'low';
}

// Abrir modal de novo contratado
function openNewContratadoModal() {
    loadCriadoresForContratado();
    document.getElementById('new-contratado-modal').classList.remove('hidden');
}

// Fechar modal de novo contratado
function closeNewContratadoModal() {
    document.getElementById('new-contratado-modal').classList.add('hidden');
    document.getElementById('new-contratado-form').reset();
    document.getElementById('criador-areas-section').style.display = 'none';
    document.getElementById('criador-metas-section').style.display = 'none';
}

// Abrir modal de edição de contratado
function openEditContratadoModal(contratado) {
    // Preencher dados do contratado
    document.getElementById('edit-contratado-id').value = contratado.id;
    document.getElementById('edit-contratado-criador').value = contratado.nome;
    
    // Preencher valores do contrato
    document.getElementById('edit-valor-hora-live').value = contratado.valor_hora_live || 0;
    document.getElementById('edit-valor-10k-visualizacao').value = contratado.valor_10k_visualizacao || 0;
    document.getElementById('edit-valor-indicacao').value = contratado.valor_indicacao || 0;
    document.getElementById('edit-percentual-cupom').value = contratado.percentual_cupom || 0;
    document.getElementById('edit-limite-ganhos').value = contratado.limite_ganhos || 0;
    
    // Preencher valores de bônus
    document.getElementById('edit-bonus-hora-live').value = contratado.bonus_hora_live || 0;
    document.getElementById('edit-bonus-foto').value = contratado.bonus_foto || 0;
    document.getElementById('edit-bonus-video').value = contratado.bonus_video || 0;
    
    // Carregar áreas e metas
    loadEditContratadoAreas(contratado);
    
    // Mostrar modal
    document.getElementById('edit-contratado-modal').classList.remove('hidden');
}

// Fechar modal de edição de contratado
function closeEditContratadoModal() {
    document.getElementById('edit-contratado-modal').classList.add('hidden');
    document.getElementById('edit-contratado-form').reset();
}

// Abrir modal de edição de áreas do contratado
async function openEditContratadoAreas() {
    try {
        showLoading();
        
        // Carregar todas as áreas disponíveis
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/areas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const areas = await response.json();
            editContratadoAreas = areas;
            
            // Carregar áreas selecionadas do contratado atual
            const contratadoId = document.getElementById('edit-contratado-id').value;
            currentEditContratadoId = contratadoId;
            
            // Buscar áreas atuais do contratado
            const contratadoResponse = await fetch(`${API_BASE_URL}/api/admin/contratados/${contratadoId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (contratadoResponse.ok) {
                const contratado = await contratadoResponse.json();
                editContratadoSelectedAreas = contratado.areas ? contratado.areas.map(area => area.id) : [];
                
                // Renderizar grid de áreas
                renderEditContratadoAreasGrid();
                
                // Mostrar modal
                document.getElementById('edit-contratado-areas-modal').classList.remove('hidden');
            } else {
                throw new Error('Erro ao carregar dados do contratado');
            }
        } else {
            throw new Error('Erro ao carregar áreas');
        }
    } catch (error) {
        console.error('Erro ao abrir edição de áreas:', error);
        showToast('Erro ao carregar áreas', 'error');
    } finally {
        hideLoading();
    }
}

// Fechar modal de edição de áreas do contratado
function closeEditContratadoAreasModal() {
    document.getElementById('edit-contratado-areas-modal').classList.add('hidden');
    editContratadoAreas = [];
    editContratadoSelectedAreas = [];
    currentEditContratadoId = null;
}

// Renderizar grid de áreas para edição do contratado
function renderEditContratadoAreasGrid() {
    const grid = document.getElementById('edit-contratado-areas-grid');
    
    if (!grid) {
        console.error('Grid de áreas não encontrado');
        return;
    }
    
    const areasHTML = editContratadoAreas.map(area => {
        const isSelected = editContratadoSelectedAreas.includes(area.id);
        return `
            <div class="area-card-edit ${isSelected ? 'selected' : ''}" 
                 onclick="toggleEditContratadoAreaSelection(${area.id}, this)">
                <div class="area-icon">
                    <i class="${getAreaIcon(area.nome)}"></i>
                </div>
                <div class="area-title">${area.nome}</div>
                <div class="area-description">${area.descricao || ''}</div>
                <div class="area-checkbox">
                    <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}"></i>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = areasHTML;
}

// Alternar seleção de área no modal de edição do contratado
function toggleEditContratadoAreaSelection(areaId, element) {
    const index = editContratadoSelectedAreas.indexOf(areaId);
    
    if (index > -1) {
        // Remover área
        editContratadoSelectedAreas.splice(index, 1);
        element.classList.remove('selected');
        element.querySelector('.area-checkbox i').className = 'fas fa-circle';
    } else {
        // Adicionar área
        editContratadoSelectedAreas.push(areaId);
        element.classList.add('selected');
        element.querySelector('.area-checkbox i').className = 'fas fa-check-circle';
    }
}

// Salvar áreas do contratado
async function saveEditContratadoAreas() {
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/contratados/${currentEditContratadoId}/areas`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                areas_ids: editContratadoSelectedAreas
            })
        });
        
        if (response.ok) {
            showToast('Áreas atualizadas com sucesso!', 'success');
            closeEditContratadoAreasModal();
            
            // Atualizar exibição das áreas no modal principal
            updateEditContratadoAreasDisplay();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao atualizar áreas');
        }
    } catch (error) {
        console.error('Erro ao salvar áreas:', error);
        showToast(error.message || 'Erro ao atualizar áreas', 'error');
    } finally {
        hideLoading();
    }
}

// Atualizar exibição das áreas no modal principal
function updateEditContratadoAreasDisplay() {
    const areasDisplay = document.getElementById('edit-criador-areas-display');
    const selectedAreas = editContratadoAreas.filter(area => 
        editContratadoSelectedAreas.includes(area.id)
    );
    
    if (selectedAreas.length > 0) {
        const areasHTML = selectedAreas.map(area => 
            `<span class="area-badge">
                <i class="${getAreaIcon(area.nome)}"></i>
                ${area.nome}
            </span>`
        ).join('');
        areasDisplay.innerHTML = areasHTML;
    } else {
        areasDisplay.innerHTML = '<p>Nenhuma área selecionada</p>';
    }
}

// Carregar áreas e metas do contratado para edição
function loadEditContratadoAreas(contratado) {
    console.log('🔍 Dados do contratado recebidos:', contratado);
    
    // Inicializar variáveis globais
    currentEditContratadoId = contratado.id;
    
    // Usar dados diretos do backend
    const areas = contratado.areas || [];
    const metas = contratado.metas || [];
    const areasIds = areas.map(area => area.id);
    
    editContratadoSelectedAreas = areasIds;
    console.log('📋 Áreas carregadas:', areas);
    console.log('🆔 IDs das áreas:', areasIds);
    console.log('📊 Metas carregadas:', metas);
    
    // Carregar áreas na interface
    const areasDisplay = document.getElementById('edit-criador-areas-display');
    if (areas && areas.length > 0) {
        const areasHTML = areas.map(area => 
            `<span class="area-badge">
                <i class="${getAreaIcon(area.nome)}"></i>
                ${area.nome}
            </span>`
        ).join('');
        areasDisplay.innerHTML = areasHTML;
    } else {
        areasDisplay.innerHTML = '<p>Nenhuma área definida</p>';
    }
    
    // Carregar metas na interface
    const metasDisplay = document.getElementById('edit-criador-metas-display');
    if (metas && metas.length > 0) {
        const metasHTML = metas.map(meta => `
            <div class="meta-item">
                <div class="meta-header">
                    <i class="${getAreaIcon(meta.area_name)}"></i>
                    <span class="meta-title">${meta.area_name}</span>
                </div>
                <div class="meta-content">
                    <div class="meta-field">
                        <label>Meta Atual:</label>
                        <input type="number" 
                               class="meta-input" 
                               data-area-id="${meta.area_id}" 
                               data-area-name="${meta.area_name}" 
                               value="${meta.meta_value || 0}" 
                               min="0" 
                               required>
                    </div>
                </div>
            </div>
        `).join('');
        metasDisplay.innerHTML = metasHTML;
    } else {
        metasDisplay.innerHTML = '<p>Nenhuma meta definida</p>';
    }
}

// Carregar criadores para o modal de contratado
async function loadCriadoresForContratado() {
    try {
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/criadores`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const criadores = data.criadores || data || [];
            
            // Filtrar apenas criadores aprovados que não são contratados
            const criadoresDisponiveis = criadores.filter(c => 
                c.status === 'aprovado' && (!c.contratado || c.contratado === 0)
            );
            
            const select = document.getElementById('contratado-criador');
            select.innerHTML = '<option value="">Escolha um criador...</option>';
            
            criadoresDisponiveis.forEach(criador => {
                const option = document.createElement('option');
                option.value = criador.id;
                option.textContent = `${criador.nome} (${criador.discord_id})`;
                option.dataset.criador = JSON.stringify(criador);
                select.appendChild(option);
            });
            
            if (criadoresDisponiveis.length === 0) {
                select.innerHTML = '<option value="">Nenhum criador disponível para contratação</option>';
            }
        } else {
            throw new Error('Erro ao carregar criadores');
        }
    } catch (error) {
        console.error('Erro ao carregar criadores:', error);
        showToast('Erro ao carregar criadores', 'error');
    }
}

// Carregar áreas e metas do criador selecionado
function loadCriadorAreas() {
    const select = document.getElementById('contratado-criador');
    const criadorId = select.value;
    
    if (!criadorId) {
        document.getElementById('criador-areas-section').style.display = 'none';
        document.getElementById('criador-metas-section').style.display = 'none';
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const criador = JSON.parse(selectedOption.dataset.criador);
    
    // Carregar áreas do criador
    const areasIds = criador.areas_ids ? JSON.parse(criador.areas_ids) : [];
    
    if (areasIds.length === 0) {
        document.getElementById('criador-areas-display').innerHTML = '<p style="color: #666; font-style: italic;">Nenhuma área cadastrada</p>';
        document.getElementById('criador-metas-section').style.display = 'none';
    } else {
        // Buscar informações das áreas
        fetch('/api/creators/areas')
            .then(response => response.json())
            .then(areas => {
                const criadorAreas = areas.filter(area => areasIds.includes(area.id));
                
                // Exibir áreas
                const areasHTML = criadorAreas.map(area => `
                    <div class="area-badge">
                        <i class="${getAreaIcon(area.nome)}"></i>
                        ${area.nome}
                    </div>
                `).join('');
                
                document.getElementById('criador-areas-display').innerHTML = areasHTML;
                
                // Exibir metas das áreas
                const metasHTML = criadorAreas.map(area => {
                    const metaAtual = getMetaAtual(area.nome, criador);
                    return `
                        <div class="meta-item">
                            <div class="meta-header">
                                <i class="${getAreaIcon(area.nome)}"></i>
                                <span class="meta-title">${area.nome}</span>
                            </div>
                            <div class="meta-content">
                                <div class="meta-field">
                                    <label>Meta Atual:</label>
                                    <span class="meta-value">${metaAtual}</span>
                                </div>
                                <div class="meta-field">
                                    <label>Nova Meta:</label>
                                    <input type="number" 
                                           class="meta-input" 
                                           name="meta_${area.id}" 
                                           min="0" 
                                           step="1" 
                                           placeholder="Digite a nova meta"
                                           data-area-id="${area.id}"
                                           data-area-name="${area.nome}">
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                document.getElementById('criador-metas-display').innerHTML = metasHTML;
                document.getElementById('criador-metas-section').style.display = 'block';
            })
            .catch(error => {
                console.error('Erro ao carregar áreas:', error);
                document.getElementById('criador-areas-display').innerHTML = '<p style="color: #e53e3e;">Erro ao carregar áreas</p>';
                document.getElementById('criador-metas-section').style.display = 'none';
            });
    }
    
    document.getElementById('criador-areas-section').style.display = 'block';
}

// Função auxiliar para obter a meta atual de uma área
function getMetaAtual(areaName, criador) {
    const areaNameLower = areaName.toLowerCase();
    
    if (areaNameLower.includes('live')) {
        return criador.meta_horas_live || 'Não definida';
    } else if (areaNameLower.includes('foto')) {
        return criador.meta_fotos || 'Não definida';
    } else if (areaNameLower.includes('video')) {
        return criador.meta_videos || 'Não definida';
    }
    
    return 'Não definida';
}

// Atualizar lista de contratados
function refreshContratados() {
    loadContratados();
}

// Ver detalhes do contratado
function viewContratado(id) {
    showToast('Funcionalidade em desenvolvimento', 'info');
}

// Editar contratado
async function editContratado(id) {
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/contratados/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const contratado = await response.json();
            openEditContratadoModal(contratado);
        } else {
            throw new Error('Erro ao carregar dados do contratado');
        }
    } catch (error) {
        console.error('Erro ao carregar contratado:', error);
        showToast('Erro ao carregar dados do contratado', 'error');
    } finally {
        hideLoading();
    }
}

// Remover contratado (mudar contratado para 0)
async function removeContratado(id, nome) {
    if (!confirm(`Tem certeza que deseja remover o status de contratado de "${nome}"?\n\nO criador continuará no sistema, mas não será mais considerado contratado.`)) {
        return;
    }
    
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/contratados/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(`Status de contratado removido de "${nome}" com sucesso!`, 'success');
            loadContratados(); // Recarregar lista
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao remover contratado');
        }
    } catch (error) {
        console.error('Erro ao remover contratado:', error);
        showToast(`Erro ao remover contratado: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Variável global para contratados
let contratados = [];

// Variáveis para edição de áreas do contratado
let editContratadoAreas = [];
let editContratadoSelectedAreas = [];
let currentEditContratadoId = null;

// Processar formulário de edição de contratado
async function handleEditContratadoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const contratadoId = formData.get('contratado-id');
    
    // Coletar metas das áreas
    const metas = {};
    const metaInputs = document.querySelectorAll('#edit-criador-metas-display .meta-input');
    console.log('🔍 Meta inputs encontrados:', metaInputs.length);
    
    metaInputs.forEach(input => {
        const areaId = input.dataset.areaId;
        const areaName = input.dataset.areaName;
        const metaValue = input.value.trim();
        
        console.log(`📝 Input meta: ${areaName} (ID: ${areaId}) = "${metaValue}"`);
        
        if (metaValue) {
            metas[areaId] = {
                area_name: areaName,
                meta_value: parseInt(metaValue)
            };
        }
    });
    
    console.log('📊 Metas coletadas:', metas);
    
    const contractData = {
        valor_hora_live: parseFloat(formData.get('valor-hora-live')),
        valor_10k_visualizacao: parseFloat(formData.get('valor-10k-visualizacao')),
        valor_indicacao: parseFloat(formData.get('valor-indicacao')),
        percentual_cupom: parseFloat(formData.get('percentual-cupom')),
        limite_ganhos: parseFloat(formData.get('limite-ganhos')),
        bonus_hora_live: parseFloat(formData.get('bonus-hora-live')),
        bonus_foto: parseFloat(formData.get('bonus-foto')),
        bonus_video: parseFloat(formData.get('bonus-video')),
        metas: metas
    };
    
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/contratados/${contratadoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(contractData)
        });
        
        if (response.ok) {
            showToast('Contratado atualizado com sucesso!', 'success');
            closeEditContratadoModal();
            loadContratados(); // Atualizar lista
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao atualizar contratado');
        }
    } catch (error) {
        console.error('Erro ao atualizar contratado:', error);
        showToast(error.message || 'Erro ao atualizar contratado', 'error');
    } finally {
        hideLoading();
    }
}

// Processar formulário de contratação
async function handleNewContratadoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const criadorId = formData.get('contratado-criador');
    
    if (!criadorId) {
        showToast('Selecione um criador', 'error');
        return;
    }
    
    // Coletar metas das áreas
    const metas = {};
    const metaInputs = document.querySelectorAll('.meta-input');
    metaInputs.forEach(input => {
        const areaId = input.dataset.areaId;
        const areaName = input.dataset.areaName;
        const metaValue = input.value.trim();
        
        if (metaValue) {
            metas[areaId] = {
                area_name: areaName,
                meta_value: parseInt(metaValue)
            };
        }
    });
    
    const contractData = {
        criador_id: criadorId,
        valor_hora_live: parseFloat(formData.get('valor-hora-live')),
        valor_10k_visualizacao: parseFloat(formData.get('valor-10k-visualizacao')),
        valor_indicacao: parseFloat(formData.get('valor-indicacao')),
        percentual_cupom: parseFloat(formData.get('percentual-cupom')),
        limite_ganhos: parseFloat(formData.get('limite-ganhos')),
        bonus_hora_live: parseFloat(formData.get('bonus-hora-live')),
        bonus_foto: parseFloat(formData.get('bonus-foto')),
        bonus_video: parseFloat(formData.get('bonus-video')),
        metas: metas
    };
    
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        const response = await fetch(`${API_BASE_URL}/api/admin/contratar-criador`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(contractData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(`Criador contratado com sucesso!`, 'success');
            closeNewContratadoModal();
            
            // Atualizar listas
            loadData(); // Atualizar lista de criadores
            loadContratados(); // Atualizar lista de contratados
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao contratar criador');
        }
    } catch (error) {
        console.error('Erro ao contratar criador:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Funções globais para contratados
window.openNewContratadoModal = openNewContratadoModal;
window.closeNewContratadoModal = closeNewContratadoModal;
window.closeEditContratadoModal = closeEditContratadoModal;
window.openEditContratadoAreas = openEditContratadoAreas;
window.closeEditContratadoAreasModal = closeEditContratadoAreasModal;
window.toggleEditContratadoAreaSelection = toggleEditContratadoAreaSelection;
window.saveEditContratadoAreas = saveEditContratadoAreas;
window.loadCriadorAreas = loadCriadorAreas;
window.handleNewContratadoSubmit = handleNewContratadoSubmit;
window.handleEditContratadoSubmit = handleEditContratadoSubmit;
window.refreshContratados = refreshContratados;
window.viewContratado = viewContratado;
window.editContratado = editContratado;
window.removeContratado = removeContratado;

// Funções globais para pagamentos
window.refreshPagamentos = refreshPagamentos;
window.viewSaque = viewSaque;
window.aprovarSaque = aprovarSaque;
window.rejeitarSaque = rejeitarSaque;
window.pagarSaque = pagarSaque;

// ===== FUNÇÕES PARA ABA DE PAGAMENTOS =====

// Carregar dados de pagamentos
async function loadPagamentos() {
    try {
        const response = await fetch('/api/admin/saques', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderPagamentos(data.saques);
            updatePagamentosStats(data.stats);
        } else {
            console.error('Erro ao carregar pagamentos:', response.statusText);
            showToast('Erro ao carregar pagamentos', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar pagamentos:', error);
        showToast('Erro ao carregar pagamentos', 'error');
    }
}

// Atualizar estatísticas de pagamentos
function updatePagamentosStats(stats) {
    document.getElementById('saques-pendentes').textContent = stats.pendentes || 0;
    document.getElementById('saques-aprovados').textContent = stats.aprovados || 0;
    document.getElementById('saques-pagos').textContent = stats.pagos || 0;
    document.getElementById('saques-rejeitados').textContent = stats.rejeitados || 0;
}

// Renderizar lista de pagamentos
function renderPagamentos(saques) {
    const tbody = document.getElementById('pagamentos-tbody');
    
    if (!saques || saques.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Nenhuma solicitação de saque encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = saques.map(saque => `
        <tr>
            <td>${saque.criador_nome || 'N/A'}</td>
            <td>R$ ${parseFloat(saque.valor_solicitado).toFixed(2).replace('.', ',')}</td>
            <td>${formatTipoChave(saque.tipo_chave)}</td>
            <td>${saque.chave_pix}</td>
            <td>${saque.nome_beneficiario}</td>
            <td>${getStatusSaqueBadge(saque.status)}</td>
            <td>${formatDate(saque.data_solicitacao)}</td>
            <td>
                <div class="pagamento-actions">
                    ${getSaqueActions(saque)}
                </div>
            </td>
        </tr>
        ${saque.status === 'aprovado' || saque.status === 'pago' ? `
        <tr class="saque-details-row" style="background-color: #f8f9fa;">
            <td colspan="8" style="padding: 10px 15px; font-size: 0.85rem; color: #6b7280;">
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                    <div><strong>📊 Progressos no momento do saque:</strong></div>
                    <div>🕐 Horas Live: ${parseFloat(saque.horas_live_saque || 0).toFixed(1)}h</div>
                    <div>📸 Fotos: ${saque.fotos_aprovadas_saque || 0}</div>
                    <div>🎥 Vídeos: ${saque.videos_aprovados_saque || 0}</div>
                    <div>👁️ Visualizações: ${saque.visualizacoes_saque || 0}</div>
                    <div>👥 Indicados: ${saque.indicados_saque || 0}</div>
                    <div>💰 Vendas Cupom: R$ ${parseFloat(saque.valor_vendas_cupom_saque || 0).toFixed(2).replace('.', ',')}</div>
                </div>
            </td>
        </tr>
        ` : ''}
    `).join('');
}

// Formatar tipo de chave PIX
function formatTipoChave(tipo) {
    const tipos = {
        'cpf': 'CPF',
        'cnpj': 'CNPJ',
        'email': 'E-mail',
        'telefone': 'Telefone',
        'aleatoria': 'Chave Aleatória'
    };
    return tipos[tipo] || tipo;
}

// Obter badge de status do saque
function getStatusSaqueBadge(status) {
    const statusClasses = {
        'pendente': 'status-saque-pendente',
        'aprovado': 'status-saque-aprovado',
        'pago': 'status-saque-pago',
        'rejeitado': 'status-saque-rejeitado'
    };
    
    const statusTexts = {
        'pendente': 'PENDENTE',
        'aprovado': 'APROVADO',
        'pago': 'PAGO',
        'rejeitado': 'REJEITADO'
    };
    
    return `<span class="${statusClasses[status] || 'status-saque-pendente'}">${statusTexts[status] || status.toUpperCase()}</span>`;
}

// Obter ações disponíveis para o saque
function getSaqueActions(saque) {
    let actions = '';
    
    // Botão para ver detalhes
    actions += `<button class="btn-ver-saque" onclick="viewSaque(${saque.id})" title="Ver detalhes">
        <i class="fas fa-eye"></i>
    </button>`;
    
    // Ações baseadas no status
    switch (saque.status) {
        case 'pendente':
            actions += `
                <button class="btn-aprovar-saque" onclick="aprovarSaque(${saque.id})" title="Aprovar saque">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-rejeitar-saque" onclick="rejeitarSaque(${saque.id})" title="Rejeitar saque">
                    <i class="fas fa-times"></i>
                </button>
            `;
            break;
        case 'aprovado':
            actions += `
                <button class="btn-pagar-saque" onclick="pagarSaque(${saque.id})" title="Marcar como pago">
                    <i class="fas fa-money-bill-wave"></i>
                </button>
            `;
            break;
    }
    
    return actions;
}

// Ver detalhes do saque
async function viewSaque(saqueId) {
    try {
        const response = await fetch(`/api/admin/saques/${saqueId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        
        if (response.ok) {
            const saque = await response.json();
            showSaqueModal(saque);
        } else {
            showToast('Erro ao carregar detalhes do saque', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar saque:', error);
        showToast('Erro ao carregar detalhes do saque', 'error');
    }
}

// Mostrar modal de detalhes do saque
function showSaqueModal(saque) {
    const modal = document.getElementById('saque-details-modal');
    const content = document.getElementById('saque-details-content');
    
    // Formatar data
    const dataSolicitacao = new Date(saque.data_solicitacao).toLocaleString('pt-BR');
    const valorFormatado = parseFloat(saque.valor_solicitado).toFixed(2).replace('.', ',');
    
    // Determinar ações disponíveis baseadas no status
    let actionsHTML = '';
    switch (saque.status) {
        case 'pendente':
            actionsHTML = `
                <button class="saque-action-btn aprovar" onclick="aprovarSaque(${saque.id})">
                    <i class="fas fa-check"></i> Aprovar Saque
                </button>
                <button class="saque-action-btn rejeitar" onclick="rejeitarSaque(${saque.id})">
                    <i class="fas fa-times"></i> Rejeitar Saque
                </button>
            `;
            break;
        case 'aprovado':
            actionsHTML = `
                <button class="saque-action-btn pagar" onclick="pagarSaque(${saque.id})">
                    <i class="fas fa-money-bill-wave"></i> Marcar como Pago
                </button>
            `;
            break;
    }
    
    // Adicionar botão fechar
    actionsHTML += `
        <button class="saque-action-btn fechar" onclick="closeSaqueDetailsModal()">
            <i class="fas fa-times"></i> Fechar
        </button>
    `;
    
    content.innerHTML = `
        <!-- Informações Básicas do Saque -->
        <div class="saque-info-section">
            <h4><i class="fas fa-info-circle"></i> Informações da Solicitação</h4>
            <div class="saque-info-grid">
                <div class="saque-info-item">
                    <label>ID da Solicitação</label>
                    <div class="value highlight">#${saque.id}</div>
                </div>
                <div class="saque-info-item">
                    <label>Status</label>
                    <div class="value status-${saque.status}">${getStatusSaqueBadge(saque.status)}</div>
                </div>
                <div class="saque-info-item">
                    <label>Valor Solicitado</label>
                    <div class="value highlight">R$ ${valorFormatado}</div>
                </div>
                <div class="saque-info-item">
                    <label>Data da Solicitação</label>
                    <div class="value">${dataSolicitacao}</div>
                </div>
            </div>
        </div>

        <!-- Informações do Criador -->
        <div class="saque-info-section">
            <h4><i class="fas fa-user"></i> Informações do Criador</h4>
            <div class="saque-info-grid">
                <div class="saque-info-item">
                    <label>Nome do Criador</label>
                    <div class="value">${saque.criador_nome || 'N/A'}</div>
                </div>
                <div class="saque-info-item">
                    <label>Discord ID</label>
                    <div class="value">${saque.criador_discord_id || 'N/A'}</div>
                </div>
                <div class="saque-info-item">
                    <label>Email</label>
                    <div class="value">${saque.criador_email || 'N/A'}</div>
                </div>
                <div class="saque-info-item">
                    <label>Contratado</label>
                    <div class="value">${saque.criador_contratado ? 'Sim' : 'Não'}</div>
                </div>
            </div>
        </div>

        <!-- Informações de Pagamento -->
        <div class="saque-info-section">
            <h4><i class="fas fa-credit-card"></i> Informações de Pagamento</h4>
            <div class="saque-info-grid">
                <div class="saque-info-item">
                    <label>Tipo de Chave PIX</label>
                    <div class="value">${formatTipoChave(saque.tipo_chave)}</div>
                </div>
                <div class="saque-info-item">
                    <label>Chave PIX</label>
                    <div class="value clickable" onclick="copyToClipboard('${saque.chave_pix}', 'Chave PIX')" title="Clique para copiar">
                        ${saque.chave_pix}
                        <i class="fas fa-copy copy-icon"></i>
                    </div>
                </div>
                <div class="saque-info-item">
                    <label>Nome do Beneficiário</label>
                    <div class="value">${saque.nome_beneficiario}</div>
                </div>
            </div>
        </div>

        <!-- Progressos Salvos no Momento do Saque -->
        <div class="saque-progress-section">
            <h4><i class="fas fa-save"></i> Progressos Salvos no Momento do Saque</h4>
            <p style="color: #666; font-size: 0.9rem; margin-bottom: 15px; font-style: italic;">
                <i class="fas fa-info-circle"></i> Estas informações foram salvas automaticamente quando o saque foi solicitado
            </p>
            <div class="saque-progress-grid">
                <div class="saque-progress-item">
                    <i class="fas fa-clock"></i>
                    <div class="label">Horas de Live</div>
                    <div class="value">${parseFloat(saque.horas_live_saque || 0).toFixed(1)}h</div>
                </div>
                <div class="saque-progress-item">
                    <i class="fas fa-camera"></i>
                    <div class="label">Fotos Aprovadas</div>
                    <div class="value">${saque.fotos_aprovadas_saque || 0}</div>
                </div>
                <div class="saque-progress-item">
                    <i class="fas fa-video"></i>
                    <div class="label">Vídeos Aprovados</div>
                    <div class="value">${saque.videos_aprovados_saque || 0}</div>
                </div>
                <div class="saque-progress-item">
                    <i class="fas fa-eye"></i>
                    <div class="label">Visualizações</div>
                    <div class="value">${saque.visualizacoes_saque || 0}</div>
                </div>
                <div class="saque-progress-item">
                    <i class="fas fa-users"></i>
                    <div class="label">Indicações</div>
                    <div class="value">${saque.indicados_saque || 0}</div>
                </div>
                <div class="saque-progress-item">
                    <i class="fas fa-tags"></i>
                    <div class="label">Comissão do Cupom</div>
                    <div class="value currency">R$ ${parseFloat(saque.valor_vendas_cupom_saque || 0).toFixed(2).replace('.', ',')}</div>
                </div>
                <div class="saque-progress-item">
                    <i class="fas fa-hashtag"></i>
                    <div class="label">ID do Cupom</div>
                    <div class="value">${saque.cupom_id_saque || 'N/A'}</div>
                </div>
            </div>
        </div>



        <!-- Ações -->
        <div class="saque-actions-section">
            ${actionsHTML}
        </div>
    `;
    
    modal.classList.remove('hidden');
    

}

// Fechar modal de detalhes do saque
function closeSaqueDetailsModal() {
    const modal = document.getElementById('saque-details-modal');
    modal.classList.add('hidden');
}

// Função para copiar texto para área de transferência
function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copiado para a área de transferência!`, 'success');
    }).catch(() => {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast(`${label} copiado para a área de transferência!`, 'success');
    });
}



// Aprovar saque
async function aprovarSaque(saqueId) {
    if (!confirm('Tem certeza que deseja aprovar este saque?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/saques/${saqueId}/aprovar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Saque aprovado com sucesso!', 'success');
            closeSaqueDetailsModal(); // Fechar modal
            loadPagamentos(); // Recarregar lista
        } else {
            const error = await response.json();
            showToast('Erro ao aprovar saque: ' + (error.error || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Erro ao aprovar saque:', error);
        showToast('Erro ao aprovar saque', 'error');
    }
}

// Rejeitar saque
async function rejeitarSaque(saqueId) {
    const motivo = prompt('Motivo da rejeição:');
    if (!motivo) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/saques/${saqueId}/rejeitar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ motivo })
        });
        
        if (response.ok) {
            showToast('Saque rejeitado com sucesso!', 'success');
            closeSaqueDetailsModal(); // Fechar modal
            loadPagamentos(); // Recarregar lista
        } else {
            const error = await response.json();
            showToast('Erro ao rejeitar saque: ' + (error.error || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Erro ao rejeitar saque:', error);
        showToast('Erro ao rejeitar saque', 'error');
    }
}

// Marcar saque como pago
async function pagarSaque(saqueId) {
    if (!confirm('Tem certeza que deseja marcar este saque como pago?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/saques/${saqueId}/pagar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Saque marcado como pago com sucesso!', 'success');
            closeSaqueDetailsModal(); // Fechar modal
            loadPagamentos(); // Recarregar lista
        } else {
            const error = await response.json();
            showToast('Erro ao marcar saque como pago: ' + (error.error || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Erro ao marcar saque como pago:', error);
        showToast('Erro ao marcar saque como pago', 'error');
    }
}

// Atualizar lista de pagamentos
function refreshPagamentos() {
    loadPagamentos();
}

// Filtrar pagamentos
function filterPagamentos() {
    const statusFilter = document.getElementById('saque-status-filter').value;
    const searchInput = document.getElementById('saque-search-input').value.toLowerCase();
    
    // Implementar filtros quando necessário
    console.log('Filtrar pagamentos:', { statusFilter, searchInput });
    loadPagamentos(); // Por enquanto, recarrega todos
}