export class StreamingHandler {
    callbacks = [];
    buffer = '';
    isComplete = false;
    onEvent(callback) {
        this.callbacks.push(callback);
        return () => {
            const index = this.callbacks.indexOf(callback);
            if (index > -1) {
                this.callbacks.splice(index, 1);
            }
        };
    }
    emit(event) {
        if (event.type === 'text' && event.content) {
            this.buffer += event.content;
        }
        if (event.type === 'done') {
            this.isComplete = true;
        }
        for (const callback of this.callbacks) {
            try {
                callback(event);
            }
            catch (error) {
                console.error('Stream callback error:', error);
            }
        }
    }
    start() {
        this.emit({ type: 'start' });
    }
    text(content) {
        this.emit({ type: 'text', content });
    }
    toolCall(name, input) {
        this.emit({ type: 'tool_call', toolName: name, toolInput: input });
    }
    toolResult(name, output) {
        this.emit({ type: 'tool_result', toolName: name, toolOutput: output });
    }
    error(message) {
        this.emit({ type: 'error', error: message });
    }
    done(usage) {
        this.emit({ type: 'done', usage });
    }
    getBuffer() {
        return this.buffer;
    }
    isFinished() {
        return this.isComplete;
    }
    reset() {
        this.buffer = '';
        this.isComplete = false;
    }
}
export class SSEWriter {
    encoder = new TextEncoder();
    encode(event) {
        const data = JSON.stringify(event);
        const sseMessage = `data: ${data}\n\n`;
        return this.encoder.encode(sseMessage);
    }
    encodeKeepAlive() {
        return this.encoder.encode(': keepalive\n\n');
    }
    encodeDone() {
        return this.encoder.encode('data: [DONE]\n\n');
    }
}
export function createStreamingResponse(generator, headers) {
    const sseWriter = new SSEWriter();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of generator) {
                    controller.enqueue(sseWriter.encode(event));
                    if (event.type === 'done') {
                        controller.enqueue(sseWriter.encodeDone());
                    }
                }
            }
            catch (error) {
                const errorEvent = {
                    type: 'error',
                    error: error instanceof Error ? error.message : String(error),
                };
                controller.enqueue(sseWriter.encode(errorEvent));
            }
            finally {
                controller.close();
            }
        },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...headers,
        },
    });
}
export async function* parseSSEStream(response) {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        return;
                    }
                    try {
                        const event = JSON.parse(data);
                        yield event;
                    }
                    catch {
                        continue;
                    }
                }
            }
        }
    }
    finally {
        reader.releaseLock();
    }
}
export class TokenCounter {
    promptTokens = 0;
    completionTokens = 0;
    addPromptTokens(count) {
        this.promptTokens += count;
    }
    addCompletionTokens(count) {
        this.completionTokens += count;
    }
    getUsage() {
        return {
            promptTokens: this.promptTokens,
            completionTokens: this.completionTokens,
            totalTokens: this.promptTokens + this.completionTokens,
        };
    }
    reset() {
        this.promptTokens = 0;
        this.completionTokens = 0;
    }
    static estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
}
export function createOpenAIStreamTransformer() {
    const decoder = new TextDecoder();
    let buffer = '';
    return new TransformStream({
        transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        controller.enqueue({ type: 'done' });
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            controller.enqueue({ type: 'text', content });
                        }
                        const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
                        if (toolCalls) {
                            for (const tc of toolCalls) {
                                if (tc.function?.name) {
                                    controller.enqueue({
                                        type: 'tool_call',
                                        toolName: tc.function.name,
                                        toolInput: tc.function.arguments
                                            ? JSON.parse(tc.function.arguments)
                                            : {},
                                    });
                                }
                            }
                        }
                    }
                    catch {
                        continue;
                    }
                }
            }
        },
        flush(controller) {
            controller.enqueue({ type: 'done' });
        },
    });
}
//# sourceMappingURL=streaming.js.map