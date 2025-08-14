// Variáveis globais
let currentCreator = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    checkCreatorAuth();
    setupEventListeners();
});

// Verificar autenticação do criador
async function checkCreatorAuth() {
    const creatorToken = localStorage.getItem('creator_token');
    if (creatorToken) {
        try {
            const response = await fetch('/api/creators/verify', {
                headers: {
                    'Authorization': `Bearer ${creatorToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentCreator = data.creator;
                window.location.href = '/creator-dashboard.html';
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
    document.getElementById('creator-login-form').addEventListener('submit', handleCreatorLogin);
}

// Manipular login do criador
async function handleCreatorLogin(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(e.target);
        const gameId = formData.get('game_id');
        const password = formData.get('password');
        
        const response = await fetch('/api/creators/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_id: gameId,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            localStorage.setItem('creator_token', result.token);
            currentCreator = result.creator;
            showToast('Login realizado com sucesso!', 'success');
            
            // Redirecionar para o dashboard
            setTimeout(() => {
                window.location.href = '/creator-dashboard.html';
            }, 1000);
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

// Logout
function logout() {
    localStorage.removeItem('creator_token');
    currentCreator = null;
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