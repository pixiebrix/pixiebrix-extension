import { MessageContext } from "@/core";

export class ValidationError extends Error {
  errors: unknown;

  constructor(message: string, errors: unknown) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export class PropError extends Error {
  public readonly blockId: string;
  public readonly prop: string;
  public readonly value: unknown;

  constructor(message: string, blockId: string, prop: string, value: unknown) {
    super(message);
    this.name = "PropError";
    this.blockId = blockId;
    this.prop = prop;
    this.value = value;
  }
}

/**
 * Wrap an error with some additional context about where the error originated.
 */
export class ContextError extends Error {
  public readonly cause?: Error;
  public readonly context?: MessageContext;

  constructor(cause: Error, context?: MessageContext, message?: string) {
    super(cause.message ?? message);
    this.name = "ContextError";
    this.cause = cause;
    this.context = context;
  }
}
