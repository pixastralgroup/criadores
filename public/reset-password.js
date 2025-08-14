document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reset-password-form');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const resetBtn = document.getElementById('reset-btn');
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const alertContainer = document.getElementById('alert-container');
    const passwordStrength = document.getElementById('password-strength');

    // Obter token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showAlert('❌ Token de recuperação não encontrado. Solicite um novo link de recuperação.', 'error');
        resetBtn.disabled = true;
        return;
    }

    // Função para mostrar alertas
    function showAlert(message, type = 'info') {
        alertContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;
        
        // Auto-remover após 5 segundos (exceto para sucesso)
        if (type !== 'success') {
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }
    }

    // Função para mostrar loading
    function setLoading(loading) {
        if (loading) {
            resetBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
        } else {
            resetBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    // Função para verificar força da senha
    function checkPasswordStrength(password) {
        let strength = 0;
        let feedback = [];

        if (password.length >= 8) strength++;
        else feedback.push('Pelo menos 8 caracteres');

        if (/[a-z]/.test(password)) strength++;
        else feedback.push('Pelo menos uma letra minúscula');

        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('Pelo menos uma letra maiúscula');

        if (/[0-9]/.test(password)) strength++;
        else feedback.push('Pelo menos um número');

        if (/[^A-Za-z0-9]/.test(password)) strength++;
        else feedback.push('Pelo menos um caractere especial');

        if (strength <= 2) {
            passwordStrength.className = 'password-strength weak';
            passwordStrength.textContent = `Senha fraca: ${feedback.join(', ')}`;
        } else if (strength <= 4) {
            passwordStrength.className = 'password-strength medium';
            passwordStrength.textContent = `Senha média: ${feedback.join(', ')}`;
        } else {
            passwordStrength.className = 'password-strength strong';
            passwordStrength.textContent = 'Senha forte! ✅';
        }

        return strength;
    }

    // Função para alternar visibilidade da senha
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const button = input.parentNode.querySelector('.password-toggle i');
        
        if (input.type === 'password') {
            input.type = 'text';
            button.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            button.className = 'fas fa-eye';
        }
    };

    // Verificar força da senha em tempo real
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        if (password.length > 0) {
            checkPasswordStrength(password);
        } else {
            passwordStrength.textContent = '';
            passwordStrength.className = 'password-strength';
        }
    });

    // Manipular envio do formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validações
        if (!newPassword) {
            showAlert('Por favor, digite sua nova senha.', 'error');
            newPasswordInput.focus();
            return;
        }

        if (newPassword.length < 6) {
            showAlert('A senha deve ter pelo menos 6 caracteres.', 'error');
            newPasswordInput.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('As senhas não coincidem. Verifique e tente novamente.', 'error');
            confirmPasswordInput.focus();
            return;
        }

        // Verificar força da senha
        const strength = checkPasswordStrength(newPassword);
        if (strength <= 2) {
            const shouldContinue = confirm('Sua senha é considerada fraca. Deseja continuar mesmo assim?');
            if (!shouldContinue) {
                return;
            }
        }

        // Mostrar loading
        setLoading(true);

        try {
            const response = await fetch('/api/creators/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: token,
                    newPassword: newPassword 
                })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(`
                    ✅ ${data.message}<br><br>
                    <strong>Sua senha foi alterada com sucesso!</strong><br><br>
                    • Você receberá uma confirmação no Discord<br>
                    • Agora você pode fazer login com sua nova senha<br>
                    • Este link não pode ser usado novamente
                `, 'success');
                
                // Limpar formulário
                form.reset();
                passwordStrength.textContent = '';
                passwordStrength.className = 'password-strength';
                
                // Desabilitar formulário após sucesso
                resetBtn.disabled = true;
                newPasswordInput.disabled = true;
                confirmPasswordInput.disabled = true;
                
                // Redirecionar para login após 3 segundos
                setTimeout(() => {
                    window.location.href = 'creator-dashboard.html';
                }, 3000);
                
            } else {
                let errorMessage = data.error || 'Erro desconhecido';
                
                // Tratar erros específicos
                if (data.error === 'Token inválido ou expirado') {
                    errorMessage = `
                        ❌ ${errorMessage}<br><br>
                        <strong>Possíveis causas:</strong><br>
                        • O link expirou (válido por 1 hora)<br>
                        • O link já foi usado<br>
                        • O link é inválido<br><br>
                        <strong>Solução:</strong><br>
                        • Solicite um novo link de recuperação
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
    newPasswordInput.addEventListener('input', function() {
        if (alertContainer.innerHTML && !alertContainer.querySelector('.alert-success')) {
            alertContainer.innerHTML = '';
        }
    });

    confirmPasswordInput.addEventListener('input', function() {
        if (alertContainer.innerHTML && !alertContainer.querySelector('.alert-success')) {
            alertContainer.innerHTML = '';
        }
    });
}); 