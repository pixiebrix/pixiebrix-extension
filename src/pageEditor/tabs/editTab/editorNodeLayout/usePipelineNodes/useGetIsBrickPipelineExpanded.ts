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

import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import { type BrickConfig } from "@/bricks/types";
import { selectCollapsedNodes } from "@/pageEditor/store/editor/editorSelectors";
import { getSubPipelinesForBrick } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/helpers";
import { assertNotNullish } from "@/utils/nullishUtils";
import { isEmpty } from "lodash";
import { useCallback } from "react";
import { useSelector } from "react-redux";

type GetIsBrickPipelineExpandedProps = {
  brickConfig: BrickConfig;
};

export function useGetIsBrickPipelineExpanded() {
  const { data: allBricks } = useTypedBrickMap();
  const collapsedNodes = useSelector(selectCollapsedNodes);

  return useCallback(
    ({ brickConfig }: GetIsBrickPipelineExpandedProps) => {
      const brick = allBricks?.get(brickConfig.id)?.block;

      const subPipelines = getSubPipelinesForBrick(brick, brickConfig);
      const hasSubPipelines = !isEmpty(subPipelines);

      const nodeId = brickConfig.instanceId;
      assertNotNullish(nodeId, "nodeId is required");

      const collapsed = collapsedNodes.includes(nodeId);

      return hasSubPipelines && !collapsed;
    },
    [allBricks, collapsedNodes],
  );
}
