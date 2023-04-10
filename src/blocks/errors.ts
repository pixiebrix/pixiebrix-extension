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
import { type OutputUnit } from "@cfworker/json-schema";
import { type BlockConfig, type BlockPipeline } from "@/blocks/types";
import { type JsonObject } from "type-fest";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { type MessageContext } from "@/types/loggerTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type Schema } from "@/types/schemaTypes";

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
 * Throwable for providing control flow for the temporary panel.
 *
 * Like "CancelError", it is not an error, but needs to subclass Error for our exceptional control flow to work.
 *
 * Uses type and detail fields to match the CustomEvent interface.
 *
 * @see CustomEvent
 */
export class SubmitPanelAction extends CancelError {
  override name = "SubmitPanelAction";

  /**
   * Create a throwable action for a temporary panel that resolves the panel.
   * @param type A custom action type to resolve the panel with, e.g., "submit" or "cancel".
   * @param detail Extra data to resolve the panel with.
   */
  constructor(readonly type: string, readonly detail: JsonObject = {}) {
    super(`Submitted panel with action: ${type}`);
  }
}

/**
 * Cancel out of panel, and throw an error from the brick that showed the panel.
 *
 * Corresponds to a user clicking "skip" on a tour.
 *
 * @see TourStepTransformer
 */
export class AbortPanelAction extends CancelError {
  override name = "AbortPanelAction";
}

/**
 * Cancel out of a panel, because the user clicked the "close" button.
 */
export class ClosePanelAction extends CancelError {
  override name = "ClosePanelAction";
}
