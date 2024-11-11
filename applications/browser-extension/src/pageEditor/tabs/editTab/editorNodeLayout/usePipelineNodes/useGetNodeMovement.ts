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
import { useCallback } from "react";
import { type UUID } from "@/types/stringTypes";

type NodeMovementProps = {
  nodeId: UUID;
  index: number;
  lastIndex: number;
};

export function useGetNodeMovement() {
  const dispatch = useDispatch<AppDispatch>();

  return useCallback(
    ({ nodeId, index, lastIndex }: NodeMovementProps) => {
      // Editor nodes are displayed from top to bottom in array order,
      // so, "up" in the UI is lower in the array, and "down" in the UI
      // is higher in the array. Also, you cannot move the foundation node,
      // which is always at index 0.
      const canMoveUp = index > 0;
      const canMoveDown = index < lastIndex;

      const onClickMoveUp = canMoveUp
        ? () => {
            dispatch(actions.moveNode({ nodeId, direction: "up" }));
          }
        : undefined;

      const onClickMoveDown = canMoveDown
        ? () => {
            dispatch(actions.moveNode({ nodeId, direction: "down" }));
          }
        : undefined;

      return {
        onClickMoveUp,
        onClickMoveDown,
      };
    },
    [dispatch],
  );
}
