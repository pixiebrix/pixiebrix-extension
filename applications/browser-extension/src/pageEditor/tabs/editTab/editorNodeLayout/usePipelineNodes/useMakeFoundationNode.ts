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
import { PIPELINE_BRICKS_FIELD_NAME } from "../../../../consts";
import { FOUNDATION_NODE_ID } from "../../../../store/editor/uiState";
import { decideFoundationStatus } from "../decideStatus";
import { type NodeAction } from "../../editorNodes/nodeActions/NodeActionsView";
import { filterStarterBrickAnalysisAnnotations } from "../../../../utils";
import { type OutputKey } from "../../../../../types/runtimeTypes";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { selectModComponentAnnotations } from "@/analysis/analysisSelectors";
import {
  selectActiveModComponentFormState,
  selectActiveNodeId,
} from "../../../../store/editor/editorSelectors";
import { assertNotNullish } from "../../../../../utils/nullishUtils";
import { useSelector } from "react-redux";
import { useCreateNodeActions } from "./useCreateNodeActions";
import { type useGetNodeState } from "./useGetNodeState";

type MakeFoundationNodeArgs = {
  pipelineFlavor: PipelineFlavor;
  showBiggerActions: boolean;
  starterBrickLabel: string;
  starterBrickIcon: IconProp;
  modComponentHasTraces: boolean;
  getNodeState: ReturnType<typeof useGetNodeState>;
};

export function useMakeFoundationNode({
  pipelineFlavor,
  showBiggerActions,
  starterBrickLabel,
  starterBrickIcon,
  modComponentHasTraces,
  getNodeState,
}: MakeFoundationNodeArgs) {
  const createNodeActions = useCreateNodeActions();

  const activeNodeId = useSelector(selectActiveNodeId);
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

  const foundationNodeActions: NodeAction[] = createNodeActions({
    nodeId: FOUNDATION_NODE_ID,
    pipelinePath: PIPELINE_BRICKS_FIELD_NAME,
    flavor: pipelineFlavor,
    index: 0,
    showAddBrick: true,
  });

  const nodeState = getNodeState({
    active: activeNodeId === FOUNDATION_NODE_ID,
    nodeId: FOUNDATION_NODE_ID,
    nestingLevel: 0,
    showBiggerActions,
    nodeActions: foundationNodeActions,
  });

  return {
    icon: starterBrickIcon,
    runStatus: decideFoundationStatus({
      hasTraces: modComponentHasTraces,
      brickAnnotations: filterStarterBrickAnalysisAnnotations(annotations),
    }),
    brickLabel: starterBrickLabel,
    outputKey: "input" as OutputKey,
    ...nodeState,
  };
}
