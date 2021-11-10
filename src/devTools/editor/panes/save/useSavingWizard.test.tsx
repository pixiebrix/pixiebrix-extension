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

import { optionsSlice } from "@/options/slices";
import { configureStore, EnhancedStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react-hooks";
import React from "react";
import { Provider } from "react-redux";
import { editorSlice } from "@/devTools/editor/slices/editorSlice";
import { savingExtensionSlice } from "./savingExtensionSlice";
import useSavingWizard from "./useSavingWizard";
import { formStateFactory, metadataFactory } from "@/tests/factories";
import { waitForEffect } from "@/tests/testHelpers";

jest.unmock("react-redux");

jest.mock("@/services/api", () => ({
  useCreateRecipeMutation: jest.fn().mockReturnValue([]),
  useUpdateRecipeMutation: jest.fn().mockReturnValue([]),
  useGetRecipesQuery: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
  }),
  useGetEditablePackagesQuery: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
  }),
}));

let store: EnhancedStore;
beforeEach(() => {
  store = configureStore({
    reducer: {
      options: optionsSlice.reducer,
      editor: editorSlice.reducer,
      savingExtension: savingExtensionSlice.reducer,
    },
  });
});
afterAll(() => {
  jest.resetAllMocks();
});

test("maintains wizard open state", () => {
  const metadata = metadataFactory();
  const element = formStateFactory({
    recipe: metadata,
  });
  store.dispatch(editorSlice.actions.addElement(element));

  const { result } = renderHook(() => useSavingWizard(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

  expect(result.current.isWizardOpen).toBe(false);

  // Save will open the modal window.
  // Should not await for the promise to resolve to check that window is open.
  void result.current.save();

  expect(result.current.isWizardOpen).toBe(true);

  const { result: anotherResult } = renderHook(() => useSavingWizard(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  expect(anotherResult.current.isWizardOpen).toBe(true);
});
