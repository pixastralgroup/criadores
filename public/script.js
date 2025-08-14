// Variáveis globais
let areas = [];
let selectedAreas = [];
let currentTab = 'cadastro';

// Variável global para armazenar o arquivo de imagem
let currentImageFile = null;

// Debug
console.log('Script carregado com sucesso');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, inicializando...');
    loadAreas();
    setupEventListeners();
});

// Carregar áreas do servidor
async function loadAreas() {
    try {
        showLoading();
        const response = await fetch('/api/creators/areas');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const areasData = await response.json();
        console.log('Áreas carregadas:', areasData);
        
        // Verificar se as áreas têm a estrutura correta
        areas = areasData.map(area => {
            // Verificar se perguntas é uma string JSON válida
            if (typeof area.perguntas === 'string') {
                try {
                    area.perguntas = JSON.parse(area.perguntas);
                } catch (parseError) {
                    console.error('Erro ao fazer parse das perguntas da área:', area.nome, parseError);
                    area.perguntas = [];
                }
            } else if (!Array.isArray(area.perguntas)) {
                console.warn('Perguntas da área não é array:', area.nome, area.perguntas);
                area.perguntas = [];
            }
            return area;
        });
        
        renderAreas();
        hideLoading();
    } catch (error) {
        console.error('Erro ao carregar áreas:', error);
        showToast('Erro ao carregar áreas: ' + error.message, 'error');
        hideLoading();
    }
}

// Renderizar áreas na tela
function renderAreas() {
    const areasGrid = document.getElementById('areas-grid');
    areasGrid.innerHTML = '';

    areas.forEach(area => {
        const areaCard = document.createElement('div');
        areaCard.className = 'area-card';
        areaCard.onclick = () => toggleAreaSelection(area);
        
        areaCard.innerHTML = `
            <div class="area-icon">
                <i class="${getAreaIcon(area.nome)}"></i>
            </div>
            <div class="area-title">${area.nome}</div>
            <div class="area-description">${area.descricao}</div>
            <div class="area-checkbox">
                <i class="fas fa-check"></i>
            </div>
        `;
        
        areasGrid.appendChild(areaCard);
    });
}

// Alternar seleção de área
function toggleAreaSelection(area) {
    const areaCard = event.target.closest('.area-card');
    const isSelected = selectedAreas.some(selectedArea => selectedArea.id === area.id);
    
    if (isSelected) {
        // Remover da seleção
        selectedAreas = selectedAreas.filter(selectedArea => selectedArea.id !== area.id);
        areaCard.classList.remove('selected');
    } else {
        // Adicionar à seleção
        selectedAreas.push(area);
        areaCard.classList.add('selected');
    }
    
    // Atualizar botão de continuar
    updateContinueButton();
}

// Atualizar botão de continuar
function updateContinueButton() {
    const continueButton = document.getElementById('continue-button');
    if (selectedAreas.length > 0) {
        continueButton.style.display = 'block';
        continueButton.textContent = `Continuar (${selectedAreas.length} área${selectedAreas.length > 1 ? 's' : ''} selecionada${selectedAreas.length > 1 ? 's' : ''})`;
    } else {
        continueButton.style.display = 'none';
    }
}

// Mostrar formulário de cadastro
function showRegistrationForm() {
    if (selectedAreas.length === 0) {
        showToast('Selecione pelo menos uma área', 'error');
        return;
    }
    
    document.getElementById('area-selection').classList.add('hidden');
    document.getElementById('registration-form').classList.remove('hidden');
    
    // Atualizar áreas selecionadas no formulário
    const selectedAreaDisplay = document.getElementById('selected-area-display');
    selectedAreaDisplay.innerHTML = '';
    
    selectedAreas.forEach(area => {
        const areaDiv = document.createElement('div');
        areaDiv.className = 'selected-area-item';
        areaDiv.innerHTML = `
            <i class="${getAreaIcon(area.nome)}"></i>
            <div class="selected-area-info">
                <h4>${area.nome}</h4>
                <p>${area.descricao}</p>
            </div>
        `;
        selectedAreaDisplay.appendChild(areaDiv);
    });
    
    // Carregar perguntas específicas das áreas
    loadAreaQuestions();
}

