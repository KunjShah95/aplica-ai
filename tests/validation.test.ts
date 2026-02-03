import { describe, it, expect } from 'vitest';
import { validate, schemas, sanitizeInput, sanitizeHTML } from '../src/security/validation.js';

describe('Validation', () => {
    describe('validate', () => {
        it('should validate required fields', () => {
            const result = validate({ name: '' }, {
                name: { required: true, type: 'string' },
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'name' })
            );
        });

        it('should validate string types', () => {
            const result = validate({ name: 123 }, {
                name: { type: 'string' },
            });

            expect(result.valid).toBe(false);
        });

        it('should validate number types', () => {
            const result = validate({ age: 'not a number' }, {
                age: { type: 'number' },
            });

            expect(result.valid).toBe(false);
        });

        it('should validate email format', () => {
            const validResult = validate({ email: 'test@example.com' }, {
                email: { type: 'email' },
            });
            expect(validResult.valid).toBe(true);

            const invalidResult = validate({ email: 'not-an-email' }, {
                email: { type: 'email' },
            });
            expect(invalidResult.valid).toBe(false);
        });

        it('should validate URL format', () => {
            const validResult = validate({ url: 'https://example.com' }, {
                url: { type: 'url' },
            });
            expect(validResult.valid).toBe(true);

            const invalidResult = validate({ url: 'not-a-url' }, {
                url: { type: 'url' },
            });
            expect(invalidResult.valid).toBe(false);
        });

        it('should validate min/max length', () => {
            const tooShort = validate({ password: 'abc' }, {
                password: { minLength: 8 },
            });
            expect(tooShort.valid).toBe(false);

            const tooLong = validate({ name: 'a'.repeat(101) }, {
                name: { maxLength: 100 },
            });
            expect(tooLong.valid).toBe(false);

            const valid = validate({ password: 'validpassword123' }, {
                password: { minLength: 8, maxLength: 100 },
            });
            expect(valid.valid).toBe(true);
        });

        it('should validate numeric range', () => {
            const tooLow = validate({ age: 5 }, {
                age: { type: 'number', min: 18 },
            });
            expect(tooLow.valid).toBe(false);

            const tooHigh = validate({ age: 150 }, {
                age: { type: 'number', max: 120 },
            });
            expect(tooHigh.valid).toBe(false);
        });

        it('should validate pattern matching', () => {
            const result = validate({ code: 'ABC123' }, {
                code: { pattern: /^[A-Z]{3}\d{3}$/ },
            });
            expect(result.valid).toBe(true);

            const invalid = validate({ code: 'abc123' }, {
                code: { pattern: /^[A-Z]{3}\d{3}$/ },
            });
            expect(invalid.valid).toBe(false);
        });

        it('should validate enum values', () => {
            const valid = validate({ status: 'active' }, {
                status: { enum: ['active', 'inactive', 'pending'] },
            });
            expect(valid.valid).toBe(true);

            const invalid = validate({ status: 'unknown' }, {
                status: { enum: ['active', 'inactive', 'pending'] },
            });
            expect(invalid.valid).toBe(false);
        });

        it('should validate arrays', () => {
            const valid = validate({ tags: ['a', 'b', 'c'] }, {
                tags: { type: 'array' },
            });
            expect(valid.valid).toBe(true);

            const invalid = validate({ tags: 'not an array' }, {
                tags: { type: 'array' },
            });
            expect(invalid.valid).toBe(false);
        });
    });

    describe('schemas', () => {
        it('should have valid register schema', () => {
            const validData = {
                email: 'test@example.com',
                password: 'securepass123',
                username: 'testuser',
            };

            const result = validate(validData, schemas.register);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid register data', () => {
            const invalidData = {
                email: 'not-email',
                password: 'short',
                username: 'ab',
            };

            const result = validate(invalidData, schemas.register);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should have valid login schema', () => {
            const result = validate(
                { email: 'test@example.com', password: 'password123' },
                schemas.login
            );
            expect(result.valid).toBe(true);
        });
    });

    describe('sanitizeInput', () => {
        it('should remove dangerous characters', () => {
            const result = sanitizeInput('<script>alert("xss")</script>');
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('</script>');
        });

        it('should trim whitespace', () => {
            const result = sanitizeInput('  test  ');
            expect(result).toBe('test');
        });

        it('should handle null/undefined', () => {
            expect(sanitizeInput(null as any)).toBe('');
            expect(sanitizeInput(undefined as any)).toBe('');
        });
    });

    describe('sanitizeHTML', () => {
        it('should escape HTML entities', () => {
            const result = sanitizeHTML('<div onclick="alert()">test</div>');
            expect(result).not.toContain('<div');
            expect(result).toContain('&lt;');
        });

        it('should escape ampersands', () => {
            const result = sanitizeHTML('A & B');
            expect(result).toContain('&amp;');
        });

        it('should escape quotes', () => {
            const result = sanitizeHTML('"quoted"');
            expect(result).toContain('&quot;');
        });
    });
});
