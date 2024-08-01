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

import { useDispatch, useSelector } from "react-redux";
import { selectCopiedBrick } from "@/pageEditor/store/editor/editorSelectors";
import { uuidv4 } from "@/types/helpers";
import { type BrickConfig } from "@/bricks/types";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { normalizePipelineForEditor } from "@/pageEditor/starterBricks/pipelineMapping";
import { assertNotNullish } from "@/utils/nullishUtils";

function usePasteBrick():
  | ((pipelinePath: string, pipelineIndex: number) => Promise<void>)
  | null {
  const dispatch = useDispatch();
  const copiedBrick = useSelector(selectCopiedBrick);
  if (copiedBrick == null) {
    return null;
  }

  return async (pipelinePath: string, pipelineIndex: number) => {
    // Give the block a new instanceId
    const newInstanceId = uuidv4();
    const newBrick: BrickConfig = {
      ...copiedBrick,
      instanceId: newInstanceId,
    };
    // Give all the bricks new instance ids
    const normalizedPipeline = await normalizePipelineForEditor([newBrick]);
    const normalizedBrick = normalizedPipeline.at(0);
    assertNotNullish(normalizedBrick, "Brick not found in pipeline");
    // Insert the block
    dispatch(
      actions.addNode({ block: normalizedBrick, pipelinePath, pipelineIndex }),
    );
    dispatch(actions.clearCopiedBrickConfig());
  };
}

export default usePasteBrick;
