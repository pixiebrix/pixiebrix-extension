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

import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { makeInitialBrickPipelineUIState } from "@/pageEditor/store/editor/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import { type UUID } from "@/types/stringTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type Draft } from "immer";

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

export function ensureBrickPipelineUIState(
  state: Draft<EditorState>,
  modComponentId: UUID,
) {
  if (!state.brickPipelineUIStateById[modComponentId]) {
    state.brickPipelineUIStateById[modComponentId] =
      makeInitialBrickPipelineUIState();
    const pipeline = state.modComponentFormStates.find(
      (x) => x.uuid === modComponentId,
    )?.modComponent.brickPipeline;

    assertNotNullish(
      pipeline,
      `Pipeline not found for mod component id: ${modComponentId}`,
    );

    state.brickPipelineUIStateById[modComponentId].pipelineMap =
      getPipelineMap(pipeline);
  }
}

/* eslint-enable security/detect-object-injection */
