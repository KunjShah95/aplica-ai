# Contributing to Alpicia

Thank you for your interest in contributing to Alpicia! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Community](#community)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 20+
- Git
- npm or yarn
- Redis (for development)
- SQLite (for development)

### Setting Up Development Environment

1. **Fork the repository**

   ```bash
   # Click "Fork" on GitHub, then:
   git clone https://github.com/YOUR-USERNAME/alpicia.git
   cd alpicia
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

### Finding Issues to Work On

- **Good First Issues**: [GitHub Issues labeled `good first issue`](https://github.com/yourusername/alpicia/issues?q=label%3A%22good+first+issue%22)
- **Feature Requests**: [GitHub Issues labeled `enhancement`](https://github.com/yourusername/alpicia/issues?q=label%3A%22enhancement%22)
- **Bug Fixes**: [GitHub Issues labeled `bug`](https://github.com/yourusername/alpicia/issues?q=label%3A%22bug%22)

## Development Process

### 1. Create a Branch

```bash
# Create a new branch for your feature/fix
git checkout -b feature/amazing-new-feature
# or
git checkout -b fix/annoying-bug
```

### 2. Make Changes

Follow our [coding standards](#coding-standards) and implement your changes.

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/my-feature.test.ts

# Run with coverage
npm test -- --coverage
```

### 4. Update Documentation

- Update the README if adding new features
- Add JSDoc comments to new functions
- Update API documentation if needed
- Add code comments for complex logic

### 5. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add amazing new feature

- Description of what was added
- Why it was needed
- Any breaking changes"
```

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/amazing-new-feature

# Create a Pull Request on GitHub
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable `strict` mode in `tsconfig.json`
- Avoid `any` type - use specific types or `unknown`
- Use interfaces over types for object shapes

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

// Avoid
type User = {
  id: any;
  name: any;
};
```

### Naming Conventions

| Type       | Convention  | Example                         |
| ---------- | ----------- | ------------------------------- |
| Variables  | camelCase   | `userName`, `filePath`          |
| Constants  | UPPER_SNAKE | `MAX_RETRIES`, `API_KEY`        |
| Classes    | PascalCase  | `Agent`, `MemoryManager`        |
| Interfaces | PascalCase  | `AgentOptions`, `TaskResult`    |
| Functions  | camelCase   | `getUser()`, `processMessage()` |
| Files      | kebab-case  | `my-file.ts`, `agent-core.ts`   |

### Error Handling

```typescript
// Good - Use specific error types
try {
  await doSomething();
} catch (error) {
  if (error instanceof ValidationError) {
    return { error: error.message };
  }
  console.error('Unexpected error:', error);
  throw new AppError('Operation failed', { cause: error });
}

// Avoid - Silencing errors
try {
  await doSomething();
} catch {
  // Silent failure
}
```

### Async/Await

```typescript
// Good
async function getData(): Promise<Data> {
  const result = await fetchData();
  return result;
}

// Avoid - Unnecessary Promise wrapper
async function getData(): Promise<Data> {
  return new Promise((resolve) => {
    fetchData().then(resolve);
  });
}
```

### Comments

```typescript
// Good - Explain WHY, not WHAT
// Retrying is necessary because the external API
// may return rate limit errors during peak hours
const maxRetries = 3;

// Avoid - Redundant comments
// This function gets a user
function getUser(id: string) {
  // ...
}
```

## Testing

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── core/
│   ├── execution/
│   └── skills/
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

### Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MyClass } from './my-class';

describe('MyClass', () => {
  it('should do something correctly', () => {
    const instance = new MyClass();
    const result = instance.doSomething();
    expect(result).toBe('expected-value');
  });

  it('should handle errors gracefully', async () => {
    const instance = new MyClass();
    await expect(instance.doSomethingElse()).rejects.toThrow(Error);
  });
});
```

### Test Coverage Requirements

- New features must have >80% test coverage
- Critical paths must have 100% coverage
- No decreasing overall coverage

## Documentation

### Code Documentation

````typescript
/**
 * Processes a message and generates a response
 *
 * @param content - The message content to process
 * @param conversationId - The conversation context ID
 * @param userId - The user who sent the message
 * @returns Promise resolving to the generated response
 *
 * @example
 * ```typescript
 * const response = await agent.processMessage(
 *   'Hello, how are you?',
 *   'conv-123',
 *   'user-456'
 * );
 * ```
 */
async function processMessage(
  content: string,
  conversationId: string,
  userId: string
): Promise<Response> {
  // Implementation
}
````

### Updating Documentation

1. Update README.md for new features
2. Add examples for new APIs
3. Update architecture diagrams if needed
4. Add migration guide for breaking changes

## Submitting Changes

### Pull Request Template

```markdown
## Description

Brief description of what was changed

## Type of Change

- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (requires major version update)
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed self-review
- [ ] I have commented complex code
- [ ] I have updated documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix works
```

### Review Process

1. **Automated Checks**: CI must pass
2. **Code Review**: At least 1 approval required
3. **Documentation**: Must be updated
4. **Testing**: All tests must pass

## Community

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/yourusername/alpicia/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/alpicia/discussions)
- **Discord**: [Join our Discord](https://discord.gg/alpicia)

### Recognition

Contributors are recognized in:

- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Release notes
- Project documentation

---

**Thank you for contributing to Alpicia!**
