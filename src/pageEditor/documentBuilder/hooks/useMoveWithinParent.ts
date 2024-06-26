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

import useReduxState from "@/hooks/useReduxState";
import { selectNodePreviewActiveElement } from "@/pageEditor/slices/editorSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";
import { useField } from "formik";
import { type DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import getElementCollectionName from "@/pageEditor/documentBuilder/edit/getElementCollectionName";

import { joinPathParts } from "@/utils/formUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

type MoveWithinParent = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveElement: (direction: "up" | "down") => void;
};

function useMoveWithinParent(documentBodyName: string): MoveWithinParent {
  const [activeElement, setActiveElement] = useReduxState(
    selectNodePreviewActiveElement,
    actions.setNodePreviewActiveElement,
  );

  assertNotNullish(activeElement, "No active element found");

  const { collectionName, elementIndex } =
    getElementCollectionName(activeElement);

  const fullCollectionName = joinPathParts(documentBodyName, collectionName);

  const [{ value: elementsCollection }, , { setValue: setElementsCollection }] =
    useField<DocumentBuilderElement[]>(fullCollectionName);

  const canMoveUp = elementIndex > 0;
  const canMoveDown = elementIndex < elementsCollection.length - 1;

  const moveElement = async (direction: "up" | "down") => {
    const newElementsCollection = [...elementsCollection];
    const toIndex = direction === "up" ? elementIndex - 1 : elementIndex + 1;

    /* eslint-disable security/detect-object-injection -- swapping list elements  */
    [newElementsCollection[elementIndex], newElementsCollection[toIndex]] = [
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- protected by canMoveUp and canMoveDown
      newElementsCollection[toIndex]!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- protected by canMoveUp and canMoveDown
      newElementsCollection[elementIndex]!,
    ];
    /* eslint-enable security/detect-object-injection  */

    await setElementsCollection(newElementsCollection);
    setActiveElement(joinPathParts(collectionName, toIndex));
  };

  return {
    canMoveUp,
    canMoveDown,
    moveElement,
  };
}

export default useMoveWithinParent;
