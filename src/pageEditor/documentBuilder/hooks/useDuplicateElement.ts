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

import { getIn, useFormikContext } from "formik";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import getElementCollectionName from "@/pageEditor/documentBuilder/edit/getElementCollectionName";
import { produce } from "immer";
import { useCallback } from "react";
import { isPipelineExpression } from "@/utils/expressionUtils";
import { uuidv4 } from "@/types/helpers";

/**
 * Recursively re-assign all brick instanceIds.
 * @see NormalizePipelineVisitor
 */
// Can't use NormalizePipelineVisitor because it doesn't work on an arbitrary elements in the document builder
function generateBrickInstanceIdsInPlace(obj: unknown): void {
  if (isPipelineExpression(obj)) {
    for (const brick of obj.__value__) {
      brick.instanceId = uuidv4();
      generateBrickInstanceIdsInPlace(brick);
    }
  } else if (obj && typeof obj === "object") {
    for (const value of Object.values(obj)) {
      generateBrickInstanceIdsInPlace(value);
    }
  }
}

/**
 * Hook to duplicate a Document Builder element.
 * @since 2.0.7
 */
function useDuplicateElement(documentBodyName: string) {
  const { values: formState, setValues: setFormState } =
    useFormikContext<ModComponentFormState>();

  return useCallback(
    async (elementName: string) => {
      const { collectionName, elementIndex } = getElementCollectionName(
        [documentBodyName, elementName].join("."),
      );

      // Duplicate element in the form state
      const nextState = produce(formState, (draft) => {
        const elementsCollection = getIn(draft, collectionName) as unknown[];

        // Generate new brickInstanceIds for any pipelines in the element
        // eslint-disable-next-line security/detect-object-injection -- number
        const duplicateElement = produce(
          elementsCollection[elementIndex],
          (elementDraft) => {
            generateBrickInstanceIdsInPlace(elementDraft);
          },
        );

        elementsCollection.splice(elementIndex, 0, duplicateElement);
      });

      // :shrug: can't also set the active element to the new element using editorActions.setActiveBuilderPreviewElement
      // because the element won't be available in the Redux state until the Formik state syncs.
      await setFormState(nextState);
    },
    [setFormState, formState, documentBodyName],
  );
}

export default useDuplicateElement;
