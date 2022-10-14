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

import { createAsyncThunk } from "@reduxjs/toolkit";
import { EditorRootState } from "@/pageEditor/pageEditorTypes";
import { produce } from "immer";
import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import { uuidv4 } from "@/types/helpers";
import { normalizePipelineForEditor } from "@/pageEditor/extensionPoints/pipelineMapping";
import { actions } from "@/pageEditor/slices/editorSlice";

export const cloneActiveExtension = createAsyncThunk<
  void,
  void,
  { state: EditorRootState }
>("editor/cloneActiveExtension", async (arg, thunkAPI) => {
  const state = thunkAPI.getState();
  const newElement = await produce(
    selectActiveElement(state),
    async (draft) => {
      draft.uuid = uuidv4();
      draft.label += " - copy";
      // Remove from its recipe, if any (the user can add it to any recipe after creation)
      delete draft.recipe;
      // Re-generate instance IDs for all the bricks in the extension
      draft.extension.blockPipeline = await normalizePipelineForEditor(
        draft.extension.blockPipeline
      );
    }
  );
  // Add the cloned extension
  thunkAPI.dispatch(actions.addElement(newElement));
});
