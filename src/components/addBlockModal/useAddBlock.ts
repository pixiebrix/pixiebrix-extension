/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type IBlock, type OutputKey } from "@/core";
import { useCallback } from "react";
import { generateFreshOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import { compact, get } from "lodash";
import { actions } from "@/pageEditor/slices/editorSlice";
import { reportEvent } from "@/telemetry/events";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveElement,
  selectAddBlockLocation,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import BlockTypeAnalysis from "@/analysis/analysisVisitors/blockTypeAnalysis";
import { joinPathParts } from "@/utils";
import { type BlockConfig } from "@/blocks/types";
import FormBrickAnalysis from "@/analysis/analysisVisitors/formBrickAnalysis";
import RenderersAnalysis from "@/analysis/analysisVisitors/renderersAnalysis";
import { type Analysis } from "@/analysis/analysisTypes";
import { produce } from "immer";
import { createNewBlock } from "@/pageEditor/exampleBlockConfigs";

type TestAddBlockResult = {
  error?: string;
};

type AddBlock = {
  testAddBlock: (block: IBlock) => Promise<TestAddBlockResult>;
  addBlock: (block: IBlock) => Promise<void>;
};

function makeBlockLevelAnalyses(): Analysis[] {
  return [
    new BlockTypeAnalysis(),
    new FormBrickAnalysis(),
    new RenderersAnalysis(),
  ];
}

function useAddBlock(): AddBlock {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const activeExtension = useSelector(selectActiveElement);
  const pipelineMap = useSelector(selectPipelineMap);

  const addBlockLocation = useSelector(selectAddBlockLocation);

  const makeNewBlock = useCallback(
    async (block: IBlock): Promise<BlockConfig> => {
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

      return newBlock;
    },
    [pipelineMap]
  );

  /**
   * Create a copy of the active extension, add the block, and then
   * run block-level analyses to determine if there are any issues
   * with adding the particular block.
   */
  const testAddBlock = useCallback(
    async (block: IBlock): Promise<TestAddBlockResult> => {
      if (!addBlockLocation) {
        return {};
      }

      // Add the block to a copy of the extension
      const newBlock = await makeNewBlock(block);
      const newExtension = produce(activeExtension, (draft) => {
        const pipeline = get(draft, addBlockLocation.path);
        pipeline.splice(addBlockLocation.index, 0, newBlock);
      });

      // Run the block-level analyses and gather annotations
      const analyses = makeBlockLevelAnalyses();
      const annotationSets = await Promise.all(
        analyses.map(async (analysis) => {
          await analysis.run(newExtension);
          return analysis.getAnnotations();
        })
      );
      const annotations = annotationSets.flat();
      const newBlockPath = joinPathParts(
        addBlockLocation.path,
        addBlockLocation.index
      );

      // Find annotations for the added block
      const newBlockAnnotation = annotations.find(
        (annotation) => annotation.position.path === newBlockPath
      );

      if (newBlockAnnotation) {
        return { error: newBlockAnnotation.message };
      }

      return {};
    },
    [activeExtension, addBlockLocation, makeNewBlock]
  );

  const addBlock = useCallback(
    async (block: IBlock) => {
      if (!addBlockLocation) {
        return;
      }

      const newBlock = await makeNewBlock(block);

      dispatch(
        actions.addNode({
          block: newBlock,
          pipelinePath: addBlockLocation.path,
          pipelineIndex: addBlockLocation.index,
        })
      );

      reportEvent("BrickAdd", {
        brickId: block.id,
        sessionId,
        extensionId: activeExtension.uuid,
        source: "PageEditor-BrickSearchModal",
      });
    },
    [activeExtension?.uuid, addBlockLocation, dispatch, makeNewBlock, sessionId]
  );

  return {
    testAddBlock,
    addBlock,
  };
}

export default useAddBlock;
