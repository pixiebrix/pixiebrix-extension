export class ValidationError extends Error {
  errors: any;

  constructor(message: string, errors: any) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}
