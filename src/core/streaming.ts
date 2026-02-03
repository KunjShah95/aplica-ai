export interface StreamEvent {
    type: 'start' | 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
    content?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: unknown;
    error?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export type StreamCallback = (event: StreamEvent) => void;

export class StreamingHandler {
    private callbacks: StreamCallback[] = [];
    private buffer: string = '';
    private isComplete: boolean = false;

    onEvent(callback: StreamCallback): () => void {
        this.callbacks.push(callback);
        return () => {
            const index = this.callbacks.indexOf(callback);
            if (index > -1) {
                this.callbacks.splice(index, 1);
            }
        };
    }

    emit(event: StreamEvent): void {
        if (event.type === 'text' && event.content) {
            this.buffer += event.content;
        }

        if (event.type === 'done') {
            this.isComplete = true;
        }

        for (const callback of this.callbacks) {
            try {
                callback(event);
            } catch (error) {
                console.error('Stream callback error:', error);
            }
        }
    }

    start(): void {
        this.emit({ type: 'start' });
    }

    text(content: string): void {
        this.emit({ type: 'text', content });
    }

    toolCall(name: string, input: Record<string, unknown>): void {
        this.emit({ type: 'tool_call', toolName: name, toolInput: input });
    }

    toolResult(name: string, output: unknown): void {
        this.emit({ type: 'tool_result', toolName: name, toolOutput: output });
    }

    error(message: string): void {
        this.emit({ type: 'error', error: message });
    }

    done(usage?: StreamEvent['usage']): void {
        this.emit({ type: 'done', usage });
    }

    getBuffer(): string {
        return this.buffer;
    }

    isFinished(): boolean {
        return this.isComplete;
    }

    reset(): void {
        this.buffer = '';
        this.isComplete = false;
    }
}

export class SSEWriter {
    private encoder = new TextEncoder();

    encode(event: StreamEvent): Uint8Array {
        const data = JSON.stringify(event);
        const sseMessage = `data: ${data}\n\n`;
        return this.encoder.encode(sseMessage);
    }

    encodeKeepAlive(): Uint8Array {
        return this.encoder.encode(': keepalive\n\n');
    }

    encodeDone(): Uint8Array {
        return this.encoder.encode('data: [DONE]\n\n');
    }
}

export function createStreamingResponse(
    generator: AsyncGenerator<StreamEvent>,
    headers?: Record<string, string>
): Response {
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
            } catch (error) {
                const errorEvent: StreamEvent = {
                    type: 'error',
                    error: error instanceof Error ? error.message : String(error),
                };
                controller.enqueue(sseWriter.encode(errorEvent));
            } finally {
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

export async function* parseSSEStream(
    response: Response
): AsyncGenerator<StreamEvent> {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

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
                        const event = JSON.parse(data) as StreamEvent;
                        yield event;
                    } catch {
                        continue;
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

export class TokenCounter {
    private promptTokens: number = 0;
    private completionTokens: number = 0;

    addPromptTokens(count: number): void {
        this.promptTokens += count;
    }

    addCompletionTokens(count: number): void {
        this.completionTokens += count;
    }

    getUsage(): { promptTokens: number; completionTokens: number; totalTokens: number } {
        return {
            promptTokens: this.promptTokens,
            completionTokens: this.completionTokens,
            totalTokens: this.promptTokens + this.completionTokens,
        };
    }

    reset(): void {
        this.promptTokens = 0;
        this.completionTokens = 0;
    }

    static estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }
}

export function createOpenAIStreamTransformer(): TransformStream<Uint8Array, StreamEvent> {
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
                    } catch {
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
