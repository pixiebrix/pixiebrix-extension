/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback } from "react";
import { IBlock, OutputKey, UUID } from "@/core";
import { generateFreshOutputKey } from "@/devTools/editor/tabs/editTab/editHelpers";
import { compact } from "lodash";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { uuidv4 } from "@/types/helpers";
import { getExampleBlockConfig } from "@/devTools/editor/tabs/editTab/exampleBlockConfigs";
import { defaultBlockConfig } from "@/blocks/util";
import { produce } from "immer";
import {
  FOUNDATION_NODE_ID,
  NodeId,
} from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { actions, FormState } from "@/devTools/editor/slices/editorSlice";
import { produceExcludeUnusedDependencies as produceExcludeUnusedDependenciesV3 } from "@/components/fields/schemaFields/v3/ServiceField";
import { produceExcludeUnusedDependencies as produceExcludeUnusedDependenciesV1 } from "@/components/fields/schemaFields/v1/ServiceField";
import useApiVersionAtLeast from "@/devTools/editor/hooks/useApiVersionAtLeast";
import { useDispatch } from "react-redux";

function useBlockActions(
  blockPipeline: BlockPipeline,
  values: FormState,
  setFormValues: (
    values: React.SetStateAction<FormState>,
    shouldValidate?: boolean
  ) => void,
  setActiveNodeId: (nodeId: NodeId) => void
) {
  const isApiAtLeastV3 = useApiVersionAtLeast("v3");
  const produceExcludeUnusedDependencies = isApiAtLeastV3
    ? produceExcludeUnusedDependenciesV3
    : produceExcludeUnusedDependenciesV1;

  const dispatch = useDispatch();

  const addBlock = useCallback(
    async (block: IBlock, beforeInstanceId?: UUID) => {
      const insertIndex = beforeInstanceId
        ? blockPipeline.findIndex((x) => x.instanceId === beforeInstanceId)
        : blockPipeline.length;
      const outputKey = await generateFreshOutputKey(
        block,
        compact([
          "input" as OutputKey,
          ...blockPipeline.map((x) => x.outputKey),
        ])
      );
      const newBlock: BlockConfig = {
        id: block.id,
        instanceId: uuidv4(),
        config:
          getExampleBlockConfig(block) ?? defaultBlockConfig(block.inputSchema),
      };
      if (outputKey) {
        newBlock.outputKey = outputKey;
      }

      const nextState = produce(values, (draft) => {
        draft.extension.blockPipeline.splice(insertIndex, 0, newBlock);
      });
      setFormValues(nextState, true);
      setActiveNodeId(newBlock.instanceId);
    },
    [blockPipeline, values, setFormValues, setActiveNodeId]
  );

  const removeBlock = (nodeIdToRemove: NodeId) => {
    let prevNodeId: NodeId;
    let nextState = produce(values, (draft) => {
      const index = draft.extension.blockPipeline.findIndex(
        (block) => block.instanceId === nodeIdToRemove
      );

      prevNodeId =
        index === 0
          ? FOUNDATION_NODE_ID
          : draft.extension.blockPipeline[index - 1].instanceId;

      draft.extension.blockPipeline.splice(index, 1);
    });

    nextState = produceExcludeUnusedDependencies(nextState);

    // Set the active node before setting the form values, otherwise there's a race condition based on the React state
    // causing a re-render vs. the Formik state causing a re-render
    dispatch(
      actions.removeElementNodeUIState({
        nodeIdToRemove,
        newActiveNodeId: prevNodeId,
      })
    );
    setFormValues(nextState, true);
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

  return {
    addBlock,
    removeBlock,
    moveBlockUp,
    moveBlockDown,
  };
}

export default useBlockActions;
