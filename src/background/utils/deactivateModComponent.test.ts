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

import deactivateModComponent from "@/background/utils/deactivateModComponent";
import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { makeInitialBrickPipelineUIState } from "@/pageEditor/store/editor/uiState";
import { getEditorState, saveEditorState } from "@/store/editorStorage";
import {
  saveModComponentState,
  getModComponentState,
} from "@/store/modComponents/modComponentStorage";
import { activatedModComponentFactory } from "@/testUtils/factories/modComponentFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { uuidv4 } from "@/types/helpers";

describe("deactivateModComponent", () => {
  const modComponentId = uuidv4();

  beforeEach(async () => {
    await saveModComponentState({
      activatedModComponents: [
        activatedModComponentFactory({ id: modComponentId }),
        activatedModComponentFactory(),
        activatedModComponentFactory(),
      ],
    });

    await saveEditorState({
      modComponentFormStates: [
        formStateFactory({
          formStateConfig: {
            uuid: modComponentId,
          },
        }),
      ],
      dirty: {
        [modComponentId]: true,
      },
      brickPipelineUIStateById: {
        [modComponentId]: makeInitialBrickPipelineUIState(),
      },
      availableDraftModComponentIds: [modComponentId],
    } as EditorState);
  });

  it("should remove the mod component from the modComponentState", async () => {
    const modComponentState = await getModComponentState();

    const { modComponentState: nextModComponentState } = deactivateModComponent(
      modComponentId,
      {
        modComponentState,
        editorState: undefined,
      },
    );

    expect(nextModComponentState.activatedModComponents).toHaveLength(2);
    expect(nextModComponentState.activatedModComponents).not.toContain(
      modComponentId,
    );
  });

  it("removes the mod component from the editorState if editorState is provided", async () => {
    const editorState = await getEditorState();
    const modComponentState = await getModComponentState();

    expect(editorState!.modComponentFormStates).toHaveLength(1);

    const { editorState: nextEditorState } = deactivateModComponent(
      modComponentId,
      {
        modComponentState,
        editorState,
      },
    );

    expect(nextEditorState!.modComponentFormStates).toHaveLength(0);
  });
});
