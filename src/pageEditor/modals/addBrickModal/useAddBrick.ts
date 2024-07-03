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

import type React from "react";
import { useCallback } from "react";
import { generateFreshOutputKey } from "@/pageEditor/tabs/editTab/editHelpers";
import { compact, get } from "lodash";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectAddBlockLocation,
  selectPipelineMap,
} from "@/pageEditor/store/editor/editorSelectors";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import BrickTypeAnalysis from "@/analysis/analysisVisitors/brickTypeAnalysis";
import { type BrickConfig } from "@/bricks/types";
import FormBrickAnalysis from "@/analysis/analysisVisitors/formBrickAnalysis";
import RenderersAnalysis from "@/analysis/analysisVisitors/renderersAnalysis";
import { type Analysis } from "@/analysis/analysisTypes";
import { produce } from "immer";
import { createNewConfiguredBrick } from "@/pageEditor/exampleBrickConfigs";
import { type OutputKey } from "@/types/runtimeTypes";
import { type Brick } from "@/types/brickTypes";
import { joinPathParts } from "@/utils/formUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

type TestAddBrickResult = {
  error?: React.ReactNode;
};

type AddBrick = {
  testAddBrick: (brick: Brick) => Promise<TestAddBrickResult>;
  addBrick: (brick: Brick) => Promise<void>;
};

function makeBrickLevelAnalyses(): Analysis[] {
  return [
    new BrickTypeAnalysis(),
    new FormBrickAnalysis(),
    new RenderersAnalysis(),
  ];
}

function useAddBrick(): AddBrick {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const activeModComponent = useSelector(selectActiveModComponentFormState);
  const pipelineMap = useSelector(selectPipelineMap);

  const addBlockLocation = useSelector(selectAddBlockLocation);

  const makeNewBrick = useCallback(
    async (brick: Brick): Promise<BrickConfig> => {
      const outputKey = await generateFreshOutputKey(
        brick,
        compact([
          "input" as OutputKey,
          ...Object.values(pipelineMap).map((x) => x.blockConfig.outputKey),
        ]),
      );
      const newBlock = createNewConfiguredBrick(brick.id, {
        brickInputSchema: brick.inputSchema,
      });
      if (outputKey) {
        newBlock.outputKey = outputKey;
      }

      return newBlock;
    },
    [pipelineMap],
  );

  /**
   * Create a copy of the active mod component, add the brick, and then
   * run brick-level analyses to determine if there are any issues
   * with adding the particular brick.
   */
  const testAddBrick = useCallback(
    async (block: Brick): Promise<TestAddBrickResult> => {
      if (!addBlockLocation) {
        return {};
      }

      // Add the block to a copy of the mod component
      const newBlock = await makeNewBrick(block);
      const newModComponent = produce(activeModComponent, (draft) => {
        const pipeline = get(draft, addBlockLocation.path) as
          | BrickConfig[]
          | undefined;
        assertNotNullish(
          pipeline,
          `The path provided to add a block could not be found: ${addBlockLocation.path}`,
        );
        pipeline.splice(addBlockLocation.index, 0, newBlock);
      });

      // Run the block-level analyses and gather annotations
      const analyses = makeBrickLevelAnalyses();
      const annotationSets = await Promise.all(
        analyses.map(async (analysis) => {
          await analysis.run(newModComponent);
          return analysis.getAnnotations();
        }),
      );
      const annotations = annotationSets.flat();
      const newBlockPath = joinPathParts(
        addBlockLocation.path,
        addBlockLocation.index,
      );

      // Find annotations for the added block
      const newBlockAnnotation = annotations.find(
        (annotation) => annotation.position.path === newBlockPath,
      );

      if (newBlockAnnotation) {
        return { error: newBlockAnnotation.message };
      }

      return {};
    },
    [activeModComponent, addBlockLocation, makeNewBrick],
  );

  const addBrick = useCallback(
    async (brick: Brick) => {
      if (!addBlockLocation) {
        return;
      }

      const newBlock = await makeNewBrick(brick);

      dispatch(
        actions.addNode({
          block: newBlock,
          pipelinePath: addBlockLocation.path,
          pipelineIndex: addBlockLocation.index,
        }),
      );

      reportEvent(Events.BRICK_ADD, {
        brickId: brick.id,
        sessionId,
        extensionId: activeModComponent.uuid,
        source: "PageEditor-BrickSearchModal",
      });
    },
    [
      activeModComponent?.uuid,
      addBlockLocation,
      dispatch,
      makeNewBrick,
      sessionId,
    ],
  );

  return {
    testAddBrick,
    addBrick,
  };
}

export default useAddBrick;
