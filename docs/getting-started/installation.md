# Getting Started with Alpicia

Alpicia is your open-source AI personal assistant. This guide will have you up and running in minutes.

## Prerequisites

- Node.js 20+
- npm or yarn
- An API key from Anthropic, OpenAI, or a local Ollama instance

## Installation

### Quick Install (Recommended)

```bash
npx alpicia@latest
```

This command will:

1. Download and install Alpicia
2. Create a configuration file
3. Set up your preferences
4. Launch the interactive setup

### Global Installation

```bash
npm install -g alpicia
alpicia init
```

## Your First Conversation

After installation, start Alpicia:

```bash
alpicia
```

Or start in CLI mode:

```bash
alpicia cli
```

Try these commands:

```
alpicia> help
alpicia> What can you do?
alpicia> Set up Telegram integration
```

## Configuration

Alpicia uses a `.env` file for configuration. Create one from the example:

```bash
cp .env.example .env
```

### Essential Settings

```env
# LLM Provider
LLM_PROVIDER=claude
LLM_API_KEY=your-anthropic-api-key

# Platforms
TELEGRAM_ENABLED=true
TELEGRAM_TOKEN=your-bot-token
DISCORD_ENABLED=true
DISCORD_TOKEN=your-discord-token
```

## Modes of Operation

### CLI Mode

Interactive terminal interface:

```bash
alpicia cli
```

### API Mode

REST API server:

```bash
alpicia api
```

### Full Mode

All services including WebSocket gateway:

```bash
alpicia
```

## Next Steps

- [Explore Features](/docs/features) - Learn what Alpicia can do
- [Set Up Integrations](/docs/features#integrations) - Connect your platforms
- [Build Skills](/docs/features#skills) - Create custom capabilities
- [Join the Community](/docs/community) - Share and grow!
