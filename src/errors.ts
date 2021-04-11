/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { MessageContext } from "@/core";

export class ValidationError extends Error {
  errors: unknown;

  constructor(message: string, errors: unknown) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export class CancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CancelError";
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

export function hasCancelRootCause(err: Error): boolean {
  if (err instanceof CancelError || err.name === "CancelError") {
    return true;
  } else if (err instanceof ContextError) {
    return hasCancelRootCause(err.cause);
  }
  return false;
}
