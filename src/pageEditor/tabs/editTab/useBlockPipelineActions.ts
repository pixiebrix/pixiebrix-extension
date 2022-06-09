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

import React, { useCallback, useMemo } from "react";
import { IBlock, OutputKey, UUID } from "@/core";
import { generateFreshOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import { compact } from "lodash";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { produce } from "immer";
import { actions } from "@/pageEditor/slices/editorSlice";
import { FormState, RootState } from "@/pageEditor/pageEditorTypes";
import { useDispatch, useSelector } from "react-redux";
import { reportEvent } from "@/telemetry/events";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { NodeId } from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { createNewBlock } from "@/pageEditor/createNewBlock";
import { selectPipelineMap } from "@/pageEditor/slices/editorSelectors";
import { uuidv4 } from "@/types/helpers";

type BlockPipelineActions = {
  addBlock: (
    block: IBlock,
    pipelinePath: string,
    pipelineIndex: number
  ) => void;
  removeBlock: (nodeIdToRemove: NodeId) => void;
  moveBlockUp: (instanceId: UUID) => void;
  moveBlockDown: (instanceId: UUID) => void;
  copyBlock: (instanceId: UUID) => void;
  pasteBlock: (pipelinePath: string, pipelineIndex: number) => void | null;
};

function useBlockPipelineActions(
  blockPipeline: BlockPipeline,
  values: FormState,
  setFormValues: (
    values: React.SetStateAction<FormState>,
    shouldValidate?: boolean
  ) => void
): BlockPipelineActions {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const pipelineMap = useSelector(selectPipelineMap);

  /**
   * This action will update the Redux state and propagate it to Formik.
   * Other actions do the opposite.
   */
  const addBlock = useCallback(
    async (block: IBlock, pipelinePath: string, pipelineIndex: number) => {
      const outputKey = await generateFreshOutputKey(
        block,
        compact([
          "input" as OutputKey,
          ...blockPipeline.map((x) => x.outputKey),
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
        extensionId: values.uuid,
        source: "PageEditor-BrickSearchModal",
      });
    },
    [blockPipeline, values, sessionId, dispatch]
  );

  const removeBlock = (nodeIdToRemove: NodeId) => {
    dispatch(actions.removeNode(nodeIdToRemove));
  };

  const moveBlockUp = useCallback(
    (instanceId: UUID) => {
      const index = blockPipeline.findIndex(
        (block) => block.instanceId === instanceId
      );
      if (index < 1 || index + 1 > blockPipeline.length) {
        return;
      }

      const nextState = produce(values, (draft) => {
        const pipeline = draft.extension.blockPipeline;
        // Swap the prev and current index values in the pipeline array, "up" in
        //  the UI means a lower index in the array
        // eslint-disable-next-line security/detect-object-injection -- from findIndex()
        [pipeline[index - 1], pipeline[index]] = [
          // eslint-disable-next-line security/detect-object-injection -- from findIndex()
          pipeline[index],
          pipeline[index - 1],
        ];
      });
      setFormValues(nextState, true);
    },
    [blockPipeline, setFormValues, values]
  );

  const moveBlockDown = useCallback(
    (instanceId: UUID) => {
      const index = blockPipeline.findIndex(
        (block) => block.instanceId === instanceId
      );
      if (index + 1 === blockPipeline.length) {
        return;
      }

      const nextState = produce(values, (draft) => {
        const pipeline = draft.extension.blockPipeline;
        // Swap the current and next index values in the pipeline array, "down"
        //  in the UI means a higher index in the array
        // eslint-disable-next-line security/detect-object-injection -- from findIndex()
        [pipeline[index], pipeline[index + 1]] = [
          pipeline[index + 1],
          // eslint-disable-next-line security/detect-object-injection -- from findIndex()
          pipeline[index],
        ];
      });
      setFormValues(nextState, true);
    },
    [blockPipeline, setFormValues, values]
  );

  const copyBlock = useCallback(
    (instanceId: UUID) => {
      const blockToCopy = pipelineMap[instanceId]?.blockConfig;
      if (blockToCopy) {
        dispatch(actions.copyBlockConfig(blockToCopy));
      }
    },
    [blockPipeline, dispatch]
  );

  const copiedBlock = useSelector(
    (state: RootState) => state.editor.copiedBlock
  );

  const pasteBlock = useMemo(() => {
    if (copiedBlock === undefined) {
      return null;
    }

    return (pipelinePath: string, pipelineIndex: number) => {
      // Give the block a new instanceId
      const newInstanceId = uuidv4();
      const blockToPast: BlockConfig = {
        ...copiedBlock,
        instanceId: newInstanceId,
      };
      dispatch(
        actions.addNode({ block: blockToPast, pipelinePath, pipelineIndex })
      );
    };
  }, [copiedBlock, dispatch]);

  return {
    addBlock,
    removeBlock,
    moveBlockUp,
    moveBlockDown,
    copyBlock,
    pasteBlock,
  };
}

export default useBlockPipelineActions;
