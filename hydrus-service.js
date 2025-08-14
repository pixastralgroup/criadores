const { HYDRAUS_CONFIG } = require('./config');

class HydrusService {
    constructor() {
        this.apiUrl = HYDRAUS_CONFIG.apiUrl;
        this.storeId = HYDRAUS_CONFIG.storeId;
        this.token = HYDRAUS_CONFIG.token;
        this.couponSettings = HYDRAUS_CONFIG.couponSettings;
        
        // Verificar se o token está configurado
        if (!this.token) {
            console.warn('⚠️ HYDRUS_TOKEN não configurado no arquivo .env');
        } else {
            console.log('✅ HYDRUS_TOKEN carregado:', this.token.substring(0, 10) + '...');
        }
        
        if (!this.storeId) {
            console.warn('⚠️ HYDRUS_STORE_ID não configurado no arquivo .env');
        } else {
            console.log('✅ HYDRUS_STORE_ID carregado:', this.storeId);
        }
    }

    // Verificar se um cupom já existe
    async checkCouponExists(couponCode) {
        if (!this.token || !this.storeId) {
            throw new Error('Configuração da Hydrus.gg incompleta. Verifique HYDRUS_TOKEN e HYDRUS_STORE_ID no arquivo .env');
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/stores/${this.storeId}/coupons`, {
                method: 'GET',
                headers: {
                    'Authorization': this.token,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ao verificar cupom: ${response.status}`);
            }

