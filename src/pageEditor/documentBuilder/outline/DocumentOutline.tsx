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

import { useField } from "formik";
import React, { useCallback, useMemo, useState } from "react";
import { type DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import Tree, {
  type ItemId,
  type RenderItemParams,
  type TreeDestinationPosition,
  type TreeSourcePosition,
} from "@atlaskit/tree";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { selectTreeData } from "@/pageEditor/documentBuilder/outline/outlineHelpers";
import OutlineItem, {
  LEVEL_PADDING_PX,
} from "@/pageEditor/documentBuilder/outline/OutlineItem";
import useMoveElement from "@/pageEditor/documentBuilder/hooks/useMoveElement";
import useDeleteElement from "@/pageEditor/documentBuilder/hooks/useDeleteElement";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";

type DocumentOutlineProps = {
  /**
   * Formik field name for the document body prop.
   */
  documentBodyName: string;
  /**
   * The active builder element, or nullish if no element is selected.
   */
  activeElement: Nullishable<string>;
  /**
   * Callback to set the active element
   */
  setActiveElement: (activeElement: string) => void;
};

const DocumentOutline = ({
  documentBodyName,
  activeElement,
  setActiveElement,
}: DocumentOutlineProps) => {
  const dispatch = useDispatch();

  const [dragItemId, setDragItemId] = useState<ItemId | null>();

  const [{ value: body }] =
    useField<DocumentBuilderElement[]>(documentBodyName);

  const dataPanelTabState = useSelector((state: RootState) =>
    selectNodeDataPanelTabState(state, DataPanelTabKey.Outline),
  );

  assertNotNullish(
    dataPanelTabState,
    "Document Outline can only be displayed in a brick editing context",
  );

  const { treeExpandedState } = dataPanelTabState;

  const tree = useMemo(
    () => selectTreeData(body, treeExpandedState),
    [treeExpandedState, body],
  );

  const onDelete = useDeleteElement(documentBodyName);
  const onMove = useMoveElement(documentBodyName);

  const renderItem = useCallback(
    (params: RenderItemParams) => {
      const { elementName }: { elementName: string } = params.item.data;
      return (
        // Don't need to handle "body" synthetic element b/c it won't be rendered
        <OutlineItem
          {...params}
          isActive={activeElement === elementName}
          onSelect={() => {
            setActiveElement(elementName);
          }}
          dragItem={
            // Normalize undefined to null
            (dragItemId ? tree.items[dragItemId] : null) ?? null
          }
          onDelete={async () => {
            await onDelete(elementName);
          }}
        />
      );
    },
    [activeElement, setActiveElement, dragItemId, tree, onDelete],
  );

  const toggleExpand = useCallback(
    (itemId: string | number, next: boolean) => {
      dispatch(
        actions.setNodeDataPanelTabExpandedState({
          tabKey: DataPanelTabKey.Outline,
          expandedState: { ...treeExpandedState, [String(itemId)]: next },
        }),
      );
    },
    [dispatch, treeExpandedState],
  );

  const onDragEnd = async (
    sourcePosition: TreeSourcePosition,
    destinationPosition?: TreeDestinationPosition,
  ) => {
    setDragItemId(null);

    if (destinationPosition) {
      await onMove(sourcePosition, destinationPosition);
    }
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
      onDragStart={(itemId) => {
        setDragItemId(itemId);
      }}
      isDragEnabled
      isNestingEnabled
      renderItem={renderItem}
      offsetPerLevel={LEVEL_PADDING_PX}
    />
  );
};

export default DocumentOutline;
