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

import { type ModComponentFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { isModComponentBase } from "@/pageEditor/sidebar/common";
import { type BrickConfig } from "@/blocks/types";
import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import TryExcept from "@/blocks/transformers/controlFlow/TryExcept";
import {
  type DocumentElement,
  isButtonElement,
  isListElement,
  isPipelineElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import { joinPathParts } from "@/utils";
import ForEachElement from "@/blocks/transformers/controlFlow/ForEachElement";
import { castArray, pickBy } from "lodash";
import { type AnalysisAnnotation } from "@/analysis/analysisTypes";
import { PIPELINE_BLOCKS_FIELD_NAME } from "./consts";
import { expectContext } from "@/utils/expectContext";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import TourStepTransformer from "@/blocks/transformers/tourStep/tourStep";
import { type Target } from "@/types/messengerTypes";
import { type ModComponentBase } from "@/types/extensionTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type Brick } from "@/types/brickTypes";
import { inputProperties } from "@/helpers";
import { sortedFields } from "@/components/fields/schemaFields/schemaFieldUtils";
import { isExpression, isPipelineExpression } from "@/utils/expressionUtils";

export async function getCurrentURL(): Promise<string> {
  expectContext("devTools");

  const tab = await browser.tabs.get(chrome.devtools.inspectedWindow.tabId);
  return tab.url;
}

/**
 * Message target for the tab being inspected by the devtools.
 *
 * The Page Editor only supports editing the top-level frame.
 */
export const thisTab: Target = {
  // This code might end up (unused) in non-dev bundles, so use `?.` to avoid errors from undefined values
  tabId: globalThis.chrome?.devtools?.inspectedWindow?.tabId ?? 0,
  // The top-level frame
  frameId: 0,
};

export function getIdForElement(
  element: ModComponentBase | ModComponentFormState
): UUID {
  return isModComponentBase(element) ? element.id : element.uuid;
}

export function getRecipeIdForElement(
  element: ModComponentBase | ModComponentFormState
): RegistryId {
  return isModComponentBase(element) ? element._recipe?.id : element.recipe?.id;
}

export function getRecipeById(
  recipes: ModDefinition[],
  id: RegistryId
): ModDefinition | undefined {
  return recipes.find((recipe) => recipe.metadata.id === id);
}

/**
 * Return pipeline prop names for a configured block.
 *
 * Returns prop names in the order they should be displayed in the layout.
 *
 * @param block the block, or null if resolved block not available yet
 * @param blockConfig the block configuration
 */
export function getPipelinePropNames(
  block: Brick | null,
  blockConfig: BrickConfig
): string[] {
  switch (blockConfig.id) {
    // Special handling for tour step to avoid clutter and input type alternatives
    case TourStepTransformer.BLOCK_ID: {
      const propNames = [];

      // Only show onBeforeShow if it's provided, to avoid cluttering the UI
      if (blockConfig.config.onBeforeShow != null) {
        propNames.push("onBeforeShow");
      }

      // `body` can be a markdown value, or a pipeline
      if (isPipelineExpression(blockConfig.config.body)) {
        propNames.push("body");
      }

      // Only show onAfterShow if it's provided, to avoid cluttering the UI
      if (blockConfig.config.onAfterShow != null) {
        propNames.push("onAfterShow");
      }

      return propNames;
    }

    default: {
      if (block == null) {
        return [];
      }

      const pipelineProperties = pickBy(
        inputProperties(block.inputSchema),
        (value) =>
          typeof value === "object" &&
          value.$ref === "https://app.pixiebrix.com/schemas/pipeline#"
      );

      return sortedFields(pipelineProperties, block.uiSchema, {
        includePipelines: true,
        // JS control flow bricks don't define a uiSchema
        preserveSchemaOrder: true,
      }).map((x) => x.prop);
    }
  }
}

export function getVariableKeyForSubPipeline(
  blockConfig: BrickConfig,
  pipelinePropName: string
): string | null {
  let keyPropName: string = null;

  if (
    [ForEach.BLOCK_ID, ForEachElement.BLOCK_ID].includes(blockConfig.id) &&
    pipelinePropName === "body"
  ) {
    keyPropName = "elementKey";
  }

  if (blockConfig.id === TryExcept.BLOCK_ID && pipelinePropName === "except") {
    keyPropName = "errorKey";
  }

  if (!keyPropName) {
    return null;
  }

  // eslint-disable-next-line security/detect-object-injection -- not from user input
  const keyValue = blockConfig.config[keyPropName];

  if (!keyValue) {
    return null;
  }

  const realValue = isExpression(keyValue) ? keyValue.__value__ : keyValue;

  return realValue as string;
}

/**
 * Returns Formik path names to pipeline expressions
 * @param parentPath the parent Formik path
 * @param elements the document element or elements
 */
function getElementsPipelinePropNames(
  parentPath: string,
  elements: DocumentElement | DocumentElement[]
): string[] {
  const isArray = Array.isArray(elements);

  const propNames: string[] = [];
  for (const [elementIndex, element] of Object.entries(castArray(elements))) {
    const index = isArray ? elementIndex : null;

    if (isButtonElement(element)) {
      propNames.push(joinPathParts(parentPath, index, "config", "onClick"));
    } else if (isPipelineElement(element)) {
      propNames.push(joinPathParts(parentPath, index, "config", "pipeline"));
    } else if (isListElement(element)) {
      propNames.push(
        ...getElementsPipelinePropNames(
          joinPathParts(parentPath, index, "config", "element", "__value__"),
          element.config.element.__value__
        )
      );
    } else if (element.children?.length > 0) {
      propNames.push(
        ...getElementsPipelinePropNames(
          joinPathParts(parentPath, index, "children"),
          element.children
        )
      );
    }
  }

  return propNames;
}

export function getDocumentPipelinePaths(block: BrickConfig): string[] {
  return getElementsPipelinePropNames(
    "config.body",
    (block.config.body ?? []) as DocumentElement[]
  );
}

export function getFoundationNodeAnnotations(
  annotations: AnalysisAnnotation[]
): AnalysisAnnotation[] {
  return annotations.filter(
    (annotation) =>
      !annotation.position.path.startsWith(PIPELINE_BLOCKS_FIELD_NAME)
  );
}

export function getBlockAnnotations(
  blockPath: string,
  annotations: AnalysisAnnotation[]
): AnalysisAnnotation[] {
  const pathLength = blockPath.length;

  const relatedAnnotations = annotations.filter((annotation) =>
    annotation.position.path.startsWith(blockPath)
  );

  return relatedAnnotations.filter((annotation) => {
    const restPath = annotation.position.path.slice(pathLength);
    // XXX: this may be not a reliable way to determine if the annotation
    // is owned by the block or its sub pipeline.
    // It assumes that it's only the pipeline field that can have a ".__value__" followed by "." in the path,
    // and a pipeline field always has this pattern in its path.
    return !restPath.includes(".__value__.");
  });
}
