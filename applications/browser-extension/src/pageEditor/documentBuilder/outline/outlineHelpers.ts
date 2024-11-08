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

import {
  type DocumentBuilderElement,
  isListElement,
} from "../documentBuilderTypes";
import { type TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { type ItemId, type TreeData } from "@atlaskit/tree";
import { type TreeItem } from "@atlaskit/tree/types";
import { PARENT_ELEMENT_TYPES } from "../allowedElementTypes";
import { joinPathParts } from "../../../utils/formUtils";

type DocumentBuilderElementArgs = {
  element: DocumentBuilderElement;
  elementName: string;
  treeExpandedState: TreeExpandedState;
};

function getChildren(
  documentBuilderElement: DocumentBuilderElement,
  elementName: string,
): Array<{ element: DocumentBuilderElement; elementName: string }> {
  if (isListElement(documentBuilderElement)) {
    return [
      {
        element: documentBuilderElement.config.element.__value__,
        elementName: joinPathParts(
          elementName,
          "config",
          "element",
          "__value__",
        ),
      },
    ];
  }

  const children = documentBuilderElement?.children ?? [];

  return children.map((child, index) => ({
    element: child,
    elementName: joinPathParts(elementName, "children", String(index)),
  }));
}

function selectTreeEntries({
  element,
  elementName,
  treeExpandedState,
}: DocumentBuilderElementArgs): Array<[ItemId, TreeItem]> {
  const children = getChildren(element, elementName);

  return [
    [
      elementName,
      {
        id: elementName,
        hasChildren: PARENT_ELEMENT_TYPES.includes(element.type),
        // Default to expanded to the user doesn't need to expand everything
        // eslint-disable-next-line security/detect-object-injection -- builder element type
        isExpanded: Boolean(treeExpandedState[elementName] ?? true),
        isChildrenLoading: false,
        data: {
          elementName,
          element,
        },
        children: children.map(({ elementName }) => elementName),
      },
    ],
    ...children.flatMap((child) =>
      selectTreeEntries({
        element: child.element,
        elementName: child.elementName,
        treeExpandedState,
      }),
    ),
  ];
}

export function selectTreeData(
  body: DocumentBuilderElement[],
  treeExpandedState: TreeExpandedState,
): TreeData {
  const children = body.flatMap((element, index) =>
    selectTreeEntries({
      element,
      elementName: String(index),
      treeExpandedState,
    }),
  );

  const entries: Array<[ItemId, TreeItem]> = [
    [
      "body",
      {
        id: "body",
        children: body.map((element, index) => String(index)),
        hasChildren: body.length > 0,
        isExpanded: true,
        isChildrenLoading: false,
        data: null,
      },
    ],
    ...children,
  ];

  return {
    rootId: "body",
    items: Object.fromEntries(entries),
  };
}
