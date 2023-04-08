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

import { validateInput, validateOutput } from "@/validators/generic";
import {
  arraySchema,
  castSchema,
} from "@/components/fields/schemaFields/schemaUtils";
import { boolean, excludeUndefined } from "@/utils";
import { InputValidationError, OutputValidationError } from "@/blocks/errors";
import { isEmpty } from "lodash";
import { type BlockConfig, type BlockWindow } from "@/blocks/types";
import {
  type ApiVersionOptions,
  DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
} from "@/runtime/apiVersionOptions";
import { engineRenderer } from "@/runtime/renderers";
import { mapArgs } from "@/runtime/mapArgs";
import { $safeFind } from "@/helpers";
import { isInnerExtensionPoint } from "@/registry/internal";
import { BusinessError } from "@/errors/businessErrors";
import { validateUUID } from "@/types/helpers";
import { getElementForReference } from "@/contentScript/elementReference";
import { IBlock } from "@/types/blockTypes";
import { Logger } from "@/types/loggerTypes";
import {
  BlockArgContext,
  ElementReference,
  ReaderRoot,
  RenderedArgs,
} from "@/types/runtimeTypes";
import { IExtension } from "@/types/extensionTypes";

/**
 * @throws InputValidationError if blockArgs does not match the input schema for block
 */
// Can't use TypeScript's assert return type for promises: https://github.com/microsoft/TypeScript/issues/34636
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
 * Helper method to render a top-level field of blockConfig.
 */
async function renderConfigOption(
  blockConfig: BlockConfig,
  context: BlockArgContext,
  fieldName: keyof BlockConfig,
  {
    explicitRender,
    autoescape,
  }: Pick<ApiVersionOptions, "explicitRender" | "autoescape">
): Promise<unknown> {
  const render = explicitRender
    ? null
    : engineRenderer(
        blockConfig.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
        { autoescape }
      );

  const { value } = (await mapArgs({ value: blockConfig[fieldName] }, context, {
    implicitRender: render,
    autoescape,
  })) as { value: unknown };

  return value;
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
    const condition = await renderConfigOption(blockConfig, context, "if", {
      explicitRender,
      autoescape,
    });
    return boolean(condition);
  }

  return true;
}

/**
 * Select the root element (or document) for a block based on the current root and the block's rootMode
 * @see BlockConfig.rootMode
 * @see BlockConfig.root
 */
export async function selectBlockRootElement(
  blockConfig: BlockConfig,
  defaultRoot: ReaderRoot,
  context: BlockArgContext,
  { explicitRender, autoescape }: ApiVersionOptions
): Promise<ReaderRoot> {
  const rootMode = blockConfig.rootMode ?? "inherit";

  let root;

  switch (rootMode) {
    case "inherit": {
      root = defaultRoot;
      break;
    }

    case "document": {
      root = document;
      break;
    }

    case "element": {
      if (blockConfig.root == null) {
        throw new BusinessError("No element reference provided");
      }

      const unvalidatedRootReference = await renderConfigOption(
        blockConfig,
        context,
        "root",
        { explicitRender, autoescape }
      );

      let ref;
      try {
        ref = validateUUID(unvalidatedRootReference);
      } catch {
        console.warn(
          "Invalid element reference provided: %s",
          blockConfig.root
        );
        throw new BusinessError("Invalid element reference provided");
      }

      root = getElementForReference(ref as ElementReference);
      break;
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check
      throw new BusinessError(`Invalid rootMode: ${rootMode}`);
    }
  }

  const $root = $(root ?? document);

  // Passing a selector for root is an old behavior from when the rootModes were just inherit and document
  if (
    typeof blockConfig.root === "string" &&
    blockConfig.rootMode !== "element"
  ) {
    const $stageRoot = $safeFind(blockConfig.root, $root);

    if ($stageRoot.length > 1) {
      throw new BusinessError(`Multiple roots found for ${blockConfig.root}`);
    }

    if ($stageRoot.length === 0) {
      const rootDescriptor =
        (defaultRoot as HTMLElement)?.tagName ?? "document";
      throw new BusinessError(
        `No roots found for ${blockConfig.root} (root=${rootDescriptor})`
      );
    }

    return $stageRoot.get(0);
  }

  return $root.get(0);
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
