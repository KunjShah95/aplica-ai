import { Client, GatewayIntentBits, ChannelType, SlashCommandBuilder, REST, Routes, } from 'discord.js';
export class DiscordAdapter {
    client;
    router;
    guildId;
    isRunning = false;
    constructor(options) {
        this.router = options.router;
        this.guildId = options.guildId;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot || message.system)
                return;
            if (message.channel.type !== ChannelType.GuildText)
                return;
            const userId = message.author.id;
            const messageText = message.content;
            try {
                const response = await this.router.handleFromDiscord(userId, messageText);
                if (response.content.length > 2000) {
                    const chunks = this.chunkMessage(response.content, 2000);
                    for (const chunk of chunks) {
                        await message.reply(chunk);
                    }
                }
                else {
                    await message.reply(response.content);
                }
            }
            catch (error) {
                console.error('Discord message handling failed:', error);
                await message.reply('Sorry, I encountered an error processing your message.');
            }
        });
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            const userId = interaction.user.id;
            const commandName = interaction.commandName;
            const commandText = `/${commandName} ${interaction.options.data.map((opt) => opt.value).join(' ')}`;
            try {
                const response = await this.router.handleFromDiscord(userId, commandText);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(response.content);
                }
                else {
                    await interaction.reply(response.content);
                }
            }
            catch (error) {
                console.error('Discord slash command handling failed:', error);
                await interaction.reply('Sorry, I encountered an error processing your command.');
            }
        });
        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
        });
        this.client.on('ready', () => {
            console.log(`Discord bot logged in as ${this.client.user?.tag}`);
        });
    }
    chunkMessage(text, maxLength) {
        const chunks = [];
        let remaining = text;
        while (remaining.length > 0) {
            let chunk = remaining.slice(0, maxLength);
            const newlineIndex = chunk.lastIndexOf('\n');
            if (newlineIndex > maxLength * 0.5) {
                chunk = chunk.slice(0, newlineIndex);
            }
            chunks.push(chunk);
            remaining = remaining.slice(chunk.length).trim();
        }
        return chunks;
    }
    async start() {
        if (this.isRunning) {
            console.log('Discord adapter is already running');
            return;
        }
        await this.client.login(this.token);
        this.isRunning = true;
        console.log('Discord bot started');
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        await this.client.destroy();
        this.isRunning = false;
        console.log('Discord bot stopped');
    }
    isActive() {
        return this.isRunning;
    }
    get token() {
        return this.client.token || '';
    }
    async sendMessage(channelId, content) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                return null;
            }
            const message = await channel.send(content);
            return message.id;
        }
        catch (error) {
            console.error('Failed to send Discord message:', error);
            return null;
        }
    }
    async registerCommands() {
        if (!this.client.user) {
            console.warn('Discord bot not logged in, cannot register commands');
            return;
        }
        const commands = [
            new SlashCommandBuilder().setName('ping').setDescription('Check if the bot is responsive'),
            new SlashCommandBuilder().setName('help').setDescription('Get help with available commands'),
        ].map((command) => command.toJSON());
        const rest = new REST({ version: '10' }).setToken(this.client.token);
        try {
            await rest.put(Routes.applicationGuildCommands(this.client.user.id, this.guildId), {
                body: commands,
            });
            console.log('Discord slash commands registered');
        }
        catch (error) {
            console.error('Failed to register Discord commands:', error);
        }
    }
}
//# sourceMappingURL=discord.js.map