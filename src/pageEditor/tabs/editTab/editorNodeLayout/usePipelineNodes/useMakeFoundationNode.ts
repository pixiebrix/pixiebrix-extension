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

import { type PipelineFlavor } from "@/bricks/types";
import { PIPELINE_BRICKS_FIELD_NAME } from "@/pageEditor/consts";
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import { decideFoundationStatus } from "@/pageEditor/tabs/editTab/editorNodeLayout/decideStatus";
import { type NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { filterStarterBrickAnalysisAnnotations } from "@/pageEditor/utils";
import { type OutputKey } from "@/types/runtimeTypes";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { selectModComponentAnnotations } from "@/analysis/analysisSelectors";
import {
  selectActiveModComponentFormState,
  selectActiveNodeId,
} from "@/pageEditor/store/editor/editorSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";
import { ADD_MESSAGE } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/helpers";
import { useDispatch, useSelector } from "react-redux";
import { useHoveredState } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useHoveredState";
import { useCreateNodeActions } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useCreateNodeActions";

type MakeFoundationNodeArgs = {
  pipelineFlavor: PipelineFlavor;
  showBiggerActions: boolean;
  starterBrickLabel: string;
  starterBrickIcon: IconProp;
  modComponentHasTraces: boolean;
};

export function useMakeFoundationNode({
  pipelineFlavor,
  showBiggerActions,
  starterBrickLabel,
  starterBrickIcon,
  modComponentHasTraces,
}: MakeFoundationNodeArgs) {
  const dispatch = useDispatch();
  const [, setHoveredState] = useHoveredState();
  const createNodeActions = useCreateNodeActions();

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "activeModComponentFormState is required",
  );
  const annotations = useSelector(
    selectModComponentAnnotations(activeModComponentFormState.uuid),
  );
  const activeNodeId = useSelector(selectActiveNodeId);

  const foundationNodeActions: NodeAction[] = createNodeActions({
    nodeId: FOUNDATION_NODE_ID,
    pipelinePath: PIPELINE_BRICKS_FIELD_NAME,
    flavor: pipelineFlavor,
    index: 0,
    showAddBrick: true,
  });

  return {
    icon: starterBrickIcon,
    runStatus: decideFoundationStatus({
      hasTraces: modComponentHasTraces,
      brickAnnotations: filterStarterBrickAnalysisAnnotations(annotations),
    }),
    brickLabel: starterBrickLabel,
    outputKey: "input" as OutputKey,
    onClick() {
      dispatch(actions.setActiveNodeId(FOUNDATION_NODE_ID));
    },
    active: activeNodeId === FOUNDATION_NODE_ID,
    onHoverChange(hovered: boolean) {
      setHoveredState((previousState) => ({
        ...previousState,
        [FOUNDATION_NODE_ID]: hovered,
      }));
    },
    nestingLevel: 0,
    nodeActions: foundationNodeActions,
    showBiggerActions,
    trailingMessage: showBiggerActions ? ADD_MESSAGE : undefined,
  };
}
