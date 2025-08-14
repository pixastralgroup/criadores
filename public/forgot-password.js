document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgot-password-form');
    const discordIdInput = document.getElementById('discord_id');
    const gameIdInput = document.getElementById('game_id');
    const recoverBtn = document.getElementById('recover-btn');
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const alertContainer = document.getElementById('alert-container');

    // Função para mostrar alertas
    function showAlert(message, type = 'info') {
        alertContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }

    // Função para mostrar loading
    function setLoading(loading) {
        if (loading) {
            recoverBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
        } else {
            recoverBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    // Função para validar Discord ID
    function validateDiscordId(discordId) {
        return /^\d{17,19}$/.test(discordId);
    }

    // Manipular envio do formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const discordId = discordIdInput.value.trim();
        const gameId = gameIdInput.value.trim();

        // Validações
        if (!discordId && !gameId) {
            showAlert('Por favor, digite seu Discord ID ou ID da Cidade.', 'error');
            discordIdInput.focus();
            return;
        }

        if (discordId && !validateDiscordId(discordId)) {
            showAlert('Por favor, digite um Discord ID válido (17-19 dígitos).', 'error');
            discordIdInput.focus();
            return;
        }

        // Mostrar loading
        setLoading(true);

        try {
            const requestData = {};
            if (discordId) requestData.discord_id = discordId;
            if (gameId) requestData.game_id = gameId;

            const response = await fetch('/api/creators/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(`
                    ✅ ${data.message}<br><br>
                    <strong>Próximos passos:</strong><br>
                    1. Verifique suas mensagens privadas no Discord<br>
                    2. Clique no link de recuperação enviado<br>
                    3. Defina uma nova senha<br><br>
                    <small>⚠️ O link expira em 1 hora!</small>
                `, 'success');
                
                // Limpar formulário
                form.reset();
                
            } else {
                let errorMessage = data.error || 'Erro desconhecido';
                
                // Tratar erros específicos
                if (data.discordError) {
                    errorMessage = `
                        ❌ ${errorMessage}<br><br>
                        <strong>Alternativas:</strong><br>
                        • Tente novamente em alguns minutos<br>
                        • Entre em contato com a equipe no Discord da cidade<br>
                        • Abra um ticket solicitando recuperação de senha
                    `;
                } else if (data.discordUnavailable) {
                    errorMessage = `
                        ❌ ${errorMessage}<br><br>
                        <strong>O que fazer:</strong><br>
                        • Entre em contato com a equipe no Discord da cidade<br>
                        • Abra um ticket solicitando recuperação de senha<br>
                        • Aguarde o sistema voltar ao normal
                    `;
                }
                
                showAlert(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Erro na requisição:', error);
            showAlert(`
                ❌ Erro de conexão<br><br>
                <strong>Possíveis causas:</strong><br>
                • Problema de internet<br>
                • Servidor temporariamente indisponível<br><br>
                <strong>Tente:</strong><br>
                • Verificar sua conexão<br>
                • Recarregar a página<br>
                • Tentar novamente em alguns minutos
            `, 'error');
        } finally {
            setLoading(false);
        }
    });

    // Limpar alertas quando o usuário começar a digitar
    discordIdInput.addEventListener('input', function() {
        if (alertContainer.innerHTML) {
            alertContainer.innerHTML = '';
        }
    });

    gameIdInput.addEventListener('input', function() {
        if (alertContainer.innerHTML) {
            alertContainer.innerHTML = '';
        }
    });

    // Verificar se há token na URL (para reset de senha)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Redirecionar para a página de reset de senha
        window.location.href = `reset-password.html?token=${token}`;
    }
}); 