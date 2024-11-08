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

import { type DocumentBuilderElement } from "../documentBuilderTypes";
import {
  type TreeDestinationPosition,
  type TreeSourcePosition,
} from "@atlaskit/tree";
import { produce } from "immer";
import { getIn, useField } from "formik";
import { getAllowedChildTypes } from "../allowedElementTypes";
import { useCallback } from "react";
import useReduxState from "@/hooks/useReduxState";
import { selectActiveBuilderPreviewElement } from "../../store/editor/editorSelectors";
import { actions as editorActions } from "../../store/editor/editorSlice";

/**
 * @see https://stackoverflow.com/a/6470794/402560
 * @internal
 */
export function arrayMove(
  array: unknown[],
  fromIndex: number,
  toIndex: number,
): void {
  const element = array.at(fromIndex);
  array.splice(fromIndex, 1);
  array.splice(toIndex, 0, element);
}

export function acceptDrop(
  documentBuilderElement: DocumentBuilderElement,
  parentElement: DocumentBuilderElement,
): boolean {
  return getAllowedChildTypes(parentElement).includes(
    documentBuilderElement.type,
  );
}

/** @internal */
export function moveElement(
  body: DocumentBuilderElement[],
  source: TreeSourcePosition,
  destination: TreeDestinationPosition,
): DocumentBuilderElement[] {
  return produce(body, (draft) => {
    const sourceParent = getIn(draft, source.parentId as string);
    const destinationParent: DocumentBuilderElement = getIn(
      draft,
      destination.parentId as string,
    );

    const documentBuilderElement: DocumentBuilderElement =
      sourceParent.children[source.index];

    if (!acceptDrop(documentBuilderElement, destinationParent)) {
      console.warn(
        "Destination element does not support drop: %s for %s",
        destinationParent.type,
        documentBuilderElement.type,
        {
          sourceParent,
          destinationParent,
        },
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
      arrayMove(children, source.index, Number(destination.index));
      sourceParent.children = children;
      return;
    }

    console.debug("moveElement across parents", {
      sourceParent,
      destinationParent,
      source,
      destination,
    });

    (getIn(sourceParent, "children") as DocumentBuilderElement[]).splice(
      source.index,
      1,
    );
    (getIn(destinationParent, "children") as DocumentBuilderElement[]).splice(
      Number(destination.index),
      0,
      documentBuilderElement,
    );
  });
}

function useMoveElement(documentBodyName: string) {
  const [{ value: body }, , { setValue }] =
    useField<DocumentBuilderElement[]>(documentBodyName);

  const [, setActiveElement] = useReduxState(
    selectActiveBuilderPreviewElement,
    editorActions.setActiveBuilderPreviewElement,
  );

  return useCallback(
    async (
      sourcePosition: TreeSourcePosition,
      destinationPosition: TreeDestinationPosition,
    ) => {
      // For now, just clear out the active element to ensure the active elementName is valid in the new tree
      setActiveElement(null);

      await setValue(moveElement(body, sourcePosition, destinationPosition));
    },
    [body, setValue, setActiveElement],
  );
}

export default useMoveElement;
