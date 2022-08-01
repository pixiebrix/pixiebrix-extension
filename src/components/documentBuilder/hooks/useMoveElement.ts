/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { TreeDestinationPosition, TreeSourcePosition } from "@atlaskit/tree";
import { produce } from "immer";
import { getIn, useField } from "formik";
import { getAllowedChildTypes } from "@/components/documentBuilder/allowedElementTypes";
import { useCallback } from "react";
import useReduxState from "@/hooks/useReduxState";
import { selectNodePreviewActiveElement } from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

// https://stackoverflow.com/a/6470794/402560
export function arrayMove(
  array: unknown[],
  fromIndex: number,
  toIndex: number
): void {
  const element = array.at(fromIndex);
  array.splice(fromIndex, 1);
  array.splice(toIndex, 0, element);
}

export function acceptDrop(
  element: DocumentElement,
  parentElement: DocumentElement
): boolean {
  return getAllowedChildTypes(parentElement).includes(element.type);
}

export function moveElement(
  body: DocumentElement[],
  source: TreeSourcePosition,
  destination: TreeDestinationPosition
): DocumentElement[] {
  return produce(body, (draft) => {
    const sourceParent = getIn(draft, source.parentId as string);
    const destinationParent = getIn(draft, destination.parentId as string);

    const element = sourceParent.children[source.index];

    if (!acceptDrop(element, destinationParent)) {
      console.warn(
        "Destination element does not support drop: %s for %s",
        destinationParent.type,
        element.type,
        {
          sourceParent,
          destinationParent,
        }
      );
      return;
    }

    if (sourceParent === destinationParent) {
      console.debug("moveElement within same parent", {
        sourceParent,
        destinationParent,
        source,
        destination,
      });

      const children = [...sourceParent.children];
      arrayMove(children, source.index, destination.index);
      sourceParent.children = children;
      return;
    }

    console.debug("moveElement across parents", {
      sourceParent,
      destinationParent,
      source,
      destination,
    });

    getIn(sourceParent, "children").splice(source.index, 1);
    getIn(destinationParent, "children").splice(destination.index, 0, element);
  });
}

function useMoveElement(documentBodyName: string) {
  const [{ value: body }, , { setValue }] =
    useField<DocumentElement[]>(documentBodyName);

  const [, setActiveElement] = useReduxState(
    selectNodePreviewActiveElement,
    editorActions.setNodePreviewActiveElement
  );

  return useCallback(
    (
      sourcePosition: TreeSourcePosition,
      destinationPosition?: TreeDestinationPosition
    ) => {
      // For now, just clear out the active element to ensure the active elementName is valid in the new tree
      setActiveElement(null);

      setValue(moveElement(body, sourcePosition, destinationPosition));
    },
    [body, setValue, setActiveElement]
  );
}

export default useMoveElement;
