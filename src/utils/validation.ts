export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function isValidApiKey(key: string): boolean {
  return key.startsWith('sk_') && key.length >= 32;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRegistration(data: {
  email?: unknown;
  username?: unknown;
  password?: unknown;
  displayName?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.username || typeof data.username !== 'string') {
    errors.push('Username is required');
  } else if (!isValidUsername(data.username)) {
    errors.push('Username must be 3-30 characters, alphanumeric with underscores/hyphens');
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  } else if (!isValidPassword(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  if (data.displayName && typeof data.displayName === 'string' && data.displayName.length > 100) {
    errors.push('Display name too long (max 100 characters)');
  }

  return { valid: errors.length === 0, errors };
}

export function validateLogin(data: { email?: unknown; password?: unknown }): ValidationResult {
  const errors: string[] = [];

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  }

  return { valid: errors.length === 0, errors };
}

export function validateMessage(data: { role?: unknown; content?: unknown }): ValidationResult {
  const errors: string[] = [];

  if (!data.role || !['user', 'assistant', 'system'].includes(String(data.role))) {
    errors.push('Invalid role');
  }

  if (!data.content || typeof data.content !== 'string') {
    errors.push('Content is required');
  } else if (data.content.length > 100000) {
    errors.push('Content too long (max 100000 characters)');
  }

  return { valid: errors.length === 0, errors };
}

export function validateSearchQuery(data: { q?: unknown; limit?: unknown }): ValidationResult {
  const errors: string[] = [];

  if (!data.q || typeof data.q !== 'string' || data.q.length < 1) {
    errors.push('Search query is required');
  } else if (data.q.length > 500) {
    errors.push('Search query too long (max 500 characters)');
  }

  if (data.limit !== undefined) {
    const limit = Number(data.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateApiKeyInput(data: { name?: unknown; scopes?: unknown }): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.length < 1) {
    errors.push('API key name is required');
  } else if (data.name.length > 100) {
    errors.push('API key name too long (max 100 characters)');
  }

  return { valid: errors.length === 0, errors };
}

export function validateTeamInput(data: {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.length < 1) {
    errors.push('Team name is required');
  } else if (data.name.length > 100) {
    errors.push('Team name too long (max 100 characters)');
  }

  if (!data.slug || typeof data.slug !== 'string') {
    errors.push('Team slug is required');
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push('Slug must be lowercase alphanumeric with dashes');
  }

  return { valid: errors.length === 0, errors };
}