            const coupons = await response.json();
            const data = coupons.data || coupons;
            return data.some(coupon => coupon.name === couponCode);
        } catch (error) {
            console.error('Erro ao verificar cupom na Hydrus:', error);
            throw error;
        }
    }

    // Criar um novo cupom
    async createCoupon(couponOrPayload, creatorName, maxRetries = 3) {
        if (!this.token || !this.storeId) {
            throw new Error('Configuração da Hydrus.gg incompleta. Verifique HYDRUS_TOKEN e HYDRUS_STORE_ID no arquivo .env');
        }
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                let couponData;
                if (typeof couponOrPayload === 'object' && couponOrPayload.name && couponOrPayload.value !== undefined) {
                    // Se for objeto customizado, usa direto
                    couponData = couponOrPayload;
                } else {
                    // Compatibilidade antiga: (nome, nomeCriador)
                    couponData = {
                        name: couponOrPayload,
                        value: this.couponSettings.value,
                        is_flat: this.couponSettings.is_flat,
                        minimum: this.couponSettings.minimum,
                        remaining: this.couponSettings.remaining,
                        is_ephemeral: this.couponSettings.is_ephemeral,
                        partner_commission: this.couponSettings.partner_commission
                    };
                }
                
                const response = await fetch(`${this.apiUrl}/stores/${this.storeId}/coupons`, {
                    method: 'POST',
                    headers: {
                        'Authorization': this.token,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(couponData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    const errorMessage = errorData.message || 'Erro desconhecido';
                    
                    // Se o erro for de conflito de nome e ainda há tentativas, tentar com nome modificado
                    if (errorMessage.includes('already exists') && attempt < maxRetries) {
                        console.log(`⚠️ Cupom '${couponData.name}' já existe, tentando com nome modificado...`);
                        const timestamp = Date.now().toString().slice(-4);
                        couponData.name = `${couponData.name}${timestamp}`;
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
                        continue;
                    }
                    
                    throw new Error(`Erro ao criar cupom: ${response.status} - ${errorMessage}`);
                }
                
                const createdCoupon = await response.json();
                console.log(`✅ Cupom criado com sucesso na Hydrus: ${couponData.name}`);
                return createdCoupon;
                
            } catch (error) {
                console.error(`Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // Verificar e criar cupom (com retry automático)
    async verifyAndCreateCoupon(couponCode, creatorName, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Verificar se o cupom já existe
                const exists = await this.checkCouponExists(couponCode);
                
                if (exists) {
                    throw new Error(`Cupom '${couponCode}' já existe na loja`);
                }

                // Criar o cupom
                const createdCoupon = await this.createCoupon(couponCode, creatorName);
                return {
                    success: true,
                    coupon: createdCoupon,
                    message: `Cupom '${couponCode}' criado com sucesso!`
                };

            } catch (error) {
                console.error(`Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
                
                if (attempt === maxRetries) {
                    return {
                        success: false,
                        error: error.message,
                        suggestion: this.generateCouponSuggestion(couponCode)
                    };
                }

                // Aguardar um pouco antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // Gerar sugestão de cupom alternativo
    generateCouponSuggestion(originalCode) {
        const timestamp = Date.now().toString().slice(-4);
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${originalCode}${timestamp}${randomSuffix}`;
    }

    // Buscar cupom pelo nome
    async getCouponByName(couponCode) {
        if (!this.token || !this.storeId) {
            throw new Error('Configuração da Hydrus.gg incompleta. Verifique HYDRUS_TOKEN e HYDRUS_STORE_ID no arquivo .env');
        }
        try {
            const response = await fetch(`${this.apiUrl}/stores/${this.storeId}/coupons`, {
                method: 'GET',
                headers: {
                    'Authorization': this.token,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Erro ao buscar cupom: ${response.status}`);
            }
            const coupons = await response.json();
            const data = coupons.data || coupons;
            return data.find(coupon => coupon.name === couponCode) || null;
        } catch (error) {
            console.error('Erro ao buscar cupom na Hydrus:', error);
            throw error;
        }
    }

    // Buscar cupom pelo ID
    async getCouponById(couponId) {
        if (!this.token || !this.storeId) {
            throw new Error('Configuração da Hydrus.gg incompleta. Verifique HYDRUS_TOKEN e HYDRUS_STORE_ID no arquivo .env');
        }
        try {
            const response = await fetch(`${this.apiUrl}/stores/${this.storeId}/coupons/${couponId}`, {
                method: 'GET',
                headers: {
                    'Authorization': this.token,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Erro ao buscar cupom: ${response.status}`);
            }
            const coupon = await response.json();
            return coupon.data || coupon;
        } catch (error) {
            console.error('Erro ao buscar cupom por ID na Hydrus:', error);
            throw error;
        }
    }

    // Deletar um cupom por ID
    async deleteCoupon(couponId) {
        if (!this.token || !this.storeId) {
            throw new Error('Configuração da Hydrus.gg incompleta. Verifique HYDRUS_TOKEN e HYDRUS_STORE_ID no arquivo .env');
        }
        try {
            const response = await fetch(`${this.apiUrl}/stores/${this.storeId}/coupons/${couponId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': this.token,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok && response.status !== 404) {
                const errorData = await response.json();
                throw new Error(`Erro ao deletar cupom: ${response.status} - ${errorData.message || 'Erro desconhecido'}`);
            }
            return true;
        } catch (error) {
            console.error('Erro ao deletar cupom na Hydrus:', error);
            throw error;
        }
    }

        // Testar conexão com a API
    async testConnection() {
        if (!this.token || !this.storeId) {
            console.warn('⚠️ Configuração da Hydrus.gg incompleta. Verifique HYDRUS_TOKEN e HYDRUS_STORE_ID no arquivo .env');
            return false;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/stores/${this.storeId}/coupons`, {
                method: 'GET',
                headers: {
                    'Authorization': this.token,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erro na conexão: ${response.status}`);
            }

            const couponsData = await response.json();
            console.log('✅ Conexão com Hydrus.gg estabelecida com sucesso');
            console.log(`🏪 Loja: ${this.storeId} - ${couponsData.total || 0} cupons encontrados`);
            return true;
        } catch (error) {
            console.error('❌ Erro na conexão com Hydrus.gg:', error);
            return false;
        }
    }
}

module.exports = HydrusService; 