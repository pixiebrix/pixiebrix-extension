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

import { useDispatch } from "react-redux";
import { type AppDispatch } from "@/pageEditor/store/store";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { type NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { type UUID } from "@/types/stringTypes";
import { useCallback, useState } from "react";

export const ADD_MESSAGE = "Add more bricks with the plus button";

type NodeStateProps = {
  active: boolean;
  nodeId: UUID;
  nestingLevel: number;
  showBiggerActions?: boolean;
  nodeActions: NodeAction[];
  isParentActive?: boolean;
};

export function useGetNodeState() {
  const dispatch = useDispatch<AppDispatch>();
  const [hoveredState, setHoveredState] = useState<Record<UUID, boolean>>({});

  return useCallback(
    ({
      active,
      nodeId,
      nestingLevel,
      showBiggerActions,
      nodeActions,
      isParentActive,
    }: NodeStateProps) => {
      const onClick = () => {
        dispatch(actions.setActiveNodeId(nodeId));
      };

      const onHoverChange = (hovered: boolean) => {
        setHoveredState((previousState) => ({
          ...previousState,
          [nodeId]: hovered,
        }));
      };

      return {
        active,
        isParentActive,
        nestingLevel,
        hovered: hoveredState[nodeId],
        onClick,
        onHoverChange,
        nodeActions,
        showBiggerActions,
        trailingMessage: showBiggerActions ? ADD_MESSAGE : undefined,
      };
    },
    [dispatch, hoveredState],
  );
}
