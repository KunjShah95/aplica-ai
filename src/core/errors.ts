export class BaseError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = 'Not Found', details?: Record<string, unknown>) {
    super(message, 404, details);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = 'Conflict', details?: Record<string, unknown>) {
    super(message, 409, details);
  }
}

export function Injectable(): ClassDecorator {
  return () => {
    // No-op decorator placeholder for DI compatibility.
  };
}