import { Router } from 'express';
import { knowledgeBaseService } from '../integration/knowledge-base.js';
const router = Router();
router.post('/', async (req, res) => {
    try {
        const { userId, workspaceId, name, description, settings } = req.body;
        if (!userId || !name) {
            return res.status(400).json({ error: 'userId and name are required' });
        }
        const knowledgeBase = await knowledgeBaseService.create({
            userId,
            workspaceId,
            name,
            description,
            settings,
        });
        res.status(201).json(knowledgeBase);
    }
    catch (error) {
        console.error('Failed to create knowledge base:', error);
        res.status(500).json({ error: 'Failed to create knowledge base' });
    }
});
router.get('/', async (req, res) => {
    try {
        const { userId, workspaceId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const knowledgeBases = await knowledgeBaseService.listByUser(userId, workspaceId);
        res.json(knowledgeBases);
    }
    catch (error) {
        console.error('Failed to list knowledge bases:', error);
        res.status(500).json({ error: 'Failed to list knowledge bases' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const knowledgeBase = await knowledgeBaseService.getById(id);
        if (!knowledgeBase) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }
        res.json(knowledgeBase);
    }
    catch (error) {
        console.error('Failed to get knowledge base:', error);
        res.status(500).json({ error: 'Failed to get knowledge base' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await knowledgeBaseService.delete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Failed to delete knowledge base:', error);
        res.status(500).json({ error: 'Failed to delete knowledge base' });
    }
});
router.post('/:id/documents', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, source, sourceType, metadata } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'title and content are required' });
        }
        const document = await knowledgeBaseService.addDocument({
            knowledgeBaseId: id,
            title,
            content,
            source,
            sourceType: sourceType,
            metadata,
        });
        res.status(201).json(document);
    }
    catch (error) {
        console.error('Failed to add document:', error);
        res.status(500).json({ error: 'Failed to add document' });
    }
});
router.get('/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await knowledgeBaseService.getDocument(documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(document);
    }
    catch (error) {
        console.error('Failed to get document:', error);
        res.status(500).json({ error: 'Failed to get document' });
    }
});
router.delete('/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const deleted = await knowledgeBaseService.deleteDocument(documentId);
        if (!deleted) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Failed to delete document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});
router.post('/query', async (req, res) => {
    try {
        const { knowledgeBaseId, query, userId, maxResults, minSimilarity } = req.body;
        if (!query || !userId) {
            return res.status(400).json({ error: 'query and userId are required' });
        }
        const result = await knowledgeBaseService.query({
            knowledgeBaseId,
            query,
            userId,
            maxResults,
            minSimilarity,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Failed to query knowledge base:', error);
        res.status(500).json({ error: 'Failed to query knowledge base' });
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await knowledgeBaseService.getStats(id);
        res.json(stats);
    }
    catch (error) {
        console.error('Failed to get knowledge base stats:', error);
        res.status(500).json({ error: 'Failed to get knowledge base stats' });
    }
});
export default router;
//# sourceMappingURL=knowledge-base.js.map