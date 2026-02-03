import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules',
                'dist',
                'tests',
                '**/*.d.ts',
                '**/*.test.ts',
            ],
        },
        testTimeout: 30000,
        hookTimeout: 30000,
        setupFiles: ['./tests/setup.ts'],
    },
    resolve: {
        alias: {
            '@': './src',
        },
    },
});
