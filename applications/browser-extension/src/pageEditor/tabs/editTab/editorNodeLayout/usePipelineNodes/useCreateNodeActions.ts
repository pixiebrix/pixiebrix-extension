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

import { type NodeAction } from "../../editorNodes/nodeActions/NodeActionsView";
import { faPlusCircle, faPaste } from "@fortawesome/free-solid-svg-icons";
import { actions } from "../../../../store/editor/editorSlice";
import { useDispatch } from "react-redux";
import { type PipelineFlavor } from "../../../../../bricks/types";
import usePasteBrick from "../usePasteBrick";
import useApiVersionAtLeast from "../../../../hooks/useApiVersionAtLeast";
import { useCallback } from "react";

export function useCreateNodeActions() {
  const dispatch = useDispatch();
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const pasteBrick = usePasteBrick();
  const showPaste = pasteBrick && isApiAtLeastV2;

  return useCallback(
    ({
      nodeId,
      pipelinePath,
      flavor,
      index,
      showAddBrick,
    }: {
      nodeId: string;
      pipelinePath: string;
      flavor: PipelineFlavor;
      index: number;
      showAddBrick: boolean;
    }): NodeAction[] => {
      const nodeActions: NodeAction[] = [];

      if (showAddBrick) {
        nodeActions.push({
          name: `${nodeId}-add-brick`,
          icon: faPlusCircle,
          tooltipText: "Add a brick",
          onClick() {
            dispatch(
              actions.showAddBrickModal({
                path: pipelinePath,
                flavor,
                index,
              }),
            );
          },
        });
      }

      if (showPaste) {
        nodeActions.push({
          name: `${nodeId}-paste-brick`,
          icon: faPaste,
          tooltipText: "Paste copied brick",
          async onClick() {
            await pasteBrick(pipelinePath, index);
          },
        });
      }

      return nodeActions;
    },
    [dispatch, pasteBrick, showPaste],
  );
}