// Carregar perguntas das áreas selecionadas
function loadAreaQuestions() {
    const questionsSection = document.getElementById('questions-section');
    questionsSection.innerHTML = '<h4>Perguntas Específicas</h4>';
    
    // Usar as perguntas da primeira área selecionada (todas são iguais agora)
    const primeiraArea = selectedAreas[0];
    
    // Verificar se a área tem perguntas válidas
    if (!primeiraArea || !primeiraArea.perguntas) {
        console.error('Área não encontrada ou sem perguntas:', primeiraArea);
        questionsSection.innerHTML += '<p class="error">Erro: Não foi possível carregar as perguntas da área selecionada.</p>';
        return;
    }
    
    let perguntas;
    
    // Tentar fazer parse das perguntas se for string
    if (typeof primeiraArea.perguntas === 'string') {
        try {
            perguntas = JSON.parse(primeiraArea.perguntas);
        } catch (parseError) {
            console.error('Erro ao fazer parse das perguntas:', parseError);
            console.error('Dados da área:', primeiraArea);
            questionsSection.innerHTML += '<p class="error">Erro: Formato de perguntas inválido.</p>';
            return;
        }
    } else if (Array.isArray(primeiraArea.perguntas)) {
        perguntas = primeiraArea.perguntas;
    } else {
        console.error('Formato de perguntas inválido:', typeof primeiraArea.perguntas, primeiraArea.perguntas);
        questionsSection.innerHTML += '<p class="error">Erro: Formato de perguntas inválido.</p>';
        return;
    }
    
    // Verificar se perguntas é um array válido
    if (!Array.isArray(perguntas) || perguntas.length === 0) {
        console.error('Perguntas não é um array válido:', perguntas);
        questionsSection.innerHTML += '<p class="error">Erro: Nenhuma pergunta encontrada para esta área.</p>';
        return;
    }
    
    // Adicionar informações sobre as áreas selecionadas e dados já coletados
    const areasInfo = document.createElement('div');
    areasInfo.className = 'selected-areas-info';
    areasInfo.innerHTML = `
        <p><strong>Áreas selecionadas:</strong> ${selectedAreas.map(area => area.nome).join(', ')}</p>
        <p><em>As perguntas abaixo são respondidas uma única vez para todas as áreas selecionadas.</em></p>
        <div class="info-note">
            <p><strong>Nota:</strong> As informações básicas (Nome, Email, Discord ID, ID do Jogo) já foram coletadas no formulário anterior.</p>
        </div>
    `;
    questionsSection.appendChild(areasInfo);
    
    // Criar as perguntas apenas uma vez
    perguntas.forEach((pergunta, perguntaIndex) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'form-group';
        questionDiv.innerHTML = `
            <label for="pergunta_${perguntaIndex}">${pergunta} *</label>
            <textarea id="pergunta_${perguntaIndex}" name="pergunta_${perguntaIndex}" required></textarea>
        `;
        questionsSection.appendChild(questionDiv);
    });
}

// Voltar para seleção de área
function voltarSelecao() {
    selectedAreas = [];
    document.getElementById('registration-form').classList.add('hidden');
    document.getElementById('area-selection').classList.remove('hidden');
    
    // Limpar seleção visual
    document.querySelectorAll('.area-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Esconder botão de continuar
    updateContinueButton();
}

// Configurar event listeners
function setupEventListeners() {
    // Navegação entre tabs
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('data-tab')) {
                e.preventDefault();
                const tab = this.getAttribute('data-tab');
                switchTab(tab);
            }
        });
    });
    
    // Formulário de cadastro
    document.getElementById('creator-form').addEventListener('submit', handleRegistration);
    
    // Setup image upload
    setupImageUpload();
}

