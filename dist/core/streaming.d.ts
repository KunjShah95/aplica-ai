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
export declare class StreamingHandler {
    private callbacks;
    private buffer;
    private isComplete;
    onEvent(callback: StreamCallback): () => void;
    emit(event: StreamEvent): void;
    start(): void;
    text(content: string): void;
    toolCall(name: string, input: Record<string, unknown>): void;
    toolResult(name: string, output: unknown): void;
    error(message: string): void;
    done(usage?: StreamEvent['usage']): void;
    getBuffer(): string;
    isFinished(): boolean;
    reset(): void;
}
export declare class SSEWriter {
    private encoder;
    encode(event: StreamEvent): Uint8Array;
    encodeKeepAlive(): Uint8Array;
    encodeDone(): Uint8Array;
}
export declare function createStreamingResponse(generator: AsyncGenerator<StreamEvent>, headers?: Record<string, string>): Response;
export declare function parseSSEStream(response: Response): AsyncGenerator<StreamEvent>;
export declare class TokenCounter {
    private promptTokens;
    private completionTokens;
    addPromptTokens(count: number): void;
    addCompletionTokens(count: number): void;
    getUsage(): {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    reset(): void;
    static estimateTokens(text: string): number;
}
export declare function createOpenAIStreamTransformer(): TransformStream<Uint8Array, StreamEvent>;
//# sourceMappingURL=streaming.d.ts.map