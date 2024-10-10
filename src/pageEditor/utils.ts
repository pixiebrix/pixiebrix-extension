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

import { type BrickConfig } from "@/bricks/types";
import ForEach from "@/bricks/transformers/controlFlow/ForEach";
import TryExcept from "@/bricks/transformers/controlFlow/TryExcept";
import {
  type DocumentBuilderElement,
  isButtonElement,
  isListElement,
  isPipelineElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import ForEachElement from "@/bricks/transformers/controlFlow/ForEachElement";
import { castArray, pick, pickBy } from "lodash";
import { type AnalysisAnnotation } from "@/analysis/analysisTypes";
import { PIPELINE_BRICKS_FIELD_NAME } from "./consts";
import { type ModMetadata } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { sortedFields } from "@/components/fields/schemaFields/schemaFieldUtils";
import { castTextLiteralOrThrow } from "@/utils/expressionUtils";
import { inputProperties } from "@/utils/schemaUtils";
import { joinPathParts } from "@/utils/formUtils";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import MapValues from "@/bricks/transformers/controlFlow/MapValues";
import AddDynamicTextSnippet from "@/bricks/effects/AddDynamicTextSnippet";
import { type PackageUpsertResponse } from "@/types/contract";
import { type UnsavedModDefinition } from "@/types/modDefinitionTypes";

export function mapModDefinitionUpsertResponseToModMetadata(
  unsavedModDefinition: UnsavedModDefinition,
  response: PackageUpsertResponse,
): ModMetadata {
  return {
    ...unsavedModDefinition.metadata,
    sharing: pick(response, ["public", "organizations"]),
    ...pick(response, ["updated_at"]),
  };
}

/**
 * Return pipeline prop names for a configured brick.
 *
 * Returns prop names in the order they should be displayed in the layout.
 *
 * @param brick the brick, or null if resolved brick not available yet
 * @param brickConfig the brick configuration
 *
 * @see PipelineToggleField
 */
export function getPipelinePropNames(
  brick: Brick | undefined,
  brickConfig: BrickConfig,
): string[] {
  switch (brickConfig.id) {
    // Special handling for tour step to avoid clutter and input type alternatives
    case CustomFormRenderer.BRICK_ID: {
      const propNames = [];

      // Only show onSubmit if it's provided, to avoid cluttering the UI
      if (brickConfig.config.onSubmit != null) {
        propNames.push("onSubmit");
      }

      return propNames;
    }

    default: {
      if (brick == null) {
        return [];
      }

      const pipelineProperties = pickBy(
        inputProperties(brick.inputSchema),
        (value) =>
          typeof value === "object" &&
          value.$ref === "https://app.pixiebrix.com/schemas/pipeline#",
      );

      return sortedFields(pipelineProperties, brick.uiSchema, {
        includePipelines: true,
        // JS control flow bricks don't define a uiSchema
        preserveSchemaOrder: true,
      }).map((x) => x.prop);
    }
  }
}

/**
 * Returns the variable name passed to a pipeline.
 * @param brickConfig the brick configuration
 * @param pipelinePropName the query pipelinePropName
 */
export function getVariableKeyForSubPipeline(
  brickConfig: BrickConfig,
  pipelinePropName: string,
  // NOTE: does not return an OutputKey because a user-entered value may not be a valid OutputKey at this point
): string | null {
  let keyPropName: string | null = null;

  if (
    [ForEach.BRICK_ID, ForEachElement.BRICK_ID, MapValues.BRICK_ID].includes(
      brickConfig.id,
    ) &&
    pipelinePropName === "body"
  ) {
    keyPropName = "elementKey";
  }

  if (brickConfig.id === TryExcept.BRICK_ID && pipelinePropName === "except") {
    keyPropName = "errorKey";
  }

  if (
    brickConfig.id === CustomFormRenderer.BRICK_ID &&
    pipelinePropName === "onSubmit"
  ) {
    // We currently don't allow the user to rename the variable for the onSubmit pipeline because it'd add another
    // option to an already cluttered UI.
    return CustomFormRenderer.ON_SUBMIT_VARIABLE_NAME;
  }

  if (
    brickConfig.id === AddDynamicTextSnippet.BRICK_ID &&
    pipelinePropName === "generate"
  ) {
    return AddDynamicTextSnippet.DEFAULT_PIPELINE_VAR;
  }

  if (!keyPropName) {
    return null;
  }

  // eslint-disable-next-line security/detect-object-injection -- is from user input, but extracting string
  const keyValue = brickConfig.config[keyPropName];

  if (!keyValue) {
    return null;
  }

  try {
    return castTextLiteralOrThrow(keyValue);
  } catch {
    return null;
  }
}

/**
 * Returns Formik path names to pipeline expressions
 * @param parentPath the parent Formik path
 * @param documentBuilderElements the document element or elements
 */
function getDocumentBuilderElementsPipelinePropNames(
  parentPath: string,
  documentBuilderElements: DocumentBuilderElement | DocumentBuilderElement[],
): string[] {
  const isArray = Array.isArray(documentBuilderElements);

  const propNames: string[] = [];
  for (const [elementIndex, documentBuilderElement] of Object.entries(
    castArray(documentBuilderElements),
  )) {
    const index = isArray ? elementIndex : null;

    if (isButtonElement(documentBuilderElement)) {
      propNames.push(joinPathParts(parentPath, index, "config", "onClick"));
    } else if (isPipelineElement(documentBuilderElement)) {
      propNames.push(joinPathParts(parentPath, index, "config", "pipeline"));
    } else if (isListElement(documentBuilderElement)) {
      propNames.push(
        ...getDocumentBuilderElementsPipelinePropNames(
          joinPathParts(parentPath, index, "config", "element", "__value__"),
          documentBuilderElement.config.element.__value__,
        ),
      );
    } else if (documentBuilderElement.children?.length) {
      propNames.push(
        ...getDocumentBuilderElementsPipelinePropNames(
          joinPathParts(parentPath, index, "children"),
          documentBuilderElement.children,
        ),
      );
    }
  }

  return propNames;
}

export function getDocumentBuilderPipelinePaths(
  brickConfig: BrickConfig,
): string[] {
  return getDocumentBuilderElementsPipelinePropNames(
    "config.body",
    (brickConfig.config.body ?? []) as DocumentBuilderElement[],
  );
}

export function filterStarterBrickAnalysisAnnotations(
  annotations: AnalysisAnnotation[],
): AnalysisAnnotation[] {
  return annotations.filter(
    (annotation) =>
      !annotation.position.path.startsWith(PIPELINE_BRICKS_FIELD_NAME),
  );
}

export function filterAnnotationsByBrickPath(
  annotations: AnalysisAnnotation[],
  brickPath: string,
): AnalysisAnnotation[] {
  const pathLength = brickPath.length;

  const relatedAnnotations = annotations.filter((annotation) =>
    annotation.position.path.startsWith(brickPath),
  );

  return relatedAnnotations.filter((annotation) => {
    const restPath = annotation.position.path.slice(pathLength);
    // XXX: this may be not a reliable way to determine if the annotation
    // is owned by the brick or its sub pipeline.
    // It assumes that it's only the pipeline field that can have a ".__value__" followed by "." in the path,
    // and a pipeline field always has this pattern in its path.
    return !restPath.includes(".__value__.");
  });
}

export function selectPageEditorDimensions() {
  return {
    pageEditorWidth: window.innerWidth,
    pageEditorHeight: window.innerHeight,
    pageEditorOrientation:
      window.innerWidth > window.innerHeight ? "landscape" : "portrait",
  };
}
