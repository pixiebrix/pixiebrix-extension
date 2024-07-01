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

import type {
  ButtonFormState,
  ModComponentFormState,
  TriggerFormState,
} from "@/pageEditor/starterBricks/formStateTypes";
import { AnalysisVisitorWithResolvedBricksABC } from "@/analysis/analysisVisitors/baseAnalysisVisitors";
import { isNativeCssSelector, isValidSelector } from "@/utils/domUtils";
import { AnnotationType } from "@/types/annotationTypes";
import { isEmpty } from "lodash";
import pluralize from "@/utils/pluralize";
import type { BrickConfig, BrickPosition } from "@/bricks/types";
import { nestedPosition, type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import { inputProperties } from "@/utils/schemaUtils";
import { castTextLiteralOrThrow } from "@/utils/expressionUtils";
import { guessUsefulness } from "@/utils/detectRandomString";
import type { Schema } from "@/types/schemaTypes";
import { isObject } from "@/utils/objectUtils";
import { assertNotNullish } from "@/utils/nullishUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

// `jQuery` selector extension: https://api.jquery.com/category/selectors/jquery-selector-extensions/
const jQueryExtensions = new Set([
  ":animated",
  ":button",
  ":checkbox",
  ":contains",
  ":eq",
  ":even",
  ":file",
  ":first",
  ":gt",
  ":header",
  ":hidden",
  ":image",
  ":input",
  ":last",
  ":lt",
  ":odd",
  ":parent",
  ":password",
  ":radio",
  ":reset",
  ":selected",
  ":submit",
  ":text",
  ":visible",
]);

/**
 * Returns all jQuery extensions in the given selector.
 */
export function findJQueryExtensions(selector: string): string[] {
  // Could try to use $.find.tokenize, but IMO it's not worth figuring out how to recursively parse/tokenize.
  // The only case where string matching would report false positives is if the jQuery extension is in a
  // string (e.g., within a :contains selector or an attribute selector)
  return [...jQueryExtensions.values()].filter((ext) => selector.includes(ext));
}

const INVALID_SELECTOR_MESSAGE = "Invalid selector.";

/**
 * Analysis that detects bad or potentially bad selectors.
 *
 * Currently detected:
 * - Invalid selectors
 * - Non-native selector that might slow down the page
 * - Random selector, e.g., CSS module selector
 *
 * Future work:
 * - Structural selectors
 */
class SelectorAnalysis extends AnalysisVisitorWithResolvedBricksABC {
  override id = "selector";

  override async run(component: ModComponentFormState): Promise<void> {
    switch (component.type) {
      case StarterBrickTypes.BUTTON: {
        this.checkAction(component);
        break;
      }

      case StarterBrickTypes.TRIGGER: {
        this.checkTrigger(component);
        break;
      }

      default:
    }

    await super.run(component);
  }

  checkAction(component: ButtonFormState): void {
    const selector = component.extensionPoint.definition.containerSelector;

    const position = {
      path: "extensionPoint.definition.containerSelector",
    };

    if (!isEmpty(selector)) {
      this.visitSelector({
        position,
        selector,
      });

      if (!isValidSelector(selector)) {
        return;
      }

      if (!isNativeCssSelector(selector)) {
        const matches = findJQueryExtensions(selector);
        const isWatch =
          component.extensionPoint.definition.attachMode === "watch";

        let message = isWatch
          ? "Using a non-native CSS selector for location in watch mode. Button location selectors that use jQuery extensions may slow down the page."
          : "Using a non-native CSS selector for location. Button location selectors that use jQuery extensions may slow down the page if the element is not available on page load.";

        if (matches.length > 0) {
          message += ` JQuery ${pluralize(
            matches.length,
            "extension",
          )} found: ${matches.join(", ")}`;
        }

        this.annotations.push({
          analysisId: this.id,
          position,
          message,
          type: isWatch ? AnnotationType.Warning : AnnotationType.Info,
        });
      }
    }
  }

  checkTrigger(component: TriggerFormState): void {
    const selector = component.extensionPoint.definition.rootSelector;

    const position = {
      path: "extensionPoint.definition.rootSelector",
    };

    if (selector) {
      this.visitSelector({
        position,
        selector,
      });

      if (!isValidSelector(selector)) {
        return;
      }

      if (!isNativeCssSelector(selector)) {
        const matches = findJQueryExtensions(selector);
        const isWatch =
          component.extensionPoint.definition.attachMode === "watch";

        let message = isWatch
          ? "Using a non-native CSS selector in watch mode. Watching selectors that use jQuery extensions may slow down the page."
          : "Using a non-native CSS selector. Trigger selectors that use jQuery extensions may slow down the page if the element is not available on page load.";

        if (matches.length > 0) {
          message += ` JQuery ${pluralize(
            matches.length,
            "extension",
          )} found: ${matches.join(", ")}`;
        }

        this.annotations.push({
          analysisId: this.id,
          position,
          message,
          type: isWatch ? AnnotationType.Warning : AnnotationType.Info,
        });
      }
    }
  }

  visitSelector({
    position,
    selector,
  }: {
    position: BrickPosition;
    selector: string;
  }) {
    if (!isValidSelector(selector)) {
      this.annotations.push({
        position,
        message: INVALID_SELECTOR_MESSAGE,
        analysisId: this.id,
        type: AnnotationType.Error,
      });
    }

    const usefulness = guessUsefulness(selector);

    if (usefulness.isRandom) {
      this.annotations.push({
        position,
        message:
          "Selector appears to contain generated or utility values. This may indicate a value that changes across page reloads or application updates.",
        analysisId: this.id,
        type: AnnotationType.Warning,
      });
    }
  }

  visitValue(position: BrickPosition, value: unknown, schema: Schema): void {
    if (schema.format !== "selector") {
      return;
    }

    let selector;

    try {
      selector = castTextLiteralOrThrow(value);
    } catch {
      return;
    }

    assertNotNullish(selector, "Selector is null.");

    this.visitSelector({
      position,
      selector,
    });
  }

  visitConfig(position: BrickPosition, config: unknown, schema: Schema): void {
    if (
      schema.type === "array" &&
      Array.isArray(config) &&
      typeof schema.items === "object" &&
      !Array.isArray(schema.items)
    ) {
      for (const [index, item] of config.entries()) {
        this.visitConfig(
          nestedPosition(position, index.toString()),
          item,
          schema.items,
        );
      }
    }

    for (const subSchema of schema.oneOf ??
      schema.anyOf ??
      schema.allOf ??
      []) {
      // Checking each individually isn't 100% correct for oneOf/anyOf. There could be a schema where the same prop
      // is a selector in one schema, but is allowed to be any string in another schema. In practice, there shouldn't
      // be any cases with different formats in different sub-schemas.
      if (typeof subSchema !== "boolean") {
        this.visitConfig(position, config, subSchema);
      }
    }

    if (schema.type === "string") {
      this.visitValue(position, config, schema);
      return;
    }

    if (schema.type !== "object" || !isObject(config)) {
      return;
    }

    const visitedPropNames = new Set();

    for (const [prop, definition] of Object.entries(inputProperties(schema))) {
      // eslint-disable-next-line security/detect-object-injection -- from JSONSchema
      const value = config[prop];

      if (typeof definition === "boolean") {
        continue;
      }

      this.visitConfig(nestedPosition(position, prop), value, definition);

      visitedPropNames.add(prop);
    }

    if (typeof schema.additionalProperties === "object") {
      for (const [prop, value] of Object.entries(config)) {
        if (!visitedPropNames.has(prop)) {
          this.visitConfig(
            nestedPosition(position, prop),
            value,
            schema.additionalProperties,
          );
        }
      }
    }
  }

  override visitBrick(
    position: BrickPosition,
    brickConfig: BrickConfig,
    _extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, brickConfig, _extra);

    let brick;

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- wrapped in try/catch
      brick = this.allBlocks.get(brickConfig.id)!.block;
    } catch {
      return;
    }

    this.visitConfig(
      nestedPosition(position, "config"),
      brickConfig.config,
      brick.inputSchema,
    );
  }
}

export default SelectorAnalysis;
