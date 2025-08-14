// index.js
require('dotenv').config();
const {
  Client,
  IntentsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const cron = require('node-cron');
const products = require('./products.js');

if (!Array.isArray(products) || products.length === 0) {
  console.error('🚨 ERRO: products.js está vazio ou não foi encontrado.');
  process.exit(1);
}

const DISCORD_TOKEN    = process.env.DISCORD_TOKEN;
const CLIENT_ID        = process.env.CLIENT_ID;
const GUILD_ID         = process.env.GUILD_ID;
const HYDRUS_TOKEN     = process.env.HYDRUS_TOKEN;
const STORE_ID         = process.env.STORE_ID;
const PROMO_CHANNEL_ID = '1394860032415371445';
const ALLOWED_ROLE_ID  = '1177804766831726604';

// 1) Define os comandos slash
const commands = [
  new SlashCommandBuilder()
    .setName('createcoupon')
    .setDescription('Cria um cupom de desconto de até 50%')
    .addStringOption(opt =>
      opt.setName('name')
         .setDescription('Código do cupom')
         .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('value')
         .setDescription('Percentual de 1 a 50')
         .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('randomcoupon')
    .setDescription('Gera um cupom aleatório (10–50%) para um produto por 24h'),

  new SlashCommandBuilder()
    .setName('deletecoupon')
    .setDescription('Deleta um cupom pelo ID')
    .addIntegerOption(opt =>
      opt.setName('id')
         .setDescription('ID do cupom')
         .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('listcoupons')
    .setDescription('Lista todos os cupons disponíveis'),

  new SlashCommandBuilder()
    .setName('forcepromotions')
    .setDescription('Força o envio das 10 promoções diárias agora'),

  new SlashCommandBuilder()
    .setName('couponstats')
    .setDescription('Mostra estatísticas de vendas de um cupom')
    .addIntegerOption(opt =>
      opt.setName('id')
         .setDescription('ID do cupom')
         .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('deletecoupons')
    .setDescription('Deleta múltiplos cupons por IDs')
    .addStringOption(opt =>
      opt.setName('ids')
         .setDescription('IDs dos cupons separados por vírgula (ex: 123,456,789)')
         .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('Mostra análises e estatísticas da loja')
    .addStringOption(opt =>
      opt.setName('periodo')
         .setDescription('Período das análises')
         .addChoices(
           { name: 'Hoje', value: 'today' },
           { name: 'Últimos 7 dias', value: '7d' },
           { name: 'Últimos 30 dias', value: '30d' },
           { name: 'Este mês', value: 'month' },
           { name: 'Este ano', value: 'year' }
         )
         .setRequired(false)
    )
].map(cmd => cmd.toJSON());

// 2) Registrar comandos
;(async () => {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
    } else {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
    }
    console.log('Comandos registrados.');
  } catch (err) {
    console.error('Erro ao registrar comandos:', err);
  }
})();

// 3) Função utilitária para enviar as 10 promoções diárias
async function sendPromotions(channel) {
  // Limpa o canal
  let fetched;
  do {
    fetched = await channel.messages.fetch({ limit: 100 });
    if (fetched.size) {
      await channel.bulkDelete(fetched, true).catch(() => null);
    }
  } while (fetched.size === 100);

  // Gera 10 promoções
  for (let i = 0; i < 10; i++) {
    const value   = Math.floor(Math.random() * 41) + 10; // 10–50%
    const prod    = products[Math.floor(Math.random() * products.length)];
    if (!prod) continue; // **proteção**: só continua se houver produto

    const code    = `RC${Date.now().toString().slice(-6)}${i}`;
    const now     = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Monta payload base
    const payload = {
      name: code,
      value,
      is_flat: false,
      minimum: 0,
      remaining: 1,
      is_ephemeral: false,
      partner_commission: 0,
      starts_at: now.toISOString(),
      ends_at: expires.toISOString(),
      unique_criteria: 'variables.user_id'
    };

    // Só inclui packages_only se tiver um ID válido
    if (typeof prod.id === 'number') {
      payload.packages_only = [prod.id];
    }

    // Chama API para criar cupom
    await fetch(
      `https://api.hydrus.gg/stores/${STORE_ID}/coupons`,
      {
        method: 'POST',
        headers: {
          'Authorization': HYDRUS_TOKEN,
          'Accept':        'application/json',
          'Content-Type':  'application/json'
        },
        body: JSON.stringify(payload)
      }
    ).catch(() => {});

    // Monta e envia o embed
    const originalPrice    = `R$ ${prod.value.toFixed(2)}`;
    const discountedPrice  = `R$ ${(prod.value * (1 - value / 100)).toFixed(2)}`;
    const expiresTs        = Math.floor(expires.getTime() / 1000);
    const purchaseLink     = `https://vip.altoastralrp.com/search?q=${encodeURIComponent(prod.name)}`;

    const promoEmbed = new EmbedBuilder()
      .setTitle(`🔥 ${prod.name} em Promoção Relâmpago!`)
      .setDescription(`⏰ Expira em: <t:${expiresTs}:R>`)
      .addFields(
        { name: '💸 Preço Original',      value: originalPrice,     inline: true },
        { name: '💰 Desconto',            value: `${value}%`,        inline: true },
        { name: '🏷️ Preço com Desconto', value: discountedPrice,   inline: true },
        { name: '🎟️ Cupom',              value: `\`${code}\``,         inline: true },
        { name: '🔄 Usos Restantes',     value: '1',                inline: true }
      )
      .setImage(prod.image)
      .setColor(0x00AE86)
      .setTimestamp();

    const buyButton = new ButtonBuilder()
      .setLabel('Comprar Agora')
      .setStyle(ButtonStyle.Link)
      .setURL(purchaseLink);

    const row = new ActionRowBuilder().addComponents(buyButton);
    await channel.send({ embeds: [promoEmbed], components: [row] });
  }

  // Mensagem final marcando everyone
  await channel.send({
    content: `@everyone Os descontos da loja foram atualizados! Amanhã às 19h teremos novos descontos de outros produtos.`,
    allowedMentions: { parse: ['everyone'] }
  });
}

// 4) Inicializa o bot
const client = new Client({ intents: [IntentsBitField.Flags.Guilds] });
client.once('ready', () => {
  console.log(`Logado como ${client.user.tag}`);
  // Agenda para todo dia às 19:00 (horário de Brasília)
  cron.schedule(
    '0 19 * * *',
    async () => {
      const ch = await client.channels.fetch(PROMO_CHANNEL_ID);
      if (ch?.isTextBased()) {
        await sendPromotions(ch);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
});

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, member } = interaction;

    // Apenas quem tem o cargo específico pode usar tudo, exceto /createcoupon
    if (
      commandName !== 'createcoupon' &&
      !member.roles.cache.has(ALLOWED_ROLE_ID)
    ) {
      return interaction.reply({
        content: `Você precisa do cargo <@&${ALLOWED_ROLE_ID}> para usar este comando.`,
        flags: 1 << 6
      });
    }

    const headers = {
      'Authorization': HYDRUS_TOKEN,
      'Accept':        'application/json'
    };

    if (commandName === 'listcoupons') {
      // Primeiro, vamos ver a resposta completa da API para entender a estrutura
      const res = await fetch(`https://api.hydrus.gg/stores/${STORE_ID}/coupons`, { headers });
      if (!res.ok) return interaction.reply({ content: `Erro ao listar: ${res.status}`, flags: 1 << 6 });
      
      const json = await res.json();
      const data = json.data || [];
      
      if (!data.length) {
        return interaction.reply('Nenhum cupom encontrado.');
      }
      
      let response = `📋 **Lista de Cupons (${data.length} encontrados)**\n\n`;
      
      // Lista simples dos cupons
      data.forEach((cupom, index) => {
        response += `${index + 1}. **${cupom.name}** = ${cupom.value}% (ID: ${cupom.id})\n`;
      });
      
      // Adiciona informações sobre paginação para debug
      response += `\n**🔍 Informações da API:**\n`;
      response += `• Total de cupons retornados: ${data.length}\n`;
      response += `• Resposta completa: \`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``;
      
      return interaction.reply(response);
    }

    if (commandName === 'createcoupon') {
      const name  = interaction.options.getString('name');
      const value = interaction.options.getInteger('value');
      if (value < 1 || value > 50) {
        return interaction.reply({ content: 'Desconto deve ser 1–50%.', flags: 1 << 6 });
      }
      const now = new Date();
      const payload = {
        name, value,
        is_flat: false, minimum: 0,
        remaining: 1, is_ephemeral: false,
        partner_commission: 0,
        starts_at: now.toISOString(),
        ends_at: new Date(now.getTime() + 7*24*60*60*1000).toISOString(),
        unique_criteria: 'variables.user_id'
      };

      const res = await fetch(
        `https://api.hydrus.gg/stores/${STORE_ID}/coupons`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) {
        return interaction.reply({ content: `Falha ao criar: ${res.status}`, flags: 1 << 6 });
      }
      const jsonRes = await res.json();
      const cp = jsonRes.data ?? jsonRes;
      return interaction.reply(`✅ Cupom criado! ${cp.name} = ${cp.value}%`);
    }

    if (commandName === 'forcepromotions') {
      const ch = await client.channels.fetch(PROMO_CHANNEL_ID);
      if (!ch?.isTextBased()) {
        return interaction.reply({ content: 'Canal inválido.', flags: 1 << 6 });
      }
      await interaction.reply({ content: 'Gerando promoções...', flags: 1 << 6 });
      await sendPromotions(ch);
      return interaction.followUp('✅ Promoções enviadas!');
    }

    if (commandName === 'deletecoupon') {
      const id = interaction.options.getInteger('id');
      const res = await fetch(
        `https://api.hydrus.gg/stores/${STORE_ID}/coupons/${id}`,
        { method: 'DELETE', headers }
      );
      if (!res.ok) {
        return interaction.reply({ content: `Erro ao deletar: ${res.status}`, flags: 1 << 6 });
      }
      return interaction.reply(`✅ Cupom deletado.`);
    }

    if (commandName === 'couponstats') {
      const id = interaction.options.getInteger('id');
      const res = await fetch(
        `https://api.hydrus.gg/stores/${STORE_ID}/coupons/${id}`,
        { headers }
      );
      if (!res.ok) {
        return interaction.reply({ content: `Erro: ${res.status}`, flags: 1 << 6 });
      }
      const json = await res.json();
      const data = json.data ?? json;
      
      // Mostra todas as informações do cupom
      let response = `📊 **Informações do Cupom ${id}**\n\n`;
      
      // Informações básicas do cupom
      response += `**Nome:** ${data.name || 'N/A'}\n`;
      response += `**Valor:** ${data.value || 'N/A'}%\n`;
      response += `**Restante:** ${data.remaining || 'N/A'}\n`;
      response += `**Início:** ${data.starts_at || 'N/A'}\n`;
      response += `**Fim:** ${data.ends_at || 'N/A'}\n`;
      response += `**Criado em:** ${data.created_at || 'N/A'}\n`;
      response += `**Atualizado em:** ${data.updated_at || 'N/A'}\n\n`;
      
      // Dados de vendas
      const report = data.sales_report || data.report || {};
      const lines = [];
      let total = 0;
      
      if (Object.keys(report).length > 0) {
        response += `**📈 Relatório de Vendas:**\n`;
        for (const [day, count] of Object.entries(report)) {
          lines.push(`• ${day}: ${count}`);
          total += Number(count) || 0;
        }
        response += `${lines.join('\n')}\n\n**Total de vendas: ${total}**\n`;
      } else {
        response += `**📈 Relatório de Vendas:** Nenhuma venda registrada\n`;
      }
      
      // Valor total das vendas
      if (data.orders_sum_total) {
        response += `**💰 Valor Total das Vendas: R$ ${data.orders_sum_total}**\n\n`;
      } else {
        response += `**💰 Valor Total das Vendas: R$ 0,00**\n\n`;
      }
      
      // Mostra todos os dados brutos para debug
      response += `**🔍 Dados Completos da API:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      
      return interaction.reply(response);
    }

    if (commandName === 'deletecoupons') {
      const idsString = interaction.options.getString('ids');
      const ids = idsString.split(',').map(id => id.trim()).filter(id => id && !isNaN(id));
      
      if (ids.length === 0) {
        return interaction.reply({ content: 'Nenhum ID válido fornecido. Use formato: 123,456,789', flags: 1 << 6 });
      }
      
      if (ids.length > 20) {
        return interaction.reply({ content: 'Máximo de 20 cupons por vez.', flags: 1 << 6 });
      }
      
      await interaction.reply({ content: `Deletando ${ids.length} cupons...`, flags: 1 << 6 });
      
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const id of ids) {
        try {
          const res = await fetch(
            `https://api.hydrus.gg/stores/${STORE_ID}/coupons/${id}`,
            { method: 'DELETE', headers }
          );
          
          if (res.ok) {
            results.push(`✅ ID ${id}: Deletado com sucesso`);
            successCount++;
          } else {
            results.push(`❌ ID ${id}: Erro ${res.status}`);
            errorCount++;
          }
        } catch (error) {
          results.push(`❌ ID ${id}: Erro de conexão`);
          errorCount++;
        }
      }
      
      const summary = `**📋 Resumo da Operação:**\n• ✅ Sucessos: ${successCount}\n• ❌ Erros: ${errorCount}\n\n**📝 Detalhes:**\n${results.join('\n')}`;
      
      return interaction.followUp(summary);
    }

    if (commandName === 'analytics') {
      const periodo = interaction.options.getString('periodo');
      
      try {
        // Endpoint específico de analytics
        const endpoint = periodo 
          ? `https://api.hydrus.gg/stores/${STORE_ID}/analytics?period=${periodo}`
          : `https://api.hydrus.gg/stores/${STORE_ID}/analytics`;
        
        const res = await fetch(endpoint, { headers });
        
        if (!res.ok) {
          return interaction.reply({ 
            content: `❌ Erro na API: ${res.status} - ${res.statusText}`, 
            flags: 1 << 6 
          });
        }
        
        const json = await res.json();
        const data = json.data || json;
        
        let response = `📊 **Analytics da Loja**\n\n`;
        response += `**🔗 Endpoint:** ${endpoint}\n`;
        response += `**📅 Período:** ${periodo || 'Padrão'}\n`;
        response += `**📡 Status:** ${res.status} OK\n\n`;
        
        // Mostra todos os dados que a API retorna
        response += `**🔍 Dados Completos da API:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
        
        return interaction.reply(response);
        
      } catch (error) {
        return interaction.reply({ 
          content: `❌ Erro ao buscar analytics: ${error.message}`, 
          flags: 1 << 6 
        });
      }
    }

  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      interaction.reply({ content: 'Erro interno.', flags: 1 << 6 });
    }
  }
});

client.login(DISCORD_TOKEN);
