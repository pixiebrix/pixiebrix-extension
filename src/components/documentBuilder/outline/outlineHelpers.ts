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
import { TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { ItemId, TreeData } from "@atlaskit/tree";
import { TreeItem } from "@atlaskit/tree/types";
import { joinElementName } from "@/components/documentBuilder/utils";

type ElementArgs = {
  element: DocumentElement;
  elementName: string;
  treeExpandedState: TreeExpandedState;
};

function selectTreeEntries({
  element,
  elementName,
  treeExpandedState,
}: ElementArgs): Array<[ItemId, TreeItem]> {
  const children = element?.children ?? [];

  return [
    [
      elementName,
      {
        id: elementName,
        hasChildren: children.length > 0,
        // Default to expanded to the user doesn't need to expand everything
        // eslint-disable-next-line security/detect-object-injection -- builder element type
        isExpanded: Boolean(treeExpandedState[elementName] ?? true),
        isChildrenLoading: false,
        data: {
          elementName,
          element,
        },
        children: children.map((child, index) =>
          joinElementName(elementName, "children", String(index))
        ),
      },
    ],
    ...children.flatMap((child, index) =>
      selectTreeEntries({
        element: child,
        elementName: joinElementName(elementName, "children", String(index)),
        treeExpandedState,
      })
    ),
  ];
}

export function selectTreeData(
  body: DocumentElement[],
  treeExpandedState: TreeExpandedState
): TreeData {
  const children = body.flatMap((element, index) =>
    selectTreeEntries({
      element,
      elementName: String(index),
      treeExpandedState,
    })
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
