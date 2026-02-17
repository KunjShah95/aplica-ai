import { PersistentSandbox } from '../../../execution/persistent-sandbox.js';
import { createProvider } from '../../../core/llm/index.js';
import { configLoader } from '../../../config/loader.js';
import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import path from 'path';
export class CoworkerSkill {
    manifest;
    browser = null;
    page = null;
    async execute(context) {
        const { parameters, userId } = context;
        const task = parameters.task;
        const taskContext = parameters.context || '';
        if (!task)
            return { success: false, output: 'Task is required.' };
        const sandbox = new PersistentSandbox('node:20-alpine');
        let sandboxStarted = false;
        try {
            await sandbox.start();
            sandboxStarted = true;
            console.log(`[Coworker] Sandbox started: ${sandbox.id}`);
            const config = await configLoader.load();
            const llm = createProvider(config.llm);
            const systemPrompt = `You are an autonomous AI Coworker.
You are running inside a persistent Docker container (Alpine Linux).
You have access to the following tools. You must use them to accomplish the user's task.

TOOLS:
1. <tool_use name="run_command"><command>ls -la</command></tool_use>
   - Executes a shell command.
   - Output will be returned to you.
2. <tool_use name="write_file"><path>/app/hello.txt</path><content>Hello world</content></tool_use>
   - Writes specific content to a file.
3. <tool_use name="read_file"><path>/app/hello.txt</path></tool_use>
   - Reads a file.
4. <tool_use name="browser_navigate"><url>https://google.com</url></tool_use>
   - Opens a browser (headless) and navigates to the URL.
5. <tool_use name="browser_screenshot"><name>google_homepage</name></tool_use>
   - Takes a screenshot of the current page. Returns the path to the screenshot.
6. <tool_use name="browser_click"><selector>button#submit</selector></tool_use>
   - Click an element on the page. Use CSS selectors.
7. <tool_use name="browser_type"><selector>input#search</selector><text>Hello World</text></tool_use>
   - Type text into an element.
8. <tool_use name="browser_scroll"><direction>down</direction><amount>500</amount></tool_use>
   - Scroll the page. Direction: 'up', 'down', 'top', 'bottom'. Amount in pixels (optional for top/bottom).
9. <tool_use name="browser_eval"><script>return document.title;</script></tool_use>
   - Execute JavaScript in the browser. Returns the result.
10. <tool_use name="finish"><result>I have completed the task.</result></tool_use>
   - signal completion.

FORMAT:
Thought: [Your reasoning]
Tool: <tool_use name="...">...</tool_use>

User Task: ${task}
Context: ${taskContext}
`;
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: "Please start." }
            ];
            let iterations = 0;
            const MAX_ITERATIONS = 15;
            while (iterations < MAX_ITERATIONS) {
                iterations++;
                console.log(`[Coworker] Iteration ${iterations}`);
                try {
                    const response = await llm.complete(messages, { temperature: 0.1 });
                    const responseText = response.content;
                    console.log(`[Coworker] Thought: ${responseText.split('<tool_use')[0].trim()}`);
                    messages.push({ role: 'assistant', content: responseText });
                    // Parse tool use
                    const toolRegex = /<tool_use name="([^"]+)">([\s\S]*?)<\/tool_use>/;
                    const match = responseText.match(toolRegex);
                    if (!match) {
                        // If no tool use, maybe it's just chatting or finished without explicit tag
                        if (responseText.toLowerCase().includes("finish") || responseText.length < 50) {
                            // Assume we might be done or stuck
                            messages.push({ role: 'user', content: "Please use a tool or <tool_use name=\"finish\"> to complete." });
                            continue;
                        }
                        messages.push({ role: 'user', content: "Please use a tool to proceed." });
                        continue;
                    }
                    const toolName = match[1];
                    const toolBody = match[2];
                    let toolResult = '';
                    if (toolName === 'finish') {
                        const resultRegex = /<result>([\s\S]*?)<\/result>/;
                        const resMatch = toolBody.match(resultRegex);
                        const finalOutput = resMatch ? resMatch[1] : toolBody;
                        return { success: true, output: finalOutput, data: { iterations } };
                    }
                    if (toolName === 'run_command') {
                        const cmdRegex = /<command>([\s\S]*?)<\/command>/;
                        const cmdMatch = toolBody.match(cmdRegex);
                        const cmd = cmdMatch ? cmdMatch[1] : '';
                        if (cmd) {
                            console.log(`[Coworker] Executing: ${cmd}`);
                            const res = await sandbox.exec(cmd);
                            toolResult = `Exit Code: ${res.exitCode}\nSTDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`;
                        }
                        else {
                            toolResult = "Error: No command provided";
                        }
                    }
                    else if (toolName === 'write_file') {
                        const pathRegex = /<path>([\s\S]*?)<\/path>/;
                        const contentRegex = /<content>([\s\S]*?)<\/content>/;
                        const pathMatch = toolBody.match(pathRegex);
                        const contentMatch = toolBody.match(contentRegex);
                        if (pathMatch && contentMatch) {
                            console.log(`[Coworker] Writing file: ${pathMatch[1]}`);
                            await sandbox.writeFile(pathMatch[1], contentMatch[1]);
                            toolResult = "File written successfully.";
                        }
                        else {
                            toolResult = "Error: Missing path or content";
                        }
                    }
                    else if (toolName === 'read_file') {
                        const pathRegex = /<path>([\s\S]*?)<\/path>/;
                        const pathMatch = toolBody.match(pathRegex);
                        if (pathMatch) {
                            console.log(`[Coworker] Reading file: ${pathMatch[1]}`);
                            try {
                                const content = await sandbox.readFile(pathMatch[1]);
                                toolResult = content;
                            }
                            catch (e) {
                                toolResult = `Error reading file: ${e.message}`;
                            }
                        }
                        else {
                            toolResult = "Error: Missing path";
                        }
                    }
                    else if (toolName === 'browser_navigate') {
                        const urlRegex = /<url>([\s\S]*?)<\/url>/;
                        const match = toolBody.match(urlRegex);
                        const url = match ? match[1] : '';
                        if (url) {
                            console.log(`[Coworker] Navigating to: ${url}`);
                            try {
                                if (!this.browser) {
                                    this.browser = await chromium.launch({ headless: true });
                                    this.page = await this.browser.newPage();
                                }
                                await this.page.goto(url, { waitUntil: 'domcontentloaded' });
                                toolResult = `Navigated to ${url}. Page Title: ${await this.page.title()}`;
                            }
                            catch (e) {
                                toolResult = `Error navigating: ${e.message}`;
                            }
                        }
                        else {
                            toolResult = "Error: Missing URL";
                        }
                    }
                    else if (toolName === 'browser_screenshot') {
                        const nameRegex = /<name>([\s\S]*?)<\/name>/;
                        const match = toolBody.match(nameRegex);
                        const name = match ? match[1] : `screenshot-${Date.now()}`;
                        if (this.page) {
                            console.log(`[Coworker] Taking screenshot: ${name}`);
                            const screenshotsDir = path.join(process.cwd(), 'screenshots');
                            await fs.mkdir(screenshotsDir, { recursive: true });
                            const screenshotPath = path.join(screenshotsDir, `${name}.png`);
                            await this.page.screenshot({ path: screenshotPath });
                            toolResult = `Screenshot saved to: ${screenshotPath}`;
                        }
                        else {
                            toolResult = "Error: Browser not open. Navigate first.";
                        }
                    }
                    else if (toolName === 'browser_click') {
                        const selectorRegex = /<selector>([\s\S]*?)<\/selector>/;
                        const match = toolBody.match(selectorRegex);
                        if (match && this.page) {
                            const selector = match[1];
                            console.log(`[Coworker] Clicking: ${selector}`);
                            try {
                                await this.page.click(selector);
                                toolResult = `Clicked ${selector}`;
                            }
                            catch (e) {
                                toolResult = `Error clicking: ${e.message}`;
                            }
                        }
                        else {
                            toolResult = this.page ? "Error: Missing selector" : "Error: Browser not open";
                        }
                    }
                    else if (toolName === 'browser_type') {
                        const selectorRegex = /<selector>([\s\S]*?)<\/selector>/;
                        const textRegex = /<text>([\s\S]*?)<\/text>/;
                        const selMatch = toolBody.match(selectorRegex);
                        const textMatch = toolBody.match(textRegex);
                        if (selMatch && textMatch && this.page) {
                            console.log(`[Coworker] Typing into ${selMatch[1]}`);
                            try {
                                await this.page.fill(selMatch[1], textMatch[1]);
                                toolResult = `Typed into ${selMatch[1]}`;
                            }
                            catch (e) {
                                toolResult = `Error typing: ${e.message}`;
                            }
                        }
                        else {
                            toolResult = "Error: Missing selector or text, or browser not open";
                        }
                    }
                    else if (toolName === 'browser_scroll') {
                        const dirRegex = /<direction>([\s\S]*?)<\/direction>/;
                        const amtRegex = /<amount>([\s\S]*?)<\/amount>/;
                        const dirMatch = toolBody.match(dirRegex);
                        const amtMatch = toolBody.match(amtRegex);
                        const direction = dirMatch ? dirMatch[1] : 'down';
                        const amount = amtMatch ? parseInt(amtMatch[1]) : 500;
                        if (this.page) {
                            console.log(`[Coworker] Scrolling ${direction}`);
                            try {
                                if (direction === 'top')
                                    await this.page.evaluate(() => window.scrollTo(0, 0));
                                else if (direction === 'bottom')
                                    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                                else if (direction === 'up')
                                    await this.page.evaluate((amount) => window.scrollBy(0, -amount), amount);
                                else
                                    await this.page.evaluate((amount) => window.scrollBy(0, amount), amount);
                                toolResult = `Scrolled ${direction}`;
                            }
                            catch (e) {
                                toolResult = `Error scrolling: ${e.message}`;
                            }
                        }
                        else {
                            toolResult = "Error: Browser not open";
                        }
                    }
                    else if (toolName === 'browser_eval') {
                        const scriptRegex = /<script>([\s\S]*?)<\/script>/;
                        const match = toolBody.match(scriptRegex);
                        if (match && this.page) {
                            console.log(`[Coworker] Evaluating script`);
                            try {
                                const result = await this.page.evaluate((code) => {
                                    // wrapper to safely eval
                                    return eval(code);
                                }, match[1]);
                                toolResult = `Result: ${JSON.stringify(result)}`;
                            }
                            catch (e) {
                                toolResult = `Error evaluating: ${e.message}`;
                            }
                        }
                        else {
                            toolResult = "Error: Missing script or browser not open";
                        }
                    }
                    else {
                        toolResult = `Unknown tool: ${toolName}`;
                    }
                    messages.push({ role: 'user', content: `<tool_result>${toolResult}</tool_result>` });
                }
                catch (e) {
                    console.error("LLM Error:", e);
                    messages.push({ role: 'user', content: `System Error: ${e}` });
                }
            }
            return { success: false, output: 'Max iterations reached without completion.' };
        }
        catch (error) {
            return { success: false, output: `Coworker crashed: ${error}` };
        }
        finally {
            if (this.browser) {
                await this.browser.close();
            }
            if (sandboxStarted)
                await sandbox.stop();
        }
    }
}
//# sourceMappingURL=index.js.map