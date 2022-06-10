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

import { useField } from "formik";
import React, { useCallback, useMemo } from "react";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import Tree, {
  ItemId,
  RenderItemParams,
  TreeData,
  TreeDestinationPosition,
  TreeSourcePosition,
} from "@atlaskit/tree";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/pageEditor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/slices/editorSelectors";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { actions } from "@/pageEditor/slices/editorSlice";
import { TreeExpandedState } from "@/components/jsonTree/JsonTree";
import { TreeItem } from "@atlaskit/tree/types";
import { Button } from "react-bootstrap";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import styles from "./DocumentOutline.module.scss";
import { joinElementName } from "@/components/documentBuilder/utils";
import { moveElement } from "@/components/documentBuilder/edit/useMoveElement";

type DocumentOutlineProps = {
  /**
   * Formik field name for the document body prop.
   */
  documentBodyName: string;
  activeElement: string;
  setActiveElement: (activeElement: string) => void;
};

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
        // eslint-disable-next-line security/detect-object-injection -- builder element type
        isExpanded: Boolean(treeExpandedState[elementName] ?? false),
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

function selectTreeData(
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

const LEVEL_PADDING_PX = 10;

const DocumentOutline = ({
  documentBodyName,
  activeElement,
  setActiveElement,
}: DocumentOutlineProps) => {
  const dispatch = useDispatch();
  const [{ value: body }, , { setValue }] =
    useField<DocumentElement[]>(documentBodyName);

  const { treeExpandedState } = useSelector((state: RootState) =>
    selectNodeDataPanelTabState(state, DataPanelTabKey.Outline)
  );

  const tree = useMemo(
    () => selectTreeData(body, treeExpandedState),
    [treeExpandedState, body]
  );

  const renderItem = useCallback(
    ({ depth, item, onCollapse, onExpand, provided }: RenderItemParams) => {
      if (item.id === "body") {
        return <div>body</div>;
      }

      return (
        <div
          style={{ paddingLeft: depth * LEVEL_PADDING_PX }}
          className={cx(styles.item, {
            [styles.activeItem]: activeElement === item.data.elementName,
          })}
          onClick={() => {
            setActiveElement(item.data.elementName as string);
          }}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {item.hasChildren && (
            <Button
              variant="light"
              size="sm"
              onClick={() => {
                if (item.isExpanded) {
                  onCollapse(item.id);
                } else {
                  onExpand(item.id);
                }
              }}
            >
              <FontAwesomeIcon
                fixedWidth
                icon={item.isExpanded ? faCaretDown : faCaretRight}
              />
            </Button>
          )}

          <span>{item.data.element.type}</span>
        </div>
      );
    },
    [activeElement, setActiveElement]
  );

  const toggleExpand = useCallback(
    (itemId: string | number, next: boolean) => {
      dispatch(
        actions.setNodeDataPanelTabExpandedState({
          tabKey: DataPanelTabKey.Outline,
          expandedState: { ...treeExpandedState, [String(itemId)]: next },
        })
      );
    },
    [dispatch, treeExpandedState]
  );

  console.debug("Tree", { tree });

  const onDragEnd = (
    sourcePosition: TreeSourcePosition,
    destinationPosition?: TreeDestinationPosition
  ) => {
    console.debug("drop", {
      sourcePosition,
      destinationPosition,
    });

    if (destinationPosition) {
      setValue(moveElement(body, sourcePosition, destinationPosition));
    }

    console.debug("drop:done", {
      sourcePosition,
      destinationPosition,
    });
  };

  return (
    <Tree
      tree={tree}
      onExpand={(item: ItemId) => {
        toggleExpand(item, true);
      }}
      onCollapse={(item: ItemId) => {
        toggleExpand(item, false);
      }}
      onDragEnd={onDragEnd}
      isDragEnabled
      isNestingEnabled={false}
      renderItem={renderItem}
      offsetPerLevel={LEVEL_PADDING_PX}
    />
  );
};

export default DocumentOutline;
