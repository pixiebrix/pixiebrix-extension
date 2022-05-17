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

import React from "react";
import extensionsSlice from "@/store/extensionsSlice";
import { recipeFactory, recipeMetadataFactory } from "@/testUtils/factories";
import {
  createRenderFunctionWithRedux,
  RenderFunctionWithRedux,
} from "@/testUtils/testHelpers";
import {
  editorSlice,
  initialState as editorInitialState,
} from "@/pageEditor/slices/editorSlice";
import RecipeEntry, { RecipeEntryProps } from "./RecipeEntry";
import { SemVerString } from "@/core";
import { EditorState } from "@/pageEditor/pageEditorTypes";
import { ExtensionOptionsState } from "@/store/extensionsTypes";
import { validateSemVerString } from "@/types/helpers";

jest.unmock("react-redux");

let renderRecipeEntry: RenderFunctionWithRedux<
  {
    editor: EditorState;
    options: ExtensionOptionsState;
  },
  RecipeEntryProps
>;

beforeEach(() => {
  const recipe = recipeFactory();
  const recipeId = recipe.metadata.id;
  renderRecipeEntry = createRenderFunctionWithRedux({
    reducer: {
      editor: editorSlice.reducer,
      options: extensionsSlice.reducer,
    },
    preloadedState: {
      editor: {
        ...editorInitialState,
        expandedRecipeId: recipeId,
      },
    },
    ComponentUnderTest: RecipeEntry,
    defaultProps: {
      recipe,
      children: <div>test children</div>,
      installedVersion: validateSemVerString("1.0.0"),
    },
  });
});

test("it renders", () => {
  const rendered = renderRecipeEntry();

  expect(rendered.asFragment()).toMatchSnapshot();
});

test("renders with empty metadata", () => {
  const recipe = recipeFactory({ metadata: null });
  const rendered = renderRecipeEntry({
    propsOverride: {
      recipe,
    },
  });

  expect(rendered.asFragment()).toMatchSnapshot();
});

test("renders the warning icon when has update", () => {
  const recipe = recipeFactory({
    metadata: recipeMetadataFactory({
      version: validateSemVerString("2.0.0"),
    }),
  });
  const rendered = renderRecipeEntry({
    propsOverride: {
      recipe,
    },
  });

  const warningIcon = rendered.getByTitle(
    "You are editing version 1.0.0 of this blueprint, the latest version is 2.0.0."
  );

  expect(warningIcon).toBeInTheDocument();
});
