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

import { useState } from "react";
import { type BrickNodeProps } from "@/pageEditor/tabs/editTab/editTabTypes";
import { isEmpty } from "lodash";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors";
import { getRootPipelineFlavor } from "@/bricks/brickFilterHelpers";
import { type UUID } from "@/types/stringTypes";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import usePasteBrick from "@/pageEditor/tabs/editTab/editorNodeLayout/usePasteBrick";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { assertNotNullish } from "@/utils/nullishUtils";
import {
  type MapOutput,
  type EditorNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import { useMapPipelineToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapPipelineToNodes";
import { type AppDispatch } from "@/pageEditor/store/store";
import { useMakeFoundationNode } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMakeFoundationNode";
import { useMapBrickToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapBrickToNodes";

const usePipelineNodes = (): {
  foundationNodeProps: BrickNodeProps;
  nodes: EditorNodeProps[];
} => {
  const dispatch = useDispatch<AppDispatch>();
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "activeModComponentFormState is required",
  );
  const traces = useSelector(selectActiveModComponentTraces);

  const { data: allBricks, isLoading } = useTypedBrickMap();

  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const pasteBrick = usePasteBrick();
  const mapBrickToNodes = useMapBrickToNodes();
  const mapPipelineToNodes = useMapPipelineToNodes(mapBrickToNodes);

  const {
    starterBrickType,
    label: starterBrickLabel,
    icon: starterBrickIcon,
  } = adapterForComponent(activeModComponentFormState);
  const rootPipeline = activeModComponentFormState.modComponent.brickPipeline;
  const rootPipelineFlavor = getRootPipelineFlavor(starterBrickType);
  const [hoveredState, setHoveredState] = useState<Record<UUID, boolean>>({});

  const { nodes, modComponentHasTraces }: MapOutput = mapPipelineToNodes({
    pipeline: rootPipeline,
    flavor: rootPipelineFlavor,
    traces,
    allBricks,
    isLoadingBricks: isLoading,
    hoveredState,
    setHoveredState,
    isApiAtLeastV2,
  });

  const foundationNodeProps = useMakeFoundationNode({
    pipelineFlavor: rootPipelineFlavor,
    showBiggerActions: isEmpty(rootPipeline),
    starterBrickLabel,
    starterBrickIcon,
    modComponentHasTraces,
    pasteBrick,
    isApiAtLeastV2,
    setHoveredState,
  });

  return {
    foundationNodeProps,
    nodes,
  };
};

export default usePipelineNodes;