// Trocar entre tabs
function switchTab(tab) {
    currentTab = tab;
    
    // Atualizar navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Mostrar conteúdo da tab
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// Manipular cadastro
async function handleRegistration(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(e.target);
        const respostas = [];
        
        // Coletar respostas das perguntas (respondidas apenas uma vez)
        let perguntas;
        
        // Verificar se a área tem perguntas válidas
        if (!selectedAreas[0] || !selectedAreas[0].perguntas) {
            throw new Error('Área selecionada não tem perguntas válidas');
        }
        
        // Tentar fazer parse das perguntas se for string
        if (typeof selectedAreas[0].perguntas === 'string') {
            try {
                perguntas = JSON.parse(selectedAreas[0].perguntas);
            } catch (parseError) {
                console.error('Erro ao fazer parse das perguntas:', parseError);
                console.error('Dados da área:', selectedAreas[0]);
                throw new Error('Formato de perguntas inválido');
            }
        } else if (Array.isArray(selectedAreas[0].perguntas)) {
            perguntas = selectedAreas[0].perguntas;
        } else {
            throw new Error('Formato de perguntas inválido');
        }
        
        // Verificar se perguntas é um array válido
        if (!Array.isArray(perguntas) || perguntas.length === 0) {
            throw new Error('Nenhuma pergunta encontrada para esta área');
        }
        
        const respostasUnicas = [];
        
        // Coletar as respostas únicas
        perguntas.forEach((pergunta, perguntaIndex) => {
            const resposta = formData.get(`pergunta_${perguntaIndex}`);
            respostasUnicas.push({
                pergunta: pergunta,
                resposta: resposta
            });
        });
        
        // Duplicar as respostas para todas as áreas selecionadas
        selectedAreas.forEach(area => {
            respostasUnicas.forEach(respostaUnica => {
                respostas.push({
                    area: area.nome,
                    pergunta: respostaUnica.pergunta,
                    resposta: respostaUnica.resposta
                });
            });
        });
        
        // Validar senhas
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (password !== confirmPassword) {
            throw new Error('As senhas não coincidem');
        }
        
        if (password.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres');
        }
        
        // Limpar o FormData e adicionar os dados corretos
        const newFormData = new FormData();
        
        // Adicionar campos básicos
        newFormData.append('nome', formData.get('nome'));
        newFormData.append('email', formData.get('email'));
        newFormData.append('telefone', formData.get('telefone'));
        newFormData.append('discord_id', formData.get('discord_id'));
        newFormData.append('game_id', formData.get('game_id'));
        newFormData.append('password', password);
        newFormData.append('areas_ids', JSON.stringify(selectedAreas.map(area => area.id)));
        newFormData.append('respostas', JSON.stringify(respostas));
        
        // Adicionar arquivo de imagem se existir
        const imageFile = currentImageFile;
        console.log('Arquivo de imagem encontrado:', imageFile);
        
        if (imageFile && imageFile instanceof File) {
            newFormData.append('profile_image', imageFile);
            console.log('✅ Arquivo de imagem adicionado ao FormData:', imageFile.name, imageFile.size, 'bytes');
        } else {
            console.log('❌ Arquivo de imagem não encontrado ou inválido:', imageFile);
            throw new Error('Imagem do perfil é obrigatória. Selecione uma imagem ou cole uma imagem (Ctrl+V).');
        }
        
        console.log('Enviando dados para cadastro (multipart):', {
            nome: formData.get('nome'),
            email: formData.get('email'),
            discord_id: formData.get('discord_id'),
            game_id: formData.get('game_id'),
            areas_ids: selectedAreas.map(area => area.id),
            profile_image: imageFile ? `[ARQUIVO: ${imageFile.name}]` : '[AUSENTE]'
        });
        
        const response = await fetch('/api/creators/cadastro', {
            method: 'POST',
            body: newFormData // Não definir Content-Type, deixar o browser definir como multipart/form-data
        });
        
        console.log('Resposta do servidor:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        // Verificar se a resposta é JSON válido
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Resposta não é JSON:', responseText);
            throw new Error(`Erro no servidor: Resposta inválida (${response.status})`);
        }
        
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            console.error('Erro ao fazer parse da resposta JSON:', jsonError);
            const responseText = await response.text();
            console.error('Resposta recebida:', responseText);
            throw new Error('Erro ao processar resposta do servidor');
        }
        
        if (response.ok) {
            showRegistrationResult();
            showToast('Cadastro realizado com sucesso!', 'success');
        } else {
            throw new Error(result.error || 'Erro ao realizar cadastro');
        }
        
    } catch (error) {
        console.error('Erro no cadastro:', error);
        
        // Verificar se é erro de dados duplicados
        const errorMessage = error.message;
        if (errorMessage.includes('email já está cadastrado')) {
            showToast('❌ Este email já está sendo usado por outro criador. Use um email diferente.', 'error');
            document.getElementById('email').focus();
        } else if (errorMessage.includes('Discord ID já está cadastrado')) {
            showToast('❌ Este Discord ID já está sendo usado por outro criador. Use um Discord ID diferente.', 'error');
            document.getElementById('discord_id').focus();
        } else if (errorMessage.includes('ID do jogo já está cadastrado')) {
            showToast('❌ Este ID do jogo já está sendo usado por outro criador. Use um ID diferente.', 'error');
            document.getElementById('game_id').focus();
        } else if (errorMessage.includes('telefone já está cadastrado')) {
            showToast('❌ Este telefone já está sendo usado por outro criador. Use um telefone diferente.', 'error');
            document.getElementById('telefone').focus();
        } else {
            showToast(errorMessage, 'error');
        }
    } finally {
        hideLoading();
    }
}

