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

import { type BrickNodeProps } from "@/pageEditor/tabs/editTab/editTabTypes";
import { isEmpty } from "lodash";
import { useSelector } from "react-redux";
import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors";
import { getRootPipelineFlavor } from "@/bricks/brickFilterHelpers";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { assertNotNullish } from "@/utils/nullishUtils";
import {
  type MapOutput,
  type EditorNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import { useMapPipelineToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapPipelineToNodes";
import { useMakeFoundationNode } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMakeFoundationNode";
import { useMapBrickToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapBrickToNodes";

const usePipelineNodes = (): {
  foundationNodeProps: BrickNodeProps;
  nodes: EditorNodeProps[];
} => {
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "activeModComponentFormState is required",
  );

  const mapBrickToNodes = useMapBrickToNodes();
  const mapPipelineToNodes = useMapPipelineToNodes(mapBrickToNodes);

  const {
    starterBrickType,
    label: starterBrickLabel,
    icon: starterBrickIcon,
  } = adapterForComponent(activeModComponentFormState);
  const rootPipeline = activeModComponentFormState.modComponent.brickPipeline;
  const rootPipelineFlavor = getRootPipelineFlavor(starterBrickType);

  const { nodes, modComponentHasTraces }: MapOutput = mapPipelineToNodes({
    pipeline: rootPipeline,
    flavor: rootPipelineFlavor,
  });

  const foundationNodeProps = useMakeFoundationNode({
    pipelineFlavor: rootPipelineFlavor,
    showBiggerActions: isEmpty(rootPipeline),
    starterBrickLabel,
    starterBrickIcon,
    modComponentHasTraces,
  });

  return {
    foundationNodeProps,
    nodes,
  };
};

export default usePipelineNodes;
