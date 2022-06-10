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
  TreeDestinationPosition,
  TreeSourcePosition,
} from "@atlaskit/tree";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/pageEditor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/slices/editorSelectors";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { actions } from "@/pageEditor/slices/editorSlice";
import { moveElement } from "@/components/documentBuilder/edit/useMoveElement";
import { selectTreeData } from "@/components/documentBuilder/outline/outlineHelpers";
import OutlineItem, {
  LEVEL_PADDING_PX,
} from "@/components/documentBuilder/outline/OutlineItem";

type DocumentOutlineProps = {
  /**
   * Formik field name for the document body prop.
   */
  documentBodyName: string;
  activeElement: string;
  setActiveElement: (activeElement: string) => void;
};

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
    (params: RenderItemParams) => (
      // Don't need to handle "body" synthetic element b/c it won't be rendered
      <OutlineItem
        {...params}
        isActive={activeElement === params.item.data.elementName}
        onSelect={() => {
          setActiveElement(params.item.data.elementName as string);
        }}
        onDelete={() => {
          throw new Error("Not implemented yet");
        }}
      />
    ),
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

  const onDragEnd = (
    sourcePosition: TreeSourcePosition,
    destinationPosition?: TreeDestinationPosition
  ) => {
    if (destinationPosition) {
      setValue(moveElement(body, sourcePosition, destinationPosition));
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
      isDragEnabled
      isNestingEnabled={false}
      renderItem={renderItem}
      offsetPerLevel={LEVEL_PADDING_PX}
    />
  );
};

export default DocumentOutline;
