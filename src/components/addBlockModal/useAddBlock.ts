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

import { IBlock, OutputKey } from "@/core";
import { useCallback } from "react";
import { generateFreshOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import { compact } from "lodash";
import { createNewBlock } from "@/pageEditor/createNewBlock";
import { actions } from "@/pageEditor/slices/editorSlice";
import { reportEvent } from "@/telemetry/events";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveElementId,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";

function useAddBlock(
  pipelinePath: string,
  pipelineIndex: number
): (block: IBlock) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const activeExtensionId = useSelector(selectActiveElementId);
  const pipelineMap = useSelector(selectPipelineMap);

  return useCallback(
    async (block) => {
      const outputKey = await generateFreshOutputKey(
        block,
        compact([
          "input" as OutputKey,
          ...Object.values(pipelineMap).map((x) => x.blockConfig.outputKey),
        ])
      );
      const newBlock = createNewBlock(block.id, block.inputSchema);
      if (outputKey) {
        newBlock.outputKey = outputKey;
      }

      dispatch(
        actions.addNode({ block: newBlock, pipelinePath, pipelineIndex })
      );

      reportEvent("BrickAdd", {
        brickId: block.id,
        sessionId,
        extensionId: activeExtensionId,
        source: "PageEditor-BrickSearchModal",
      });
    },
    [
      activeExtensionId,
      dispatch,
      pipelineIndex,
      pipelineMap,
      pipelinePath,
      sessionId,
    ]
  );
}

export default useAddBlock;
