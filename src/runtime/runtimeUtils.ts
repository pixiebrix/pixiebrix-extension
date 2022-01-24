/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { validateInput, validateOutput } from "@/validators/generic";
import {
  arraySchema,
  castSchema,
} from "@/components/fields/schemaFields/schemaUtils";
import { boolean, excludeUndefined } from "@/utils";
import { InputValidationError, OutputValidationError } from "@/blocks/errors";
import {
  BlockArgContext,
  IBlock,
  IExtension,
  InnerDefinitionRef,
  Logger,
  ReaderRoot,
  RegistryId,
  RenderedArgs,
} from "@/core";
import { isEmpty } from "lodash";
import { BlockConfig, BlockWindow } from "@/blocks/types";
import {
  ApiVersionOptions,
  DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
} from "@/runtime/apiVersionOptions";
import { engineRenderer } from "@/runtime/renderers";
import { mapArgs } from "@/runtime/mapArgs";
import { BusinessError } from "@/errors";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";
import { ResolvedBlockConfig } from "@/runtime/runtimeTypes";
import { $safeFind } from "@/helpers";

/**
 * Scope for inner definitions
 */
export const INNER_SCOPE = "@internal";

/**
 * @throws InputValidationError if blockArgs does not match the input schema for block
 */
// Can't use Typescript's assert return type for promises: https://github.com/microsoft/TypeScript/issues/34636
export async function throwIfInvalidInput(
  block: IBlock,
  blockArgs: RenderedArgs
): Promise<void> {
  const validationResult = await validateInput(
    castSchema(block.inputSchema),
    excludeUndefined(blockArgs)
  );
  if (!validationResult.valid) {
    // Don't need to check logValues here because this is logging to the console, not the provided logger
    // so the values won't be persisted
    console.debug("Invalid inputs for block", {
      errors: validationResult.errors,
      schema: block.inputSchema,
      blockArgs,
    });

    throw new InputValidationError(
      "Invalid inputs for block",
      block.inputSchema,
      blockArgs,
      validationResult.errors
    );
  }
}

/**
 * Log an error if `output` doesn't match the blocks outputSchema
 */
export async function logIfInvalidOutput(
  block: IBlock,
  output: unknown,
  logger: Logger,
  { window }: { window: BlockWindow }
): Promise<void> {
  if (!isEmpty(block.outputSchema)) {
    const baseSchema = castSchema(block.outputSchema);
    const validationResult = await validateOutput(
      window === "broadcast" ? arraySchema(baseSchema) : baseSchema,
      excludeUndefined(output)
    );
    if (!validationResult.valid) {
      // For now, don't halt execution on output schema violation. If the output is malformed in a way that
      // prevents the next block from executing, the input validation check will fail
      logger.error(
        new OutputValidationError(
          "Invalid outputs for block",
          block.outputSchema,
          output,
          validationResult.errors
        )
      );
    }
  }
}

/**
 * Return true if the stage should be run given the current context
 */
export async function shouldRunBlock(
  blockConfig: BlockConfig,
  context: BlockArgContext,
  { explicitRender, autoescape }: ApiVersionOptions
): Promise<boolean> {
  if (blockConfig.if !== undefined) {
    const render = explicitRender
      ? null
      : await engineRenderer(
          blockConfig.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
          { autoescape }
        );

    const { if: condition } = (await mapArgs({ if: blockConfig.if }, context, {
      implicitRender: render,
      autoescape,
    })) as { if: unknown };

    return boolean(condition);
  }

  return true;
}

/**
 * Select the root element (or document) for a block based on the current root and the block's rootMode
 * @see BlockConfig.rootMode
 * @see BlockConfig.root
 */
export function selectBlockRootElement(
  blockConfig: BlockConfig,
  defaultRoot: ReaderRoot
): ReaderRoot {
  const rootMode = blockConfig.rootMode ?? "inherit";

  let root;
  if (rootMode === "inherit") {
    root = defaultRoot;
  } else if (rootMode === "document") {
    root = document;
  } else {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
    throw new BusinessError(`Invalid rootMode: ${rootMode}`);
  }

  const $root = $(root ?? document);

  const $stageRoot = blockConfig.root
    ? $safeFind(blockConfig.root, $root)
    : $root;

  if ($stageRoot.length > 1) {
    throw new BusinessError(`Multiple roots found for ${blockConfig.root}`);
  }

  if ($stageRoot.length === 0) {
    const rootDescriptor = (defaultRoot as HTMLElement)?.tagName ?? "document";
    throw new BusinessError(
      `No roots found for ${blockConfig.root} (root=${rootDescriptor})`
    );
  }

  return $stageRoot.get(0);
}

export async function resolveBlockConfig(
  config: BlockConfig
): Promise<ResolvedBlockConfig> {
  const block = await blockRegistry.lookup(config.id);
  return {
    config,
    block,
    type: await getType(block),
  };
}

export function isInnerExtensionPoint(
  id: RegistryId | InnerDefinitionRef
): boolean {
  return id.startsWith(INNER_SCOPE + "/");
}

export function assertExtensionNotResolved<T extends IExtension>(
  extension: IExtension
): asserts extension is T & {
  _unresolvedExtensionBrand: never;
} {
  if (isInnerExtensionPoint(extension.extensionPointId)) {
    throw new Error("Expected UnresolvedExtension");
  }
}
