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
import { renderHook, act } from "@testing-library/react-hooks";
import React from "react";
import { Provider } from "react-redux";
import { editorSlice } from "@/devTools/editor/slices/editorSlice";
import { savingExtensionSlice } from "./savingExtensionSlice";
import useSavingWizard from "./useSavingWizard";
import { formStateFactory, metadataFactory } from "@/tests/factories";
import useCreateMock from "@/devTools/editor/hooks/useCreate";

jest.unmock("react-redux");

jest.mock("@/devTools/editor/hooks/useCreate");

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

const renderUseSavingWizard = () =>
  renderHook(() => useSavingWizard(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

test("maintains wizard open state", () => {
  const metadata = metadataFactory();
  const element = formStateFactory({
    recipe: metadata,
  });
  store.dispatch(editorSlice.actions.addElement(element));

  const { result } = renderUseSavingWizard();
  // Modal is closed.
  expect(result.current.isWizardOpen).toBe(false);

  // Save will open the modal window.
  // Should not await for the promise to resolve to check that window is open.
  act(() => {
    void result.current.save();
  });

  // Modal is open/
  expect(result.current.isWizardOpen).toBe(true);

  const { result: anotherResult } = renderUseSavingWizard();
  // Using hook in another component still report open Modal
  expect(anotherResult.current.isWizardOpen).toBe(true);

  act(() => {
    result.current.closeWizard();
  });

  // Closing Modal in one of the components triggers state update in all components
  expect(result.current.isWizardOpen).toBe(false);
  expect(anotherResult.current.isWizardOpen).toBe(false);
});

test("saves non recipe element", async () => {
  const element = formStateFactory();
  store.dispatch(editorSlice.actions.addElement(element));

  const createMock = jest.fn();
  (useCreateMock as jest.Mock).mockReturnValueOnce(createMock);

  const { result } = renderUseSavingWizard();

  act(() => {
    void result.current.save();
  });

  expect(result.current.savingExtensionId).toBe(element.uuid);
  expect(createMock).toHaveBeenCalledTimes(1);
  expect(createMock).toHaveBeenCalledWith(element, expect.any(Function));
});
