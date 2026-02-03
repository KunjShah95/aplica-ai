import { Router, Request, Response } from 'express';
import {
  browserAutomation,
  BrowserConfig,
  FormData,
  DataExtractionConfig,
} from '../execution/browser-advanced.js';

const router = Router();

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const config: BrowserConfig = req.body;
    const session = await browserAutomation.createSession(config);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = browserAutomation.getActiveSessions();
    const stats = browserAutomation.getSessionStats();
    res.json({ sessions, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessions = browserAutomation.getActiveSessions();
    const session = sessions.find((s) => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    await browserAutomation.closeSession(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions', async (req: Request, res: Response) => {
  try {
    await browserAutomation.closeAllSessions();
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/navigate', async (req: Request, res: Response) => {
  try {
    const { url, waitUntil, timeout, referer } = req.body;
    const result = await browserAutomation.navigate(req.params.id, url, {
      waitUntil,
      timeout,
      referer,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/click', async (req: Request, res: Response) => {
  try {
    const { selector, button, clickCount, delay, force, timeout } = req.body;
    const result = await browserAutomation.click(req.params.id, selector, {
      button,
      clickCount,
      delay,
      force,
      timeout,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/double-click', async (req: Request, res: Response) => {
  try {
    const { selector, delay, force, timeout } = req.body;
    const result = await browserAutomation.doubleClick(req.params.id, selector, {
      delay,
      force,
      timeout,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/hover', async (req: Request, res: Response) => {
  try {
    const { selector, force, timeout } = req.body;
    const result = await browserAutomation.hover(req.params.id, selector, { force, timeout });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/drag-drop', async (req: Request, res: Response) => {
  try {
    const { sourceSelector, targetSelector, timeout } = req.body;
    const result = await browserAutomation.dragAndDrop(
      req.params.id,
      sourceSelector,
      targetSelector,
      { timeout }
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/type', async (req: Request, res: Response) => {
  try {
    const { selector, text, delay, timeout } = req.body;
    const result = await browserAutomation.type(req.params.id, selector, text, { delay, timeout });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/fill', async (req: Request, res: Response) => {
  try {
    const { selector, value, timeout } = req.body;
    const result = await browserAutomation.fill(req.params.id, selector, value, { timeout });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/form', async (req: Request, res: Response) => {
  try {
    const formData: FormData = req.body;
    const result = await browserAutomation.fillForm(req.params.id, formData);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/upload', async (req: Request, res: Response) => {
  try {
    const { selector, filePath } = req.body;
    const result = await browserAutomation.uploadFile(req.params.id, selector, filePath);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/press', async (req: Request, res: Response) => {
  try {
    const { selector, key, delay, timeout } = req.body;
    const result = await browserAutomation.press(req.params.id, selector, key, { delay, timeout });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/text', async (req: Request, res: Response) => {
  try {
    const { selector, timeout } = req.query;
    const result = await browserAutomation.getText(req.params.id, selector as string, {
      timeout: Number(timeout),
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/attribute', async (req: Request, res: Response) => {
  try {
    const { selector, attribute, timeout } = req.query;
    const result = await browserAutomation.getAttribute(
      req.params.id,
      selector as string,
      attribute as string,
      { timeout: Number(timeout) }
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/count', async (req: Request, res: Response) => {
  try {
    const { selector } = req.query;
    const result = await browserAutomation.countElements(req.params.id, selector as string);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/exists', async (req: Request, res: Response) => {
  try {
    const { selector } = req.query;
    const result = await browserAutomation.exists(req.params.id, selector as string);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/visible', async (req: Request, res: Response) => {
  try {
    const { selector } = req.query;
    const result = await browserAutomation.isVisible(req.params.id, selector as string);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/wait/selector', async (req: Request, res: Response) => {
  try {
    const { selector, timeout, state } = req.body;
    const result = await browserAutomation.waitForSelector(req.params.id, selector, {
      timeout,
      state,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/wait/timeout', async (req: Request, res: Response) => {
  try {
    const { milliseconds } = req.body;
    await browserAutomation.waitForTimeout(req.params.id, milliseconds);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/wait/navigation', async (req: Request, res: Response) => {
  try {
    const { timeout, waitUntil } = req.body;
    const result = await browserAutomation.waitForNavigation(req.params.id, { timeout, waitUntil });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/screenshot', async (req: Request, res: Response) => {
  try {
    const { fullPage, clip, quality, format, path } = req.body;
    const result = await browserAutomation.screenshot(req.params.id, {
      fullPage,
      clip,
      quality,
      format,
      path,
    });

    if (result.path) {
      return res.download(result.path);
    }

    if (result.data) {
      const buffer = Buffer.from(result.data, 'base64');
      res.setHeader('Content-Type', `image/${format || 'png'}`);
      return res.send(buffer);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { format, landscape, printBackground, scale, path } = req.body;
    const result = await browserAutomation.pdf(req.params.id, {
      format,
      landscape,
      printBackground,
      scale,
      path,
    });

    if (result.path) {
      return res.download(result.path);
    }

    if (result.data) {
      const buffer = Buffer.from(result.data, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(buffer);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const { script } = req.body;
    const result = await browserAutomation.evaluate(req.params.id, script);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/extract', async (req: Request, res: Response) => {
  try {
    const config: DataExtractionConfig = req.body;
    const result = await browserAutomation.extractData(req.params.id, config);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/url', async (req: Request, res: Response) => {
  try {
    const url = await browserAutomation.getCurrentUrl(req.params.id);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/title', async (req: Request, res: Response) => {
  try {
    const title = await browserAutomation.getTitle(req.params.id);
    res.json({ title });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/content', async (req: Request, res: Response) => {
  try {
    const content = await browserAutomation.getPageContent(req.params.id);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/back', async (req: Request, res: Response) => {
  try {
    await browserAutomation.goBack(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/forward', async (req: Request, res: Response) => {
  try {
    await browserAutomation.goForward(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/reload', async (req: Request, res: Response) => {
  try {
    await browserAutomation.reload(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/cookies', async (req: Request, res: Response) => {
  try {
    const { action, cookie } = req.body;
    if (action === 'add') {
      await browserAutomation.addCookie(req.params.id, cookie);
    } else if (action === 'delete') {
      await browserAutomation.deleteCookies(req.params.id, cookie ? [cookie] : undefined);
    } else if (action === 'clear') {
      await browserAutomation.deleteCookies(req.params.id);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/cookies', async (req: Request, res: Response) => {
  try {
    const cookies = await browserAutomation.getCookies(req.params.id);
    res.json({ cookies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/state', async (req: Request, res: Response) => {
  try {
    const { action, path } = req.body;
    if (action === 'save') {
      await browserAutomation.saveState(req.params.id, path);
    } else if (action === 'load') {
      await browserAutomation.loadState(req.params.id, path);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/accessibility', async (req: Request, res: Response) => {
  try {
    const tree = await browserAutomation.getAccessibilityTree(req.params.id);
    res.json({ tree });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/mock', async (req: Request, res: Response) => {
  try {
    const { urlPattern, response } = req.body;
    await browserAutomation.mockRequest(req.params.id, { urlPattern, response });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id/mock', async (req: Request, res: Response) => {
  try {
    await browserAutomation.clearMocks(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/logs', async (req: Request, res: Response) => {
  try {
    const consoleLogs = await browserAutomation.getConsoleLogs(req.params.id);
    const errors = await browserAutomation.getPageErrors(req.params.id);
    res.json({ consoleLogs, errors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
