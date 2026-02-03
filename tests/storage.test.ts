import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageProvider } from '../src/storage/files.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('LocalStorageProvider', () => {
    const testDir = './test-uploads';
    let storage: LocalStorageProvider;

    beforeEach(async () => {
        storage = new LocalStorageProvider(testDir);
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
        }
    });

    describe('upload', () => {
        it('should upload a file and return metadata', async () => {
            const content = Buffer.from('Hello, World!');

            const metadata = await storage.upload(content, {
                userId: 'user-123',
                originalName: 'test.txt',
                mimeType: 'text/plain',
            });

            expect(metadata.id).toBeDefined();
            expect(metadata.filename).toContain('.txt');
            expect(metadata.originalName).toBe('test.txt');
            expect(metadata.mimeType).toBe('text/plain');
            expect(metadata.size).toBe(content.length);
            expect(metadata.uploadedBy).toBe('user-123');
            expect(metadata.checksum).toBeDefined();
        });

        it('should enforce max file size', async () => {
            const content = Buffer.alloc(1000);

            await expect(
                storage.upload(content, {
                    userId: 'user-123',
                    originalName: 'large.bin',
                    mimeType: 'application/octet-stream',
                    maxSize: 500,
                })
            ).rejects.toThrow('exceeds maximum size');
        });

        it('should store custom metadata', async () => {
            const content = Buffer.from('test');

            const metadata = await storage.upload(content, {
                userId: 'user-123',
                originalName: 'meta.txt',
                mimeType: 'text/plain',
                metadata: { customField: 'value' },
            });

            expect(metadata.metadata).toEqual({ customField: 'value' });
        });
    });

    describe('download', () => {
        it('should download previously uploaded file', async () => {
            const content = Buffer.from('Download test content');

            const uploadMeta = await storage.upload(content, {
                userId: 'user-123',
                originalName: 'download.txt',
                mimeType: 'text/plain',
            });

            const { buffer, metadata } = await storage.download(uploadMeta.id);

            expect(buffer.toString()).toBe('Download test content');
            expect(metadata.id).toBe(uploadMeta.id);
        });

        it('should throw for non-existent file', async () => {
            await expect(storage.download('nonexistent')).rejects.toThrow('File not found');
        });
    });

    describe('delete', () => {
        it('should delete uploaded file', async () => {
            const content = Buffer.from('To delete');

            const metadata = await storage.upload(content, {
                userId: 'user-123',
                originalName: 'delete.txt',
                mimeType: 'text/plain',
            });

            await storage.delete(metadata.id);

            await expect(storage.download(metadata.id)).rejects.toThrow('File not found');
        });

        it('should throw for non-existent file', async () => {
            await expect(storage.delete('nonexistent')).rejects.toThrow('File not found');
        });
    });

    describe('getMetadata', () => {
        it('should return metadata for existing file', async () => {
            const content = Buffer.from('Metadata test');

            const uploadMeta = await storage.upload(content, {
                userId: 'user-123',
                originalName: 'meta.txt',
                mimeType: 'text/plain',
            });

            const metadata = await storage.getMetadata(uploadMeta.id);

            expect(metadata).not.toBeNull();
            expect(metadata?.id).toBe(uploadMeta.id);
        });

        it('should return null for non-existent file', async () => {
            const metadata = await storage.getMetadata('nonexistent');
            expect(metadata).toBeNull();
        });
    });

    describe('list', () => {
        it('should list files for a user', async () => {
            await storage.upload(Buffer.from('file1'), {
                userId: 'user-A',
                originalName: 'file1.txt',
                mimeType: 'text/plain',
            });

            await storage.upload(Buffer.from('file2'), {
                userId: 'user-A',
                originalName: 'file2.txt',
                mimeType: 'text/plain',
            });

            await storage.upload(Buffer.from('file3'), {
                userId: 'user-B',
                originalName: 'file3.txt',
                mimeType: 'text/plain',
            });

            const userAFiles = await storage.list('user-A');
            expect(userAFiles.length).toBe(2);

            const userBFiles = await storage.list('user-B');
            expect(userBFiles.length).toBe(1);
        });

        it('should respect limit parameter', async () => {
            for (let i = 0; i < 5; i++) {
                await storage.upload(Buffer.from(`file${i}`), {
                    userId: 'user-limit',
                    originalName: `file${i}.txt`,
                    mimeType: 'text/plain',
                });
            }

            const files = await storage.list('user-limit', 3);
            expect(files.length).toBe(3);
        });
    });

    describe('getUrl', () => {
        it('should return download URL for file', async () => {
            const metadata = await storage.upload(Buffer.from('url test'), {
                userId: 'user-123',
                originalName: 'url.txt',
                mimeType: 'text/plain',
            });

            const url = await storage.getUrl(metadata.id);
            expect(url).toContain(metadata.id);
            expect(url).toContain('/download');
        });
    });
});
