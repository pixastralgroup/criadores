// Variáveis globais
let currentUser = null;
let contents = [];
let socket = null;

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
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                showDashboard();
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
    
    // Modal close
    document.getElementById('content-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
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
    contents = [];
    
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
    console.log('Tempo real desabilitado - use o botão Atualizar');
    
    // Não inicializa socket
    // socket = io();
    
    // Não escuta eventos
    // socket.on('connect', () => {});
    // socket.on('content-status-updated', () => {});
    // socket.on('disconnect', () => {});
}

// Carregar dados
async function loadData() {
    try {
        showLoading();
        
        const token = localStorage.getItem('staff_token');
        console.log('🔑 Token de autenticação:', token ? 'Presente' : 'Ausente');
        
        // Carregar conteúdos
        const contentsResponse = await fetch('/api/staff/conteudos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Resposta da API conteúdos:', contentsResponse.status, contentsResponse.statusText);
        
        if (contentsResponse.ok) {
            try {
                contents = await contentsResponse.json();
                console.log('📦 Dados recebidos:', contents.length, 'conteúdos');
                if (contents.length > 0) {
                    console.log('📊 Primeiro conteúdo:', contents[0]);
                }
                renderContents();
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta:', error);
                const responseText = await contentsResponse.text();
                console.error('📄 Resposta recebida:', responseText);
                throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
            }
        } else {
            const errorText = await contentsResponse.text();
            console.error('❌ Erro na resposta:', errorText);
            throw new Error(`Erro ${contentsResponse.status}: ${errorText}`);
        }
        
        // Carregar estatísticas
        const statsResponse = await fetch('/api/staff/conteudos-stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        
        if (statsResponse.ok) {
            let stats;
            try {
                stats = await statsResponse.json();
                updateStats(stats);
            } catch (error) {
                console.error('❌ Erro ao fazer parse da resposta:', error);
                const responseText = await statsResponse.text();
                console.error('📄 Resposta recebida:', responseText);
                throw new Error('Resposta inválida do servidor. Verifique sua conexão.');
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados', 'error');
    } finally {
        hideLoading();
    }
}

// Atualizar estatísticas
function updateStats(stats) {
    document.getElementById('total-conteudos').textContent = stats.total;
    document.getElementById('pendentes').textContent = stats.pendentes;
    document.getElementById('aprovados').textContent = stats.aprovados;
    document.getElementById('rejeitados').textContent = stats.rejeitados;
}

// Renderizar conteúdos
function renderContents() {
    const tbody = document.getElementById('content-tbody');
    tbody.innerHTML = '';
    
    contents.forEach(content => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${content.game_id || 'N/A'}</td>
            <td>${content.criador_nome || 'N/A'}</td>
            <td>
                <span class="content-type-badge content-type-${content.tipo}">
                    ${getContentTypeText(content.tipo)}
                </span>
            </td>
            <td>${content.visualizacoes || '-'}</td>
            <td>${content.likes || '-'}</td>
            <td>${content.tipo === 'live' ? (content.tempo_live || '-') + 'h' : '-'}</td>
            <td>
                <span class="status-badge status-${content.status}">
                    ${getStatusText(content.status)}
                </span>
            </td>
            <td>${formatDate(content.created_at)}</td>
            <td>
                <div class="content-actions">
                    <button class="btn-view-content" onclick="viewContent(${content.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${content.status === 'pendente' ? `
                        <button class="btn-approve-content" onclick="approveContent(${content.id})" title="Aprovar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-reject-content" onclick="rejectContent(${content.id})" title="Rejeitar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    ${(content.tipo === 'video' && content.link_video) || (content.tipo === 'fotos' && content.link_foto) ? `
                        <button class="btn-link-content" onclick="openContentLink(${content.id})" title="Abrir Link">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    ` : ''}
                    ${content.status === 'aprovado' && !content.postado ? `
                        <button class="btn-posted-content" onclick="markAsPosted(${content.id})" title="Marcar como Postado">
                            <i class="fas fa-check-double"></i>
                        </button>
                    ` : ''}
                    ${content.postado ? `
                        <span class="posted-badge" title="Postado">
                            <i class="fas fa-check-circle"></i>
                        </span>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filtrar conteúdos
function filterContents() {
    const statusFilter = document.getElementById('status-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const postedFilter = document.getElementById('posted-filter').value;
    const searchFilter = document.getElementById('search-input').value.toLowerCase();
    const sortSelect = document.getElementById('sort-select').value;
    
    console.log('🔍 Filtros aplicados:', {
        statusFilter,
        typeFilter,
        postedFilter,
        searchFilter,
        sortSelect
    });
    
    console.log('📊 Total de conteúdos:', contents.length);
    if (contents.length > 0) {
        console.log('📊 Primeiros 3 conteúdos:', contents.slice(0, 3).map(c => ({
            id: c.id,
            tipo: c.tipo,
            status: c.status,
            postado: c.postado,
            criador_nome: c.criador_nome
        })));
    }
    
    let filteredContents = contents.filter(content => {
        const matchesStatus = !statusFilter || content.status === statusFilter;
        const matchesType = !typeFilter || content.tipo === typeFilter;
        const matchesPosted = postedFilter === '' || 
            (postedFilter === 'true' && content.postado == 1) || 
            (postedFilter === 'false' && content.postado == 0);
        const matchesSearch = !searchFilter || 
            (content.criador_nome && content.criador_nome.toLowerCase().includes(searchFilter)) ||
            (content.game_id && content.game_id.toLowerCase().includes(searchFilter));
        
        // Debug apenas se houver problemas
        if (postedFilter !== '' && content.postado === undefined) {
            console.log(`⚠️ Conteúdo ${content.id} não tem campo postado:`, content);
        }
        

        
        return matchesStatus && matchesType && matchesPosted && matchesSearch;
    });
    
    console.log('✅ Conteúdos filtrados:', filteredContents.length);
    

    
    // Aplicar ordenação
    filteredContents = sortContents(filteredContents, sortSelect);
    
    renderFilteredContents(filteredContents);
}

// Ordenar conteúdos
function sortContents(contents, sortOption) {
    const [field, direction] = sortOption.split('-');
    
    return contents.sort((a, b) => {
        let aValue, bValue;
        
        switch (field) {
            case 'visualizacoes':
                aValue = parseInt(a.visualizacoes || 0);
                bValue = parseInt(b.visualizacoes || 0);
                break;
            case 'likes':
                aValue = parseInt(a.likes || 0);
                bValue = parseInt(b.likes || 0);
                break;
            case 'tempo_live':
                aValue = parseFloat(a.tempo_live || 0);
                bValue = parseFloat(b.tempo_live || 0);
                break;
            case 'created_at':
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

// Renderizar conteúdos filtrados
function renderFilteredContents(filteredContents) {
    const tbody = document.getElementById('content-tbody');
    tbody.innerHTML = '';
    
    filteredContents.forEach(content => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${content.game_id || 'N/A'}</td>
            <td>${content.criador_nome || 'N/A'}</td>
            <td>
                <span class="content-type-badge content-type-${content.tipo}">
                    ${getContentTypeText(content.tipo)}
                </span>
            </td>
            <td>${content.visualizacoes || '-'}</td>
            <td>${content.likes || '-'}</td>
            <td>${content.tipo === 'live' ? (content.tempo_live || '-') + 'h' : '-'}</td>
            <td>
                <span class="status-badge status-${content.status}">
                    ${getStatusText(content.status)}
                </span>
            </td>
            <td>${formatDate(content.created_at)}</td>
            <td>
                <div class="content-actions">
                    <button class="btn-view-content" onclick="viewContent(${content.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${content.status === 'pendente' ? `
                        <button class="btn-approve-content" onclick="approveContent(${content.id})" title="Aprovar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-reject-content" onclick="rejectContent(${content.id})" title="Rejeitar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    ${(content.tipo === 'video' && content.link_video) || (content.tipo === 'fotos' && content.link_foto) ? `
                        <button class="btn-link-content" onclick="openContentLink(${content.id})" title="Abrir Link">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    ` : ''}
                    ${content.status === 'aprovado' && !content.postado ? `
                        <button class="btn-posted-content" onclick="markAsPosted(${content.id})" title="Marcar como Postado">
                            <i class="fas fa-check-double"></i>
                        </button>
                    ` : ''}
                    ${content.postado ? `
                        <span class="posted-badge" title="Postado">
                            <i class="fas fa-check-circle"></i>
                        </span>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Ver conteúdo
async function viewContent(id) {
    try {
        const response = await fetch(`/api/staff/conteudos/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        
        if (response.ok) {
            const content = await response.json();
            showContentModal(content);
        } else {
            throw new Error('Erro ao carregar conteúdo');
        }
        
    } catch (error) {
        console.error('Erro ao ver conteúdo:', error);
        showToast(error.message, 'error');
    }
}

// Mostrar modal do conteúdo
function showContentModal(content) {
    const modal = document.getElementById('content-modal');
    const modalBody = document.getElementById('modal-body');
    
    const imagesHtml = `
        ${content.print_video ? `
            <div class="content-image-section">
                <h4>Print do Vídeo</h4>
                <img src="${content.print_video}" alt="Print do vídeo" class="content-image">
            </div>
        ` : ''}
        ${content.print_foto ? `
            <div class="content-image-section">
                <h4>Print da Foto</h4>
                <img src="${content.print_foto}" alt="Print da foto" class="content-image">
            </div>
        ` : ''}
    `;
    
    modalBody.innerHTML = `
        <div class="content-details">
            <div class="content-basic-info">
                <div class="content-detail-group">
                    <label>Criador:</label>
                    <span>${content.criador_nome || 'N/A'}</span>
                </div>
                <div class="content-detail-group">
                    <label>ID do Jogo:</label>
                    <span>${content.game_id || 'N/A'}</span>
                </div>
                <div class="content-detail-group">
                    <label>Tipo:</label>
                    <span>${getContentTypeText(content.tipo)}</span>
                </div>
                <div class="content-detail-group">
                    <label>Status:</label>
                    <span class="status-badge status-${content.status}">${getStatusText(content.status)}</span>
                </div>
                <div class="content-detail-group">
                    <label>Visualizações:</label>
                    <span>${content.visualizacoes || 'N/A'}</span>
                </div>
                <div class="content-detail-group">
                    <label>Likes:</label>
                    <span>${content.likes}</span>
                </div>
                <div class="content-detail-group">
                    <label>Comentários:</label>
                    <span>${content.comentarios}</span>
                </div>
                <div class="content-detail-group">
                    <label>Data de Registro:</label>
                    <span>${formatDate(content.created_at)}</span>
                </div>
            </div>
            
            ${content.observacoes ? `
                <div class="content-detail-group">
                    <label>Observações do Criador:</label>
                    <span>${content.observacoes}</span>
                </div>
            ` : ''}
            
            ${imagesHtml}
            
            ${content.status === 'pendente' ? `
                <div class="content-approval-form">
                    <h4>Aprovação</h4>
                    <div class="form-group">
                        <label for="content-observacoes">Observações (opcional):</label>
                        <textarea id="content-observacoes" rows="3" placeholder="Digite observações sobre a aprovação/rejeição..."></textarea>
                    </div>
                    <div class="content-approval-actions">
                        <button class="btn btn-approve" onclick="approveContent(${content.id})">
                            <i class="fas fa-check"></i> Aprovar
                        </button>
                        <button class="btn btn-reject" onclick="rejectContent(${content.id})">
                            <i class="fas fa-times"></i> Rejeitar
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Fechar modal
function closeModal() {
    document.getElementById('content-modal').classList.add('hidden');
}

// Aprovar conteúdo
async function approveContent(id) {
    await updateContentStatus(id, 'aprovado');
}

// Rejeitar conteúdo
async function rejectContent(id) {
    await updateContentStatus(id, 'rejeitado');
}

// Atualizar status do conteúdo
async function updateContentStatus(id, status) {
    try {
        const observacoes = document.getElementById('content-observacoes')?.value || '';
        
        const response = await fetch(`/api/staff/conteudos/${id}/status`, {
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
            showToast(`Conteúdo ${status} com sucesso!`, 'success');
            closeModal();
            loadData();
        } else {
            // Se for erro de status já alterado, atualizar a página
            if (result.error && (result.error.includes('já está') || result.error.includes('já está aprovado') || result.error.includes('já está rejeitado') || result.error.includes('Conteúdo aprovado não pode ser rejeitado') || result.error.includes('Apenas conteúdos pendentes podem ser alterados'))) {
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

// Atualizar dados
function refreshData() {
    loadData();
}

// Utilitários
function getContentTypeText(tipo) {
    const tipos = {
        'video': 'Vídeo',
        'fotos': 'Fotos',
        'live': 'Live'
    };
    return tipos[tipo] || tipo;
}

function getStatusText(status) {
    const texts = {
        'pendente': 'Pendente',
        'aprovado': 'Aprovado',
        'rejeitado': 'Rejeitado'
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

// Abrir link do conteúdo
async function openContentLink(contentId) {
    try {
        const response = await fetch(`/api/staff/conteudos/${contentId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
            }
        });
        
        if (response.ok) {
            const content = await response.json();
            let link = null;
            
            if (content.tipo === 'video' && content.link_video) {
                link = content.link_video;
            } else if (content.tipo === 'fotos' && content.link_foto) {
                link = content.link_foto;
            }
            
            if (link) {
                window.open(link, '_blank');
            } else {
                showToast('Link não disponível para este conteúdo', 'error');
            }
        } else {
            throw new Error('Erro ao buscar dados do conteúdo');
        }
    } catch (error) {
        console.error('Erro ao abrir link:', error);
        showToast('Erro ao abrir link do conteúdo', 'error');
    }
}

// Marcar conteúdo como postado
async function markAsPosted(contentId) {
    try {
        const response = await fetch(`/api/staff/conteudos/${contentId}/postado`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Conteúdo marcado como postado com sucesso!', 'success');
            loadData(); // Recarregar dados para atualizar a interface
        } else {
            throw new Error(result.error || 'Erro ao marcar como postado');
        }
    } catch (error) {
        console.error('Erro ao marcar como postado:', error);
        showToast(error.message, 'error');
    }
}

// Funções globais
window.logout = logout;
window.viewContent = viewContent;
window.approveContent = approveContent;
window.rejectContent = rejectContent;
window.filterContents = filterContents;
window.refreshData = refreshData;
window.closeModal = closeModal;
window.openContentLink = openContentLink;
window.markAsPosted = markAsPosted; 