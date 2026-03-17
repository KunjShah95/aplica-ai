import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safeTerminalWidth, renderMarkdown } from '../src/tui/markdown.js';

describe('TUI helpers', () => {
  describe('safeTerminalWidth', () => {
    let originalDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
      originalDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
    });

    afterEach(() => {
      // Restore the original property descriptor to prevent leaking between tests.
      if (originalDescriptor !== undefined) {
        Object.defineProperty(process.stdout, 'columns', originalDescriptor);
      } else {
        // Property didn't exist originally – delete any value we set.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (process.stdout as any).columns;
      }
    });

    it('returns columns when process.stdout.columns is defined', () => {
      Object.defineProperty(process.stdout, 'columns', {
        value: 100,
        configurable: true,
        writable: true,
      });
      const width = safeTerminalWidth();
      expect(width).toBe(100);
    });

    it('returns 80 when process.stdout.columns is undefined (non-TTY / Bug #3)', () => {
      Object.defineProperty(process.stdout, 'columns', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      const width = safeTerminalWidth();
      expect(width).toBe(80);
    });

    it('caps the width at 120', () => {
      Object.defineProperty(process.stdout, 'columns', {
        value: 200,
        configurable: true,
        writable: true,
      });
      const width = safeTerminalWidth();
      expect(width).toBe(120);
    });

    it('never returns NaN', () => {
      Object.defineProperty(process.stdout, 'columns', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      const width = safeTerminalWidth();
      expect(Number.isNaN(width)).toBe(false);
    });
  });

  describe('renderMarkdown', () => {
    it('renders plain text unchanged (no markup tags in output)', () => {
      const result = renderMarkdown('Hello world');
      expect(result).toContain('Hello world');
    });

    it('applies bold ANSI codes for **text**', () => {
      const result = renderMarkdown('**bold**');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold');
      expect(result).toContain('\x1b[0m');
    });

    it('renders h1 heading with bold+underline codes', () => {
      const result = renderMarkdown('# Heading');
      expect(result).toContain('\x1b[1m\x1b[4m');
      expect(result).toContain('Heading');
    });

    it('renders h2 heading', () => {
      const result = renderMarkdown('## Section');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('Section');
    });

    it('renders bullet list with bullet character', () => {
      const result = renderMarkdown('- item one\n- item two');
      expect(result).toContain('• item one');
      expect(result).toContain('• item two');
    });

    it('renders numbered list without double indentation', () => {
      const result = renderMarkdown('1. first\n2. second');
      // Should not have double spaces before the number
      expect(result).toContain('1. ');
      expect(result).not.toMatch(/^\s{2,}1\./m);
    });

    it('renders inline code with reverse-video ANSI', () => {
      const result = renderMarkdown('Use `npm install` to install');
      expect(result).toContain('\x1b[7m');
      expect(result).toContain('npm install');
    });

    it('renders blockquote with grey bar', () => {
      const result = renderMarkdown('> some quote');
      expect(result).toContain('│ some quote');
    });

    it('renders horizontal rule without crashing when columns is undefined (Bug #3)', () => {
      Object.defineProperty(process.stdout, 'columns', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      expect(() => renderMarkdown('---')).not.toThrow();
      // Restore immediately so this test doesn't affect others
      Object.defineProperty(process.stdout, 'columns', {
        value: originalColumns,
        configurable: true,
        writable: true,
      });
    });

    it('renders empty string without throwing', () => {
      expect(() => renderMarkdown('')).not.toThrow();
    });
  });
});

// Capture the original columns value at module level for the inline restore above.
const originalColumns = process.stdout.columns;
