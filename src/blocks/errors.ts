/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { castArray } from "lodash";
import { type MessageContext, type RegistryId, type Schema } from "@/core";
import { type OutputUnit } from "@cfworker/json-schema";
import { type BlockConfig, type BlockPipeline } from "@/blocks/types";
import { type JsonObject } from "type-fest";
import { BusinessError, CancelError } from "@/errors/businessErrors";

export class PipelineConfigurationError extends BusinessError {
  override name = "PipelineConfigurationError";
  readonly config: BlockPipeline;

  constructor(message: string, config: BlockConfig | BlockPipeline) {
    super(message);
    this.config = castArray(config);
  }
}

/**
 * Error bailing if a renderer component is encountered while running in "headless mode"
 *
 * Headless mode is used when the content script should run a script, but that the result will be rendered in a
 * different browser context (e.g., the PixieBrix sidebar)
 */
export class HeadlessModeError extends Error {
  override name = "HeadlessModeError";

  public readonly blockId: RegistryId;

  public readonly args: unknown;

  public readonly ctxt: unknown;

  public readonly loggerContext: MessageContext;

  constructor(
    blockId: RegistryId,
    args: unknown, // BlockArg
    ctxt: unknown, // BlockArgsContext
    loggerContext: MessageContext
  ) {
    super(`${blockId} is a renderer`);
    this.blockId = blockId;
    this.args = args;
    this.ctxt = ctxt;
    this.loggerContext = loggerContext;
  }
}

/**
 * Error indicating input elements to a block did not match the JSON schema.
 */
export class InputValidationError extends BusinessError {
  override name = "InputValidationError";

  constructor(
    message: string,
    readonly schema: Schema,
    readonly input: unknown,
    readonly errors: OutputUnit[]
  ) {
    super(message);
  }
}

export function isInputValidationError(
  error: unknown
): error is InputValidationError {
  return typeof error === "object" && "schema" in error && "errors" in error;
}

/**
 * Error indicating output elements of a block did not match the schema.
 *
 * In practice, this error should be logged, not thrown. Checking brick post-conditions is helpful for fault
 * localization, but we optimistically try to proceed with brick execution.
 */
export class OutputValidationError extends BusinessError {
  override name = "OutputValidationError";

  constructor(
    message: string,
    readonly schema: Schema,
    readonly instance: unknown,
    readonly errors: OutputUnit[]
  ) {
    super(message);
  }
}

export class RemoteExecutionError extends BusinessError {
  override name = "RemoteExecutionError";

  constructor(message: string, readonly error: JsonObject) {
    super(message);
  }
}

/**
 * Error for providing control flow for the temporary panel.
 */
export class SubmitPanelAction extends CancelError {
  override name = "SubmitPanelAction";

  // Use type and detail to match the naming of CustomEvent

  type: string;

  detail: JsonObject;

  constructor(type: string, detail: JsonObject) {
    super(`Submitted panel with action: ${type}`);
    this.type = type;
    this.detail = detail;
  }
}
