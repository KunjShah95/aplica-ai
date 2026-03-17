// ─── Terminal width helper (Bug #3: Markdown width crash) ────────────────────
// process.stdout.columns is undefined in non-TTY environments (pipes, CI, etc.)
// We always fall back to 80 to avoid NaN / TypeError in downstream arithmetic.
export function safeTerminalWidth(): number {
  return Math.min(process.stdout.columns ?? 80, 120);
}

// ─── Markdown renderer (Bug #3) ───────────────────────────────────────────────
// A lightweight, crash-safe markdown renderer for the terminal.
// It does NOT call any external library that might rely on terminal columns.
export function renderMarkdown(text: string): string {
  const width = safeTerminalWidth();
  const lines = text.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    // Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);

    if (h1) {
      const content = h1[1];
      out.push('\x1b[1m\x1b[4m' + content + '\x1b[0m');
      continue;
    }
    if (h2) {
      out.push('\x1b[1m' + h2[1] + '\x1b[0m');
      continue;
    }
    if (h3) {
      out.push('\x1b[4m' + h3[1] + '\x1b[0m');
      continue;
    }

    // Code blocks (pass through verbatim with indent)
    if (line.startsWith('    ') || line.startsWith('\t')) {
      out.push('\x1b[2m' + line + '\x1b[0m');
      continue;
    }

    // Bullet lists
    const bullet = line.match(/^(\s*)[*\-+]\s+(.*)/);
    if (bullet) {
      out.push(bullet[1] + '• ' + applyInline(bullet[2]));
      continue;
    }

    // Numbered lists
    const numbered = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (numbered) {
      out.push(numbered[1] + line.replace(/^(\s*\d+\.\s+)(.*)/, '$1') + applyInline(numbered[2]));
      continue;
    }

    // Horizontal rules
    if (/^[-*_]{3,}$/.test(line.trim())) {
      out.push('─'.repeat(Math.min(width, 60)));
      continue;
    }

    // Blockquotes
    const quote = line.match(/^>\s*(.*)/);
    if (quote) {
      out.push('\x1b[2m│ ' + applyInline(quote[1]) + '\x1b[0m');
      continue;
    }

    // Regular paragraph line
    out.push(applyInline(line));
  }

  return out.join('\n');
}

function applyInline(text: string): string {
  return (
    text
      // Bold **text** or __text__ (must come before italic to avoid partial matching)
      .replace(/\*\*(.*?)\*\*/g, '\x1b[1m$1\x1b[0m')
      .replace(/__(.*?)__/g, '\x1b[1m$1\x1b[0m')
      // Italic *text* or _text_ (single markers only)
      .replace(/(?<![*_])\*(?![*])(.*?)(?<![*])\*(?![*_])/g, '\x1b[3m$1\x1b[0m')
      .replace(/(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g, '\x1b[3m$1\x1b[0m')
      // Inline code `code`
      .replace(/`([^`]+)`/g, '\x1b[7m$1\x1b[0m')
      // Strikethrough ~~text~~
      .replace(/~~(.*?)~~/g, '\x1b[9m$1\x1b[0m')
  );
}
