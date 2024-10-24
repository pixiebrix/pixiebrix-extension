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
  getModalDataSelector,
  selectActiveModComponentFormState,
  selectPipelineMap,
} from "@/pageEditor/store/editor/editorSelectors";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import BrickTypeAnalysis from "@/analysis/analysisVisitors/brickTypeAnalysis";
import { type BrickConfig } from "@/bricks/types";
import FormBrickAnalysis from "@/analysis/analysisVisitors/formBrickAnalysis";
import RenderersAnalysis from "@/analysis/analysisVisitors/renderersAnalysis";
import { type Analysis } from "@/analysis/analysisTypes";
import { produce } from "immer";
import { createNewConfiguredBrick } from "@/bricks/exampleBrickConfigs";
import { type OutputKey } from "@/types/runtimeTypes";
import { type Brick } from "@/types/brickTypes";
import { joinPathParts } from "@/utils/formUtils";
import { assertNotNullish } from "@/utils/nullishUtils";
import { ModalKey } from "@/pageEditor/store/editor/pageEditorTypes";

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
  const { addBrickLocation } = useSelector(
    getModalDataSelector(ModalKey.ADD_BRICK),
  );

  const makeNewBrick = useCallback(
    async (brick: Brick): Promise<BrickConfig> => {
      const outputKey = await generateFreshOutputKey(
        brick,
        compact([
          "input" as OutputKey,
          ...Object.values(pipelineMap).map((x) => x.blockConfig.outputKey),
        ]),
      );
      const newBrick = createNewConfiguredBrick(brick.id, {
        brickInputSchema: brick.inputSchema,
      });
      if (outputKey) {
        newBrick.outputKey = outputKey;
      }

      return newBrick;
    },
    [pipelineMap],
  );

  /**
   * Create a copy of the active mod component, add the brick, and then
   * run brick-level analyses to determine if there are any issues
   * with adding the particular brick.
   */
  const testAddBrick = useCallback(
    async (brick: Brick): Promise<TestAddBrickResult> => {
      if (!addBrickLocation || !activeModComponent) {
        return {};
      }

      // Add the brick to a copy of the mod component
      const newBrick = await makeNewBrick(brick);

      const newModComponent = produce(activeModComponent, (draft) => {
        const pipeline = get(draft, addBrickLocation.path) as
          | BrickConfig[]
          | undefined;
        assertNotNullish(
          pipeline,
          `The path provided to add a brick could not be found: ${addBrickLocation.path}`,
        );
        pipeline.splice(addBrickLocation.index, 0, newBrick);
      });

      // Run the brick-level analyses and gather annotations
      const analyses = makeBrickLevelAnalyses();
      const annotationSets = await Promise.all(
        analyses.map(async (analysis) => {
          await analysis.run(newModComponent);
          return analysis.getAnnotations();
        }),
      );
      const annotations = annotationSets.flat();
      const newBrickPath = joinPathParts(
        addBrickLocation.path,
        addBrickLocation.index,
      );

      // Find annotations for the added brick
      const newBrickAnnotation = annotations.find(
        (annotation) => annotation.position.path === newBrickPath,
      );

      if (newBrickAnnotation) {
        return { error: newBrickAnnotation.message };
      }

      return {};
    },
    [activeModComponent, addBrickLocation, makeNewBrick],
  );

  const addBrick = useCallback(
    async (brick: Brick) => {
      if (!addBrickLocation || !activeModComponent) {
        return;
      }

      const newBrick = await makeNewBrick(brick);

      dispatch(
        actions.addNode({
          block: newBrick,
          pipelinePath: addBrickLocation.path,
          pipelineIndex: addBrickLocation.index,
        }),
      );

      reportEvent(Events.BRICK_ADD, {
        brickId: brick.id,
        sessionId,
        modComponentId: activeModComponent.uuid,
        source: "PageEditor-BrickSearchModal",
      });
    },
    [
      activeModComponent?.uuid,
      addBrickLocation,
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
