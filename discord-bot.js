const { Client, GatewayIntentBits, Partials } = require('discord.js');

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences
            ],
            partials: [Partials.GuildMember]
        });
        
        this.guildId = null;
        this.roleId = process.env.DISCORD_LIVE_ROLE_ID || '1396331878197493821';
        this.wlRoleId = process.env.DISCORD_WL_ROLE_ID || '1396356274287018137';
        
        // Cargos por categoria de criador
        this.categoriaRoles = {
            'FOTOS': process.env.DISCORD_FOTOS_ROLE_ID || '1396356274287018138',
            'VIDEO': process.env.DISCORD_VIDEO_ROLE_ID || '1396356274287018139',
            'LIVE': process.env.DISCORD_LIVE_CREATOR_ROLE_ID || '1396356274287018140'
        };
        
        this.activeLives = new Map(); // Map para controlar lives ativas
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.client.on('ready', () => {
            console.log(`🤖 Bot do Discord conectado como ${this.client.user.tag}`);
            console.log(`🎭 Pronto para gerenciar cargos de live!`);
            console.log(`🎫 Pronto para gerenciar códigos de WL!`);
            
            // Registrar comandos slash
            this.registerSlashCommands();
        });
        
        this.client.on('error', (error) => {
            console.error('❌ Erro no bot do Discord:', error);
        });
        
        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isCommand()) {
                if (interaction.commandName === 'criar-painel-wl') {
                    await this.handleCreateWLPanel(interaction);
                } else if (interaction.commandName === 'criar-painel-indicacao') {
                    await this.handleCreateIndicacaoPanel(interaction);
                }
            } else if (interaction.isButton()) {
                if (interaction.customId === 'redeem_wl_code') {
                    await this.handleRedeemWLButton(interaction);
                } else if (interaction.customId === 'fazer_indicacao') {
                    await this.handleFazerIndicacaoButton(interaction);
                } else if (interaction.customId.startsWith('aprovar_indicacao_')) {
                    await this.handleAprovarIndicacao(interaction);
                } else if (interaction.customId.startsWith('rejeitar_indicacao_')) {
                    await this.handleRejeitarIndicacao(interaction);
                }
            } else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'redeem_wl_modal') {
                    await this.handleRedeemWLModal(interaction);
                } else if (interaction.customId === 'indicacao_modal') {
                    await this.handleIndicacaoModal(interaction);
                }
            }
        });
    }
    
    async registerSlashCommands() {
        try {
            const guild = this.client.guilds.cache.get(this.guildId);
            if (!guild) return;
            
            await guild.commands.set([
                {
                    name: 'criar-painel-wl',
                    description: 'Cria um painel para resgate de códigos de WL',
                    defaultMemberPermissions: '0'
                },
                {
                    name: 'criar-painel-indicacao',
                    description: 'Cria um painel para o sistema de indicação',
                    defaultMemberPermissions: '0'
                }
            ]);
            
            console.log('✅ Comandos slash registrados');
        } catch (error) {
            console.error('❌ Erro ao registrar comandos slash:', error);
        }
    }
    
    async handleCreateWLPanel(interaction) {
        try {
            // Verificar permissões
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply({ content: '❌ Você não tem permissão para usar este comando!', flags: 64 });
                return;
            }
            
            const embed = {
                color: 0x4f46e5,
                title: '🎫 Sistema de Códigos WL',
                description: 'Use um código de WL para liberar sua whitelist!',
                fields: [
                    {
                        name: '📋 Como usar:',
                        value: '1. Clique no botão "Resgatar Código WL" abaixo\n2. Insira o código recebido\n3. Digite seu ID do jogo\n4. Digite seu nome\n5. Aguarde a confirmação!',
                        inline: false
                    },
                    {
                        name: '⚠️ Importante:',
                        value: '• Cada código pode ser usado apenas uma vez\n• Certifique-se de que o ID está correto\n• O nome será atualizado no formato "Nome | ID"',
                        inline: false
                    }
                ],
                footer: {
                    text: 'Sistema de Códigos WL - Criadores'
                },
                timestamp: new Date()
            };
            
            const button = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        label: '🎫 Resgatar Código WL',
                        custom_id: 'redeem_wl_code',
                        emoji: {
                            name: '🎫'
                        }
                    }
                ]
            };
            
            await interaction.reply({ 
                embeds: [embed], 
                components: [button] 
            });
            
        } catch (error) {
            console.error('❌ Erro ao criar painel WL:', error);
            await interaction.reply({ content: '❌ Erro ao criar painel!', flags: 64 });
        }
    }
    
    async handleCreateIndicacaoPanel(interaction) {
        try {
            // Verificar permissões
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply({ content: '❌ Você não tem permissão para usar este comando!', flags: 64 });
                return;
            }
            
            const embed = {
                color: 0x8b5cf6,
                title: '**INDIQUE PARA PULAR WL** <a:38:1266811129699762227> ',
                description: '',
                fields: [
                    {
                        name: '<a:73:1266795292649586902> **Como funciona:**',
                        value: '\n <a:62:1266795338262642709> Clique no botão Indicar e preencha os dados da pessoa (ID do Discord, Nome, ID do jogo e outras informações).\n<a:62:1266795338262642709> Após o envio, será feita uma análise. Se a pessoa não tiver perfil com apologia a hack, comportamento tóxico ou participação em servidores de hack, a aprovação será feita em até 24 horas.\n\n<a:87:1266795251075383531> Após aprovado, não é necessário chamar a staff — a pessoa receberá automaticamente os cargos e será liberada in-game.',
                        inline: false
                    }
                ],
                footer: {
                    text: 'Alto Astral RP - Sistema de Indicação'
                },
                timestamp: new Date()
            };
            
            const button = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        label: 'Fazer Indicação',
                        custom_id: 'fazer_indicacao',
                        emoji: {
                            name: '🎯'
                        }
                    }
                ]
            };
            
            await interaction.reply({ 
                embeds: [embed], 
                components: [button] 
            });
            
        } catch (error) {
            console.error('❌ Erro ao criar painel de indicação:', error);
            await interaction.reply({ content: '❌ Erro ao criar painel de indicação!', flags: 64 });
        }
    }
    
    async handleFazerIndicacaoButton(interaction) {
        try {
            const modal = {
                title: '🎯 Fazer Indicação',
                custom_id: 'indicacao_modal',
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'nome_indicado',
                                label: 'Nome Completo do Indicado',
                                style: 1,
                                min_length: 3,
                                max_length: 50,
                                placeholder: 'Ex: João Silva',
                                required: true
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'id_jogo',
                                label: 'ID do Jogo (número da conta)',
                                style: 1,
                                min_length: 1,
                                max_length: 10,
                                placeholder: 'Ex: 12345',
                                required: true
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'id_discord',
                                label: 'ID do Discord',
                                style: 1,
                                min_length: 17,
                                max_length: 20,
                                placeholder: 'Ex: 123456789012345678',
                                required: true
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'experiencia_rp',
                                label: 'Experiência em RP e cidades que já jogou',
                                style: 2,
                                min_length: 10,
                                max_length: 1000,
                                placeholder: 'Descreva a experiência em RP, cidades que já jogou, tempo de experiência...',
                                required: true
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'responsabilidade',
                                label: 'Responsabilidade por punições',
                                style: 2,
                                min_length: 10,
                                max_length: 500,
                                placeholder: 'Você se responsabiliza por qualquer punição que o indicado possa receber?',
                                required: true
                            }
                        ]
                    }
                ]
            };
            
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('❌ Erro ao abrir modal de indicação:', error);
            await interaction.reply({ content: '❌ Erro ao abrir formulário de indicação!', flags: 64 });
        }
    }
    
    async handleRedeemWLButton(interaction) {
        try {
            const modal = {
                title: '🎫 Resgatar Código WL',
                custom_id: 'redeem_wl_modal',
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'wl_code',
                                label: 'Código WL',
                                style: 1,
                                min_length: 14,
                                max_length: 20,
                                placeholder: 'Ex: ALTOASTRAL9401',
                                required: true
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'player_id',
                                label: 'ID do Jogo',
                                style: 1,
                                min_length: 1,
                                max_length: 10,
                                placeholder: 'Ex: 123',
                                required: true
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: 'player_name',
                                label: 'Nome Completo',
                                style: 1,
                                min_length: 2,
                                max_length: 50,
                                placeholder: 'Ex: João Silva',
                                required: true
                            }
                        ]
                    }
                ]
            };
            
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('❌ Erro ao mostrar modal WL:', error);
            await interaction.reply({ content: '❌ Erro ao abrir formulário!', flags: 64 });
        }
    }
    
    async handleRedeemWLModal(interaction) {
        try {
            await interaction.deferReply({ flags: 64 }); // 64 = ephemeral
            
            const code = interaction.fields.getTextInputValue('wl_code').toUpperCase();
            const playerId = parseInt(interaction.fields.getTextInputValue('player_id'));
            const playerName = interaction.fields.getTextInputValue('player_name').trim();
            
            // Validações
            const expectedLength = (process.env.WL_TAG_PREFIX || 'ALTOASTRAL').length + 4;
            if (!code || code.length !== expectedLength) {
                await interaction.editReply(`❌ Código deve ter exatamente ${expectedLength} caracteres!`);
                return;
            }
            
            if (!playerId || playerId < 1) {
                await interaction.editReply('❌ ID do jogo deve ser um número válido!');
                return;
            }
            
            if (!playerName || playerName.length < 2) {
                await interaction.editReply('❌ Nome deve ter pelo menos 2 caracteres!');
                return;
            }
            
            // Fazer requisição para a API
            const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8080'}/api/creators/use-wl-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    playerId: playerId,
                    playerName: playerName,
                    discordUserId: interaction.user.id
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Conceder cargo WL ao usuário do Discord que clicou no botão
                try {
                    const roleResult = await this.addWLRole(interaction.user.id, this.wlRoleId, playerName, playerId);
                    console.log(`✅ Cargo WL concedido para ${interaction.user.tag} (${interaction.user.id})`);
                    if (roleResult.nickname) {
                        console.log(`✅ Nome atualizado: ${roleResult.nickname}`);
                    }
                } catch (roleError) {
                    console.error('❌ Erro ao conceder cargo WL:', roleError);
                }
                
                const embed = {
                    color: 0x38a169,
                    title: '✅ WL Liberada com Sucesso!',
                    description: result.message,
                    fields: [
                        {
                            name: '🎮 Jogador',
                            value: playerName,
                            inline: true
                        },
                        {
                            name: '🆔 ID',
                            value: playerId.toString(),
                            inline: true
                        },
                        {
                            name: '🎫 Código',
                            value: code,
                            inline: true
                        },
                        {
                            name: '👤 Discord',
                            value: interaction.user.tag,
                            inline: true
                        }
                    ],
                    footer: {
                        text: 'Sistema de Códigos WL'
                    },
                    timestamp: new Date()
                };
                
                await interaction.editReply({ embeds: [embed] });
                
                // Log do sucesso
                console.log(`✅ Código WL usado por ${playerName} (ID: ${playerId}) - Discord: ${interaction.user.tag}`);
                
            } else {
                const embed = {
                    color: 0xe53e3e,
                    title: '❌ Erro no Resgate',
                    description: result.error,
                    footer: {
                        text: 'Sistema de Códigos WL'
                    },
                    timestamp: new Date()
                };
                
                await interaction.editReply({ embeds: [embed] });
                
                // Log do erro
                console.log(`❌ Erro ao usar código WL: ${result.error}`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar modal WL:', error);
            
            const embed = {
                color: 0xe53e3e,
                title: '❌ Erro de Conexão',
                description: 'Erro ao conectar com o servidor. Tente novamente.',
                footer: {
                    text: 'Sistema de Códigos WL'
                },
                timestamp: new Date()
            };
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    async handleIndicacaoModal(interaction) {
        try {
            const nomeIndicado = interaction.fields.getTextInputValue('nome_indicado');
            const idJogo = interaction.fields.getTextInputValue('id_jogo');
            const idDiscord = interaction.fields.getTextInputValue('id_discord');
            const experienciaRP = interaction.fields.getTextInputValue('experiencia_rp');
            const responsabilidade = interaction.fields.getTextInputValue('responsabilidade');
            
            // Validar ID do Discord (deve ser numérico)
            if (!/^\d+$/.test(idDiscord)) {
                await interaction.reply({ 
                    content: '❌ ID do Discord inválido! Certifique-se de que é um número válido.', 
                    flags: 64 
                });
                return;
            }
            
            // Validar ID do jogo (deve ser numérico)
            if (!/^\d+$/.test(idJogo)) {
                await interaction.reply({ 
                    content: '❌ ID do jogo inválido! Certifique-se de que é um número válido.', 
                    flags: 64 
                });
                return;
            }
            
            // Criar embed para enviar para o canal de staff
            const embed = {
                color: 0x8b5cf6,
                title: '🎯 Nova Indicação Recebida',
                description: `Uma nova indicação foi enviada por ${interaction.user.tag}`,
                fields: [
                    {
                        name: '👤 Nome do Indicado',
                        value: nomeIndicado,
                        inline: true
                    },
                    {
                        name: '🎮 ID do Jogo',
                        value: idJogo,
                        inline: true
                    },
                    {
                        name: '📱 ID do Discord',
                        value: `<@${idDiscord}>`,
                        inline: true
                    },
                    {
                        name: '📚 Experiência em RP',
                        value: experienciaRP,
                        inline: false
                    },
                    {
                        name: '⚠️ Responsabilidade',
                        value: responsabilidade,
                        inline: false
                    },
                    {
                        name: '👤 Indicado por',
                        value: `${interaction.user.tag} (${interaction.user.id})`,
                        inline: false
                    }
                ],
                footer: {
                    text: 'Sistema de Indicação - Alto Astral RP'
                },
                timestamp: new Date()
            };
            
            // Criar botões de ação
            const actionButtons = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3, // Verde
                        label: '✅ Aprovar',
                        custom_id: `aprovar_indicacao_${idDiscord}_${idJogo}`,
                        emoji: {
                            name: '✅'
                        }
                    },
                    {
                        type: 2,
                        style: 4, // Vermelho
                        label: '❌ Rejeitar',
                        custom_id: `rejeitar_indicacao_${idDiscord}_${idJogo}`,
                        emoji: {
                            name: '❌'
                        }
                    }
                ]
            };
            
            // Enviar para o canal de staff (você pode configurar o ID do canal)
            const staffChannelId = process.env.DISCORD_STAFF_CHANNEL_ID || interaction.channelId;
            const staffChannel = interaction.guild.channels.cache.get(staffChannelId);
            
            if (staffChannel) {
                await staffChannel.send({ 
                    embeds: [embed],
                    components: [actionButtons]
                });
            }
            
            // Responder ao usuário
            await interaction.reply({ 
                content: '✅ Sua indicação foi enviada com sucesso! A equipe irá analisar e entrará em contato em breve.',
                flags: 64 
            });
            
            console.log(`🎯 Indicação enviada por ${interaction.user.tag} para ${nomeIndicado} (ID: ${idJogo})`);
            
        } catch (error) {
            console.error('❌ Erro ao processar indicação:', error);
            await interaction.reply({ 
                content: '❌ Erro ao processar indicação! Tente novamente.', 
                flags: 64 
            });
        }
    }
    
    async handleAprovarIndicacao(interaction) {
        try {
            // Verificar permissões
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply({ 
                    content: '❌ Você não tem permissão para aprovar indicações!', 
                    flags: 64 
                });
                return;
            }
            
            // Responder imediatamente para evitar timeout
            await interaction.deferUpdate();
            
            // Extrair dados do custom_id
            const [, , idDiscord, idJogo] = interaction.customId.split('_');
            
            // Buscar informações da indicação no embed
            const embed = interaction.message.embeds[0];
            const nomeIndicado = embed.fields.find(f => f.name === '👤 Nome do Indicado')?.value;
            const experienciaRP = embed.fields.find(f => f.name === '📚 Experiência em RP')?.value;
            const indicadoPor = embed.fields.find(f => f.name === '👤 Indicado por')?.value;
            
            // Conceder cargo de Morador (você pode configurar o ID do cargo)
            const moradorRoleId = process.env.DISCORD_MORADOR_ROLE_ID || this.wlRoleId; // Usar WL como fallback
            
            try {
                await this.addWLRole(idDiscord, moradorRoleId, nomeIndicado, idJogo);
                console.log(`✅ Cargo de Morador concedido para ${nomeIndicado} (${idDiscord})`);
            } catch (roleError) {
                console.error('❌ Erro ao conceder cargo de Morador:', roleError);
            }

            // Liberar whitelisted no banco de dados
            try {
                console.log(`🔍 Tentando liberar whitelisted para ID: ${idJogo}`);
                await global.database.liberarWhitelistPorIndicacao(idJogo);
                console.log(`✅ Whitelisted liberado para ${nomeIndicado} (ID: ${idJogo})`);
            } catch (wlError) {
                console.error('❌ Erro ao liberar whitelisted:', wlError);
            }
            
            // Enviar mensagem privada para o indicado
            try {
                const embedAprovacao = {
                    color: 0x38a169,
                    title: '✅ Indicação Aprovada!',
                    description: 'Sua indicação foi aprovada pela equipe do Alto Astral RP!',
                    fields: [
                        {
                            name: '🎮 Jogador',
                            value: nomeIndicado,
                            inline: true
                        },
                        {
                            name: '🆔 ID do Jogo',
                            value: idJogo,
                            inline: true
                        },
                        {
                            name: '👤 Discord',
                            value: `<@${idDiscord}>`,
                            inline: true
                        },
                        {
                            name: '🎯 Próximos Passos',
                            value: '• Acesso liberado no servidor\n• Cargo de Morador concedido\n• Nickname alterado automaticamente\n• Bem-vindo ao Alto Astral RP!',
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'Alto Astral RP - Sistema de Indicação'
                    },
                    timestamp: new Date()
                };
                
                await this.sendDirectEmbed(idDiscord, embedAprovacao);
                console.log(`✅ Mensagem de aprovação enviada para ${idDiscord}`);
            } catch (dmError) {
                console.error('❌ Erro ao enviar DM de aprovação:', dmError);
            }
            
            // Atualizar a mensagem original
            const embedAtualizado = {
                ...embed,
                color: 0x38a169,
                title: '✅ Indicação Aprovada',
                description: `Indicação aprovada por ${interaction.user.tag}`,
                fields: [
                    ...embed.fields,
                    {
                        name: '✅ Status',
                        value: 'APROVADA',
                        inline: true
                    },
                    {
                        name: '👤 Aprovado por',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: '⏰ Data/Hora',
                        value: new Date().toLocaleString('pt-BR'),
                        inline: true
                    }
                ]
            };
            
            // Atualizar a mensagem original
            await interaction.editReply({
                embeds: [embedAtualizado],
                components: []
            });
            
            // Enviar confirmação separada
            await interaction.followUp({
                content: '✅ Indicação aprovada com sucesso!',
                flags: 64
            });
            
            console.log(`✅ Indicação aprovada por ${interaction.user.tag} para ${nomeIndicado}`);
            
        } catch (error) {
            console.error('❌ Erro ao aprovar indicação:', error);
            try {
                await interaction.followUp({ 
                    content: '❌ Erro ao aprovar indicação!', 
                    flags: 64 
                });
            } catch (followUpError) {
                console.error('❌ Erro ao enviar followUp:', followUpError);
            }
        }
    }
    
    async handleRejeitarIndicacao(interaction) {
        try {
            // Verificar permissões
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply({ 
                    content: '❌ Você não tem permissão para rejeitar indicações!', 
                    flags: 64 
                });
                return;
            }
            
            // Responder imediatamente para evitar timeout
            await interaction.deferUpdate();
            
            // Extrair dados do custom_id
            const [, , idDiscord, idJogo] = interaction.customId.split('_');
            
            // Buscar informações da indicação no embed
            const embed = interaction.message.embeds[0];
            const nomeIndicado = embed.fields.find(f => f.name === '👤 Nome do Indicado')?.value;
            const indicadoPor = embed.fields.find(f => f.name === '👤 Indicado por')?.value;
            
            // Enviar mensagem privada para o indicado
            try {
                const embedRejeicao = {
                    color: 0xe53e3e,
                    title: '❌ Indicação Rejeitada',
                    description: 'Sua indicação foi rejeitada pela equipe do Alto Astral RP.',
                    fields: [
                        {
                            name: '🎮 Jogador',
                            value: nomeIndicado,
                            inline: true
                        },
                        {
                            name: '🆔 ID do Jogo',
                            value: idJogo,
                            inline: true
                        },
                        {
                            name: '👤 Discord',
                            value: `<@${idDiscord}>`,
                            inline: true
                        },
                        {
                            name: '📝 O que fazer agora',
                            value: '• Entre em contato com quem te indicou\n• Verifique se todas as informações estão corretas\n• Aguarde uma nova oportunidade\n• Mantenha-se ativo na comunidade',
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'Alto Astral RP - Sistema de Indicação'
                    },
                    timestamp: new Date()
                };
                
                await this.sendDirectEmbed(idDiscord, embedRejeicao);
                console.log(`✅ Mensagem de rejeição enviada para ${idDiscord}`);
            } catch (dmError) {
                console.error('❌ Erro ao enviar DM de rejeição:', dmError);
            }
            
            // Atualizar a mensagem original
            const embedAtualizado = {
                ...embed,
                color: 0xe53e3e,
                title: '❌ Indicação Rejeitada',
                description: `Indicação rejeitada por ${interaction.user.tag}`,
                fields: [
                    ...embed.fields,
                    {
                        name: '❌ Status',
                        value: 'REJEITADA',
                        inline: true
                    },
                    {
                        name: '👤 Rejeitado por',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: '⏰ Data/Hora',
                        value: new Date().toLocaleString('pt-BR'),
                        inline: true
                    }
                ]
            };
            
            // Atualizar a mensagem original
            await interaction.editReply({
                embeds: [embedAtualizado],
                components: []
            });
            
            // Enviar confirmação separada
            await interaction.followUp({
                content: '❌ Indicação rejeitada com sucesso!',
                flags: 64
            });
            
            console.log(`❌ Indicação rejeitada por ${interaction.user.tag} para ${nomeIndicado}`);
            
        } catch (error) {
            console.error('❌ Erro ao rejeitar indicação:', error);
            try {
                await interaction.followUp({ 
                    content: '❌ Erro ao rejeitar indicação!', 
                    flags: 64 
                });
            } catch (followUpError) {
                console.error('❌ Erro ao enviar followUp:', followUpError);
            }
        }
    }
    
    async connect(token, guildId) {
        try {
            this.guildId = guildId;
            await this.client.login(token);
            console.log('✅ Bot do Discord conectado com sucesso');
            
            // Aguardar o bot estar pronto
            await new Promise((resolve) => {
                this.client.once('ready', () => {
                    console.log(`🤖 Bot do Discord conectado como ${this.client.user.tag}`);
                    console.log('🎭 Pronto para gerenciar cargos de live!');
                    console.log('🎫 Pronto para gerenciar códigos de WL!');
                    resolve();
                });
            });
            
        } catch (error) {
            console.error('❌ Erro ao conectar bot do Discord:', error);
            throw error;
        }
    }
    
      async addLiveRole(discordUserId) {
    try {
      // Verificar se o bot está conectado
      if (!this.client || !this.client.isReady()) {
        throw new Error('Bot do Discord não está conectado');
      }
      
      const guild = this.client.guilds.cache.get(this.guildId);
      if (!guild) {
        throw new Error('Servidor não encontrado');
      }
      
      const member = await guild.members.fetch(discordUserId);
      const role = guild.roles.cache.get(this.roleId);
      
      if (!role) {
        throw new Error('Cargo de live não encontrado');
      }
      
      // Verificar se o membro já tem o cargo
      if (member.roles.cache.has(this.roleId)) {
        console.log(`⚠️ Usuário ${discordUserId} já possui o cargo de live`);
        return { success: true, message: 'Usuário já possui o cargo' };
      }
      
      // Adicionar o cargo
      await member.roles.add(role, 'Live ativada pelo sistema');
      
      // Configurar timer para remover o cargo após 1 hora
      const timeoutId = setTimeout(() => {
        this.removeLiveRole(discordUserId);
      }, 60 * 60 * 1000); // 1 hora
      
      // Armazenar referência do timer
      this.activeLives.set(discordUserId, {
        timeoutId: timeoutId,
        startTime: Date.now(),
        endTime: Date.now() + (60 * 60 * 1000)
      });
      
      console.log(`✅ Cargo de live concedido para ${discordUserId}`);
      console.log(`⏰ Cargo será removido em 1 hora`);
      
      return {
        success: true,
        message: 'Cargo concedido com sucesso',
        endTime: Date.now() + (60 * 60 * 1000)
      };
      
    } catch (error) {
      console.error(`❌ Erro ao conceder cargo para ${discordUserId}:`, error);
      throw error;
    }
  }

  // Conceder cargo WL e atualizar nome
  async addWLRole(discordUserId, roleId, playerName, playerId) {
    try {
      // Verificar se o bot está conectado
      if (!this.client || !this.client.isReady()) {
        throw new Error('Bot do Discord não está conectado');
      }
      
      const guild = this.client.guilds.cache.get(this.guildId);
      if (!guild) {
        throw new Error('Servidor não encontrado');
      }
      
      const member = await guild.members.fetch(discordUserId);
      const role = guild.roles.cache.get(roleId);
      
      if (!role) {
        throw new Error('Cargo de WL não encontrado');
      }
      
      // Verificar se o membro já tem o cargo
      if (member.roles.cache.has(roleId)) {
        console.log(`⚠️ Usuário ${discordUserId} já possui o cargo de WL`);
        return { success: true, message: 'Usuário já possui o cargo' };
      }
      
      // Adicionar o cargo
      await member.roles.add(role, 'WL liberada pelo sistema');
      
      // Atualizar o nome do usuário para "NOME | ID"
      const newNickname = `${playerName} | ${playerId}`;
      try {
        await member.setNickname(newNickname, 'WL liberada - nome atualizado');
        console.log(`✅ Nome atualizado para: ${newNickname}`);
      } catch (nicknameError) {
        console.log(`⚠️ Não foi possível atualizar o nome: ${nicknameError.message}`);
      }
      
      console.log(`✅ Cargo de WL concedido para ${discordUserId}`);
      
      return {
        success: true,
        message: 'Cargo de WL concedido com sucesso',
        nickname: newNickname
      };
      
    } catch (error) {
      console.error(`❌ Erro ao conceder cargo de WL para ${discordUserId}:`, error);
      throw error;
    }
  }
    
    async removeLiveRole(discordUserId) {
        try {
            const guild = this.client.guilds.cache.get(this.guildId);
            if (!guild) {
                throw new Error('Servidor não encontrado');
            }
            
            const member = await guild.members.fetch(discordUserId);
            const role = guild.roles.cache.get(this.roleId);
            
            if (!role) {
                throw new Error('Cargo de live não encontrado');
            }
            
            // Verificar se o membro tem o cargo
            if (!member.roles.cache.has(this.roleId)) {
                console.log(`⚠️ Usuário ${discordUserId} não possui o cargo de live`);
                return { success: true, message: 'Usuário não possui o cargo' };
            }
            
            // Remover o cargo
            await member.roles.remove(role, 'Live expirada - remoção automática');
            
            // Limpar timer se existir
            const liveData = this.activeLives.get(discordUserId);
            if (liveData && liveData.timeoutId) {
                clearTimeout(liveData.timeoutId);
            }
            this.activeLives.delete(discordUserId);
            
            console.log(`✅ Cargo de live removido de ${discordUserId}`);
            
            return {
                success: true,
                message: 'Cargo removido com sucesso'
            };
            
        } catch (error) {
            console.error(`❌ Erro ao remover cargo de ${discordUserId}:`, error);
            throw error;
        }
    }
    
    async getLiveStatus(discordUserId) {
        try {
            const liveData = this.activeLives.get(discordUserId);
            if (!liveData) {
                return { active: false, timeRemaining: 0 };
            }
            
            const timeRemaining = Math.max(0, liveData.endTime - Date.now());
            return {
                active: timeRemaining > 0,
                timeRemaining: timeRemaining,
                endTime: liveData.endTime
            };
            
        } catch (error) {
            console.error(`❌ Erro ao verificar status da live para ${discordUserId}:`, error);
            return { active: false, timeRemaining: 0 };
        }
    }
    
    async forceRemoveAllLives() {
        try {
            console.log('🔄 Removendo todos os cargos de live ativos...');
            
            for (const [discordUserId, liveData] of this.activeLives) {
                try {
                    await this.removeLiveRole(discordUserId);
                } catch (error) {
                    console.error(`❌ Erro ao remover cargo de ${discordUserId}:`, error);
                }
            }
            
            console.log('✅ Todos os cargos de live foram removidos');
            
        } catch (error) {
            console.error('❌ Erro ao remover todos os cargos:', error);
        }
    }
    
    getActiveLivesCount() {
        return this.activeLives.size;
    }

    // Conceder cargos por categoria de criador
    async addCreatorRoles(discordUserId, areas) {
        try {
            // Verificar se o bot está conectado
            if (!this.client || !this.client.isReady()) {
                throw new Error('Bot do Discord não está conectado');
            }
            
            const guild = this.client.guilds.cache.get(this.guildId);
            if (!guild) {
                throw new Error('Servidor não encontrado');
            }
            
            const member = await guild.members.fetch(discordUserId);
            const rolesConcedidos = [];
            
            // Processar áreas (pode ser string ou array)
            let areasArray = areas;
            if (typeof areas === 'string') {
                try {
                    areasArray = JSON.parse(areas);
                } catch (e) {
                    areasArray = [areas];
                }
            }
            
            // Para cada área, conceder o cargo correspondente
            for (const area of areasArray) {
                // Normalizar: remover acentos e deixar maiúsculo
                const areaNormalizada = area.normalize('NFD').replace(/[^\w\s]/gi, '').toUpperCase();
                const roleId = this.categoriaRoles[areaNormalizada];
                if (roleId) {
                    const role = guild.roles.cache.get(roleId);
                    if (role) {
                        // Verificar se o membro já tem o cargo
                        if (!member.roles.cache.has(roleId)) {
                            await member.roles.add(role, 'Criador aprovado - categoria ' + area);
                            rolesConcedidos.push(area);
                            console.log(`✅ Cargo ${area} concedido para ${discordUserId}`);
                        } else {
                            console.log(`⚠️ Usuário ${discordUserId} já possui o cargo ${area}`);
                        }
                    } else {
                        console.error(`❌ Cargo ${area} não encontrado no servidor`);
                    }
                } else {
                    console.error(`❌ ID do cargo para categoria ${area} não configurado`);
                }
            }
            
            return {
                success: true,
                message: `Cargos concedidos: ${rolesConcedidos.join(', ')}`,
                rolesConcedidos
            };
            
        } catch (error) {
            console.error(`❌ Erro ao conceder cargos para ${discordUserId}:`, error);
            throw error;
        }
    }

    // Remover cargos de criador
    async removeCreatorRoles(discordUserId) {
        try {
            // Verificar se o bot está conectado
            if (!this.client || !this.client.isReady()) {
                throw new Error('Bot do Discord não está conectado');
            }
            
            const guild = this.client.guilds.cache.get(this.guildId);
            if (!guild) {
                throw new Error('Servidor não encontrado');
            }
            
            const member = await guild.members.fetch(discordUserId);
            const rolesRemovidos = [];
            
            // Remover todos os cargos de categoria
            for (const [roleId, roleName] of Object.entries(this.categoriaRoles)) {
                if (member.roles.cache.has(roleId)) {
                    const role = guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.remove(role, 'Criador suspenso - remoção de cargos');
                        rolesRemovidos.push(roleName);
                        console.log(`✅ Cargo ${roleName} removido de ${discordUserId}`);
                    }
                }
            }
            
            return {
                success: true,
                message: `Cargos removidos: ${rolesRemovidos.join(', ')}`,
                rolesRemovidos
            };
            
        } catch (error) {
            console.error(`❌ Erro ao remover cargos de ${discordUserId}:`, error);
            throw error;
        }
    }

    // Enviar mensagem privada para usuário
    async sendDirectMessage(discordUserId, message) {
        try {
            // Verificar se o bot está conectado
            if (!this.client || !this.client.isReady()) {
                throw new Error('Bot do Discord não está conectado');
            }
            
            // Buscar o usuário
            const user = await this.client.users.fetch(discordUserId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            
            // Enviar mensagem privada
            await user.send(message);
            console.log(`✅ Mensagem enviada para ${user.tag} (${discordUserId})`);
            
            return {
                success: true,
                message: 'Mensagem enviada com sucesso'
            };
            
        } catch (error) {
            console.error(`❌ Erro ao enviar mensagem para ${discordUserId}:`, error);
            throw error;
        }
    }

    // Enviar embed privado para usuário
    async sendDirectEmbed(discordUserId, embed, components = null) {
        try {
            // Verificar se o bot está conectado
            if (!this.client || !this.client.isReady()) {
                throw new Error('Bot do Discord não está conectado');
            }
            
            // Buscar o usuário
            const user = await this.client.users.fetch(discordUserId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            
            // Preparar mensagem
            const messageData = { embeds: [embed] };
            if (components) {
                messageData.components = components;
            }
            
            // Enviar embed privado
            await user.send(messageData);
            console.log(`✅ Embed enviado para ${user.tag} (${discordUserId})`);
            
            return {
                success: true,
                message: 'Embed enviado com sucesso'
            };
            
        } catch (error) {
            console.error(`❌ Erro ao enviar embed para ${discordUserId}:`, error);
            throw error;
        }
    }
    
    disconnect() {
        this.client.destroy();
        console.log('🔌 Bot do Discord desconectado');
    }
}

module.exports = DiscordBot; 