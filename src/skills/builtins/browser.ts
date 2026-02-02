import { Skill, SkillExecutionContext, SkillResult } from '../loader.js';
import { browserExecutor } from '../../execution/browser.js';

export const manifest: Skill['manifest'] = {
  name: 'browser',
  version: '1.0.0',
  description: 'Browser automation skill for web navigation, form filling, and data extraction',
  triggers: [
    { type: 'keyword', value: 'browse', description: 'Navigate to a URL' },
    { type: 'keyword', value: 'open website', description: 'Open a website' },
    { type: 'keyword', value: 'click', description: 'Click an element' },
    { type: 'keyword', value: 'fill form', description: 'Fill a form field' },
    { type: 'keyword', value: 'screenshot', description: 'Take a screenshot' },
    { type: 'keyword', value: 'extract', description: 'Extract data from page' },
  ],
  parameters: [
    {
      name: 'action',
      type: 'string',
      required: true,
      description: 'Action to perform',
      enum: ['navigate', 'click', 'fill', 'screenshot', 'extract', 'get_text'],
    },
    { name: 'url', type: 'string', required: false, description: 'URL for navigation' },
    { name: 'selector', type: 'string', required: false, description: 'CSS selector for element' },
    { name: 'value', type: 'string', required: false, description: 'Value to fill' },
    {
      name: 'fullPage',
      type: 'boolean',
      required: false,
      description: 'Take full page screenshot',
      default: false,
    },
  ],
  permissions: ['browser'],
  examples: [
    'browse to https://example.com',
    'click the login button',
    'fill the email field with test@example.com',
    'take a screenshot',
  ],
};

export class BrowserSkill implements Skill {
  manifest = manifest;

  async execute(context: SkillExecutionContext): Promise<SkillResult> {
    const { parameters } = context;
    const action = parameters.action as string;

    try {
      switch (action) {
        case 'navigate':
          const url = parameters.url as string;
          if (!url) {
            return { success: false, output: 'URL is required for navigation' };
          }
          const navResult = await browserExecutor.navigate({ url });
          return {
            success: navResult.success,
            output: navResult.success
              ? `Navigated to ${url}`
              : `Failed to navigate: ${navResult.error}`,
            data: { title: await browserExecutor.getTitle() },
          };

        case 'click':
          const clickSelector = parameters.selector as string;
          if (!clickSelector) {
            return { success: false, output: 'Selector is required for click' };
          }
          const clickResult = await browserExecutor.click(clickSelector);
          return {
            success: clickResult.success,
            output: clickResult.success
              ? `Clicked element: ${clickSelector}`
              : `Failed to click: ${clickResult.error}`,
          };

        case 'fill':
          const fillSelector = parameters.selector as string;
          const fillValue = parameters.value as string;
          if (!fillSelector || fillValue === undefined) {
            return { success: false, output: 'Selector and value are required' };
          }
          const fillResult = await browserExecutor.fill(fillSelector, fillValue);
          return {
            success: fillResult.success,
            output: fillResult.success
              ? `Filled ${fillSelector} with "${fillValue}"`
              : `Failed to fill: ${fillResult.error}`,
          };

        case 'screenshot':
          const screenshotResult = await browserExecutor.screenshot({
            fullPage: parameters.fullPage as boolean,
          });
          return {
            success: screenshotResult.success,
            output: screenshotResult.success
              ? `Screenshot captured (${screenshotResult.data})`
              : `Failed to capture screenshot: ${screenshotResult.error}`,
            data: { image: screenshotResult.screenshot },
          };

        case 'extract':
          const extractSelector = parameters.selector as string;
          if (!extractSelector) {
            return { success: false, output: 'Selector is required for extraction' };
          }
          const textResult = await browserExecutor.getText(extractSelector);
          return {
            success: textResult.success,
            output: textResult.success
              ? `Extracted: ${textResult.data}`
              : `Failed to extract: ${textResult.error}`,
            data: { extracted: textResult.data },
          };

        case 'get_text':
          const currentUrl = await browserExecutor.getCurrentUrl();
          const title = await browserExecutor.getTitle();
          return {
            success: true,
            output: `Page: ${title} (${currentUrl})`,
            data: { url: currentUrl, title },
          };

        default:
          return { success: false, output: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        output: `Browser error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async cleanup(): Promise<void> {
    await browserExecutor.close();
  }
}
