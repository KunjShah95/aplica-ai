export class BaseError extends Error {
    statusCode;
    details;
    constructor(message, statusCode = 500, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.details = details;
    }
}
export class UnauthorizedError extends BaseError {
    constructor(message = 'Unauthorized', details) {
        super(message, 401, details);
    }
}
export class NotFoundError extends BaseError {
    constructor(message = 'Not Found', details) {
        super(message, 404, details);
    }
}
export class ConflictError extends BaseError {
    constructor(message = 'Conflict', details) {
        super(message, 409, details);
    }
}
export function Injectable() {
    return () => {
        // No-op decorator placeholder for DI compatibility.
    };
}
//# sourceMappingURL=errors.js.map