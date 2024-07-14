/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { validateBrickInputOutput } from "@/validators/schemaValidator";
import {
  arraySchema,
  castSchema,
} from "@/components/fields/schemaFields/schemaUtils";
import { InputValidationError, OutputValidationError } from "@/bricks/errors";
import { isEmpty } from "lodash";
import {
  type BrickCondition,
  type BrickConfig,
  type BrickWindow,
  hasMultipleTargets,
} from "@/bricks/types";
import {
  type ApiVersionOptions,
  DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
} from "@/runtime/apiVersionOptions";
import { engineRenderer } from "@/runtime/renderers";
import { mapArgs } from "@/runtime/mapArgs";
import { BusinessError } from "@/errors/businessErrors";
import { isInnerDefinitionRegistryId, validateUUID } from "@/types/helpers";
import { getElementForReference } from "@/contentScript/elementReference";
import { type Brick } from "@/types/brickTypes";
import { type Logger } from "@/types/loggerTypes";
import {
  type ApiVersion,
  type BrickArgsContext,
  type ElementReference,
  type RenderedArgs,
  type SelectorRoot,
} from "@/types/runtimeTypes";
import {
  type ModComponentBase,
  type SerializedModComponent,
} from "@/types/modComponentTypes";
import { excludeUndefined } from "@/utils/objectUtils";
import { boolean } from "@/utils/typeUtils";
import { $safeFind } from "@/utils/domUtils";
import {
  castTextLiteralOrThrow,
  isExpression,
  isTextLiteralOrNull,
} from "@/utils/expressionUtils";
import { Nullishable } from "@/utils/nullishUtils";

/**
 * @throws InputValidationError if brickArgs does not match the input schema for brick
 */
// Can't use TypeScript's assert return type for promises: https://github.com/microsoft/TypeScript/issues/34636
export async function throwIfInvalidInput(
  brick: Brick,
  brickArgs?: RenderedArgs,
): Promise<void> {
  const validationResult = await validateBrickInputOutput(
    castSchema(brick.inputSchema),
    excludeUndefined(brickArgs),
  );
  if (!validationResult.valid) {
    // Don't need to check logValues here because this is logging to the console, not the provided logger
    // so the values won't be persisted
    console.debug("Invalid inputs for brick", {
      errors: validationResult.errors,
      schema: brick.inputSchema,
      brickArgs,
    });

    throw new InputValidationError(
      "Invalid inputs for brick",
      brick.inputSchema,
      brickArgs,
      validationResult.errors,
    );
  }
}

/**
 * Log an error if `output` doesn't match the bricks outputSchema
 */
export async function logIfInvalidOutput(
  brick: Brick,
  output: unknown,
  logger: Logger,
  { window }: { window?: BrickWindow },
): Promise<void> {
  if (!isEmpty(brick.outputSchema)) {
    const baseSchema = castSchema(brick.outputSchema);
    const validationResult = await validateBrickInputOutput(
      hasMultipleTargets(window) ? arraySchema(baseSchema) : baseSchema,
      excludeUndefined(output),
    );
    if (!validationResult.valid) {
      // For now, don't halt execution on output schema violation. If the output is malformed in a way that
      // prevents the next brick from executing, the input validation check will fail
      logger.error(
        new OutputValidationError(
          "Invalid outputs for brick",
          brick.outputSchema,
          output,
          validationResult.errors,
        ),
      );
    }
  }
}

/**
 * Helper method to render a top-level field of brickConfig.
 */
async function renderConfigOption(
  brickConfig: BrickConfig,
  context: BrickArgsContext,
  fieldName: keyof BrickConfig,
  {
    explicitRender,
    autoescape,
  }: Pick<ApiVersionOptions, "explicitRender" | "autoescape">,
): Promise<unknown> {
  const render = explicitRender
    ? null
    : engineRenderer(
        brickConfig.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
        { autoescape },
      );

  const { value } = (await mapArgs({ value: brickConfig[fieldName] }, context, {
    implicitRender: render,
    autoescape,
  })) as { value: unknown };

  return value;
}

/**
 * Returns the boolean value of a constant condition, or undefined if the condition is not a constant.
 * @param condition the brick condition
 * @see BrickConfig.if
 */
export function castConstantCondition(
  condition: Nullishable<BrickCondition>,
): boolean | undefined {
  if (condition == null) {
    return undefined;
  }

  if (isTextLiteralOrNull(condition)) {
    const text = castTextLiteralOrThrow(condition);
    return boolean(text);
  }

  const value = isExpression(condition) ? condition.__value__ : condition;

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return undefined;
}

/**
 * Return true if the stage should be run given the current context
 */
export async function shouldRunBrick(
  brickConfig: BrickConfig,
  context: BrickArgsContext,
  { explicitRender, autoescape }: ApiVersionOptions,
): Promise<boolean> {
  if (brickConfig.if !== undefined) {
    const condition = await renderConfigOption(brickConfig, context, "if", {
      explicitRender,
      autoescape,
    });
    return boolean(condition);
  }

  return true;
}

/**
 * Select the root element (or document) for a brick based on the current root and the brick's rootMode
 * @see BrickConfig.rootMode
 * @see BrickConfig.root
 */
export async function selectBrickRootElement(
  brickConfig: BrickConfig,
  defaultRoot: SelectorRoot,
  context: BrickArgsContext,
  { explicitRender, autoescape }: ApiVersionOptions,
): Promise<SelectorRoot> {
  const rootMode = brickConfig.rootMode ?? "inherit";

  let root: HTMLElement | Document = document;

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
      if (brickConfig.root == null) {
        throw new BusinessError("No element reference provided");
      }

      const unvalidatedRootReference = await renderConfigOption(
        brickConfig,
        context,
        "root",
        { explicitRender, autoescape },
      );

      let ref;
      try {
        ref = validateUUID(unvalidatedRootReference);
      } catch {
        console.warn(
          "Invalid element reference provided: %s",
          brickConfig.root,
        );
        throw new BusinessError("Invalid element reference provided");
      }

      root = getElementForReference(ref as ElementReference);
      break;
    }

    default: {
      const exhaustiveCheck: never = rootMode;
      throw new BusinessError(`Invalid rootMode: ${exhaustiveCheck}`);
    }
  }

  // Passing a selector for root is an old behavior from when the rootModes were just inherit and document
  if (
    typeof brickConfig.root !== "string" ||
    brickConfig.rootMode === "element"
  ) {
    return root;
  }

  const [stageRoot, multipleStageRoots] = $safeFind(brickConfig.root, root);

  if (multipleStageRoots) {
    throw new BusinessError(`Multiple roots found for ${brickConfig.root}`);
  }

  if (stageRoot) {
    return stageRoot;
  }

  const rootDescriptor = (defaultRoot as HTMLElement)?.tagName ?? "document";
  throw new BusinessError(
    `No roots found for ${brickConfig.root} (root=${rootDescriptor})`,
  );
}

export function assertModComponentNotResolved<
  Config extends UnknownObject = UnknownObject,
>(
  modComponent: ModComponentBase<Config>,
): asserts modComponent is SerializedModComponent<Config> {
  if (isInnerDefinitionRegistryId(modComponent.extensionPointId)) {
    throw new Error("Expected SerializedModComponent");
  }
}

export function isApiVersionAtLeast(
  is: ApiVersion,
  atLeast: ApiVersion,
): boolean {
  const isNum = Number(is.slice(1));
  const atLeastNum = Number(atLeast.slice(1));

  return isNum >= atLeastNum;
}