// Mostrar resultado do cadastro
function showRegistrationResult() {
    document.getElementById('registration-form').classList.add('hidden');
    document.getElementById('registration-result').classList.remove('hidden');
}

// Resetar formulário
function resetForm() {
    document.getElementById('registration-result').classList.add('hidden');
    document.getElementById('area-selection').classList.remove('hidden');
    document.getElementById('creator-form').reset();
    selectedAreas = [];
    
    // Limpar seleção visual
    document.querySelectorAll('.area-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Esconder botão de continuar
    updateContinueButton();
}

// Utilitários
function getAreaIcon(areaName) {
    const icons = {
        'FOTOS': 'fas fa-camera',
        'VIDEO': 'fas fa-video',
        'LIVE': 'fas fa-broadcast-tower'
    };
    return icons[areaName] || 'fas fa-briefcase';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
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

// Image Upload Functions
function setupImageUpload() {
    const uploadArea = document.getElementById('image-upload-area');
    const fileInput = document.getElementById('file-input');
    
    console.log('Setting up image upload...');
    console.log('Upload area found:', !!uploadArea);
    console.log('File input found:', !!fileInput);
    
    if (!uploadArea) return;
    
    // Click to select file
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Paste from clipboard
    document.addEventListener('paste', handlePaste);
    console.log('Paste event listener added to document');
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
        // Armazenar o arquivo globalmente
        currentImageFile = file;
        console.log('Arquivo selecionado armazenado globalmente');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('image-upload-area').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('image-upload-area').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('image-upload-area').classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        processImage(files[0]);
        // Armazenar o arquivo globalmente
        currentImageFile = files[0];
        console.log('Arquivo dropado armazenado globalmente');
    }
}

function handlePaste(e) {
    console.log('Paste event detected');
    const items = e.clipboardData.items;
    console.log('Clipboard items:', items);
    
    for (let item of items) {
        console.log('Item type:', item.type);
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            console.log('Image file found:', file);
            if (file) {
                processImage(file);
                // Armazenar o arquivo globalmente
                currentImageFile = file;
                console.log('Arquivo armazenado globalmente via paste');
            }
            break;
        }
    }
}

function processImage(file) {
    console.log('Processando imagem:', file.name, file.size, 'bytes');
    
    // Criar um arquivo real se for necessário
    if (file instanceof File) {
        // Já é um arquivo real, usar diretamente
        displayImage(URL.createObjectURL(file));
        
        // Armazenar o arquivo globalmente
        currentImageFile = file;
        console.log('Arquivo real armazenado globalmente');
    } else {
        // Se for data URL, converter para arquivo
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            displayImage(imageData);
            
            // Converter data URL para arquivo
            const base64Data = imageData.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: file.type || 'image/png' });
            const realFile = new File([blob], 'pasted-image.png', { type: blob.type });
            
            // Armazenar o arquivo globalmente
            currentImageFile = realFile;
            console.log('Arquivo convertido armazenado globalmente');
        };
        reader.readAsDataURL(file);
    }
}

function displayImage(imageData) {
    const placeholder = document.getElementById('upload-placeholder');
    const uploadedImage = document.getElementById('uploaded-image');
    const previewImage = document.getElementById('preview-image');
    
    previewImage.src = imageData;
    placeholder.classList.add('hidden');
    uploadedImage.classList.remove('hidden');
}

function removeImage() {
    const placeholder = document.getElementById('upload-placeholder');
    const uploadedImage = document.getElementById('uploaded-image');
    const fileInput = document.getElementById('file-input');
    const imageData = document.getElementById('image-data');
    
    placeholder.classList.remove('hidden');
    uploadedImage.classList.add('hidden');
    fileInput.value = '';
    imageData.value = '';
    
    // Limpar a variável global
    currentImageFile = null;
    console.log('Arquivo removido da variável global');
}

// Funções globais para uso no HTML
window.voltarSelecao = voltarSelecao;
window.resetForm = resetForm;
window.removeImage = removeImage; 