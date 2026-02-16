export abstract class BaseException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
    };
  }
}
