import * as readline from 'readline';
import { createProvider } from '../core/llm/index.js';
import { Agent } from '../core/agent.js';
import { AppConfig } from '../config/types.js';
import { renderMarkdown } from './markdown.js';

export { safeTerminalWidth, renderMarkdown } from './markdown.js';

// ─── Terminal state management (Bug #4: Terminal not restored) ────────────────
let terminalDirty = false;

function markTerminalDirty(): void {
  terminalDirty = true;
}

function restoreTerminal(): void {
  if (!terminalDirty) return;
  // Ensure the cursor is visible, echo is on, and the line is properly ended.
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?25h'); // show cursor
  }
  if (process.stdin.isTTY && typeof (process.stdin as { setRawMode?: unknown }).setRawMode === 'function') {
    try {
      (process.stdin as { setRawMode: (mode: boolean) => void }).setRawMode(false);
    } catch {
      // ignore – stream may already be closed
    }
  }
  terminalDirty = false;
}

// ─── Main TUI entry point ─────────────────────────────────────────────────────
export async function runCLI(config: AppConfig): Promise<void> {
  // Bug #2: Non-TTY TUI hangs
  // When stdin is not a TTY (e.g. piped, CI environment), readline would
  // immediately receive EOF for interactive prompts and hang on the prompt.
  // We detect this early and either process piped input line-by-line or exit.
  const isInteractive = process.stdin.isTTY === true;

  const llm = createProvider(config.llm);
  const agent = new Agent({ config, llm });

  const { conversationId } = await agent.startConversation('cli-user', 'cli');

  if (isInteractive) {
    await runInteractive(agent, conversationId);
  } else {
    await runPiped(agent, conversationId);
  }
}

// ─── Interactive (TTY) mode ───────────────────────────────────────────────────
async function runInteractive(agent: Agent, conversationId: string): Promise<void> {
  markTerminalDirty();

  // Register terminal restore on all exit paths (Bug #4)
  const onExit = (): void => {
    restoreTerminal();
  };
  process.on('exit', onExit);
  process.on('SIGINT', () => {
    restoreTerminal();
    console.log('\nBye!');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    restoreTerminal();
    process.exit(0);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  console.log('\n\x1b[1mAlpicia CLI\x1b[0m — type \x1b[2m/exit\x1b[0m or \x1b[2mCtrl-C\x1b[0m to quit\n');

  const ask = (): void => {
    rl.question('\x1b[32m>\x1b[0m ', async (input: string) => {
      const trimmed = input.trim();

      if (!trimmed) {
        ask();
        return;
      }

      if (trimmed === '/exit' || trimmed === '/quit' || trimmed === 'exit' || trimmed === 'quit') {
        rl.close();
        restoreTerminal();
        console.log('\nBye!');
        process.exit(0);
      }

      if (trimmed === '/help' || trimmed === 'help') {
        console.log('\nCommands: /exit /quit /help\n');
        ask();
        return;
      }

      try {
        process.stdout.write('\x1b[2m…thinking\x1b[0m\r');
        const response = await agent.processMessage(trimmed, conversationId, 'cli-user', 'cli');
        // Clear the "thinking" indicator
        process.stdout.write('\x1b[2K\r');
        console.log('\n\x1b[36mAssistant:\x1b[0m');
        console.log(renderMarkdown(response.message));
        console.log();
      } catch (err) {
        process.stdout.write('\x1b[2K\r');
        console.error('\x1b[31mError:\x1b[0m', err instanceof Error ? err.message : String(err));
      }

      ask();
    });
  };

  rl.on('close', () => {
    restoreTerminal();
  });

  ask();

  // Keep the process alive until the readline interface is closed.
  // We use a separate one-time listener so restoreTerminal isn't called twice.
  await new Promise<void>((resolve) => {
    rl.once('close', resolve);
  });
}

// ─── Piped (non-TTY) mode ─────────────────────────────────────────────────────
// Bug #2: when stdin is not a TTY, process each line as a separate query and
// print the response, then exit.  This prevents the process from hanging.
async function runPiped(agent: Agent, conversationId: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: undefined,   // no output – we write directly to stdout
    terminal: false,     // crucial: prevents readline from treating stdin as a TTY
  });

  const lines: string[] = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  }

  for (const query of lines) {
    try {
      const response = await agent.processMessage(query, conversationId, 'cli-user', 'cli');
      process.stdout.write(response.message + '\n');
    } catch (err) {
      process.stderr.write('Error: ' + (err instanceof Error ? err.message : String(err)) + '\n');
    }
  }
}
