export declare class BaseError extends Error {
    statusCode: number;
    details?: Record<string, unknown>;
    constructor(message: string, statusCode?: number, details?: Record<string, unknown>);
}
export declare class UnauthorizedError extends BaseError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class NotFoundError extends BaseError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class ConflictError extends BaseError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare function Injectable(): ClassDecorator;
//# sourceMappingURL=errors.d.ts.map