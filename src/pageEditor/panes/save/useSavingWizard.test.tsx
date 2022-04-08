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
/* eslint-disable promise/prefer-await-to-then */

import { configureStore, Store } from "@reduxjs/toolkit";
import { renderHook, act } from "@testing-library/react-hooks";
import React from "react";
import { Provider } from "react-redux";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { savingExtensionSlice } from "./savingExtensionSlice";
import useSavingWizard from "./useSavingWizard";
import {
  formStateFactory,
  menuItemFormStateFactory,
  recipeMetadataFactory,
  recipeFactory,
  installedRecipeMetadataFactory,
} from "@/testUtils/factories";
import useCreateMock from "@/pageEditor/hooks/useCreate";
import useResetMock from "@/pageEditor/hooks/useResetExtension";
import {
  useCreateRecipeMutation as useCreateRecipeMutationMock,
  useUpdateRecipeMutation as useUpdateRecipeMutationMock,
  useGetRecipesQuery as useGetRecipesQueryMock,
  useGetEditablePackagesQuery as useGetEditablePackagesQueryMock,
} from "@/services/api";
import { selectElements } from "@/pageEditor/slices/editorSelectors";
import { uuidv4 } from "@/types/helpers";
import menuItem from "@/pageEditor/extensionPoints/menuItem";
import pDefer from "p-defer";
import { pick } from "lodash";
import extensionsSlice from "@/store/extensionsSlice";
import { MINIMAL_UI_SCHEMA } from "@/components/formBuilder/formBuilderHelpers";
import { OptionsDefinition } from "@/types/definitions";

jest.unmock("react-redux");

jest.mock("@/telemetry/logging");
jest.mock("@/pageEditor/hooks/useCreate");
jest.mock("@/pageEditor/hooks/useResetExtension");

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

const createStore = (initialState?: any) =>
  configureStore({
    reducer: {
      options: extensionsSlice.reducer,
      editor: editorSlice.reducer,
      savingExtension: savingExtensionSlice.reducer,
    },
    preloadedState: initialState,
  });

afterEach(() => {
  jest.clearAllMocks();
});

const renderUseSavingWizard = (store: Store) =>
  renderHook(() => useSavingWizard(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

test("maintains wizard open state", () => {
  const recipe = recipeFactory();
  (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
    data: [recipe],
    isLoading: false,
  });
  const recipeMetadata = installedRecipeMetadataFactory(recipe.metadata);
  const element = formStateFactory({
    recipe: recipeMetadata,
  });

  const store = createStore();
  store.dispatch(editorSlice.actions.addElement(element));

  const { result } = renderUseSavingWizard(store);
  // Modal is closed.
  expect(result.current.isWizardOpen).toBe(false);

  // Save will open the modal window.
  // Should not await for the promise to resolve to check that window is open.
  act(() => {
    void result.current.save().catch((error) => {
      // Got an error, failing the test
      console.error(error);
      expect(error).toBeUndefined();
    });
  });

  // Modal is open/
  expect(result.current.isWizardOpen).toBe(true);

  const { result: anotherResult } = renderUseSavingWizard(store);
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
  const store = createStore();
  store.dispatch(editorSlice.actions.addElement(element));

  const createMock = jest.fn();
  (useCreateMock as jest.Mock).mockReturnValueOnce(createMock);

  const { result } = renderUseSavingWizard(store);

  act(() => {
    result.current.save().catch((error) => {
      // Got an error, failing the test
      console.error(error);
      expect(error).toBeUndefined();
    });
  });

  expect(result.current.isSaving).toBe(true);
  expect(createMock).toHaveBeenCalledTimes(1);
  expect(createMock).toHaveBeenCalledWith({ element, pushToCloud: true });
});

describe("saving a Recipe Extension", () => {
  const recipeOptions: OptionsDefinition = {
    schema: {
      type: "object",
      properties: {
        channels: {
          type: "string",
          title: "Channels",
        },
      },
    },
    uiSchema: MINIMAL_UI_SCHEMA,
  };
  const setupMocks = () => {
    const recipe = recipeFactory({
      options: recipeOptions,
    });
    (useGetRecipesQueryMock as jest.Mock).mockReturnValue({
      data: [recipe],
      isLoading: false,
    });

    (useGetEditablePackagesQueryMock as jest.Mock).mockReturnValue({
      data: [{ name: recipe.metadata.id, id: uuidv4() }],
      isLoading: false,
    });

    const extensionLabel = recipe.extensionPoints[0].label;
    const element = menuItemFormStateFactory({
      label: extensionLabel,
      recipe: {
        ...recipe.metadata,
        updated_at: recipe.updated_at,
        sharing: recipe.sharing,
      },
      optionsDefinition: recipeOptions,
    });
    const extension = menuItem.selectExtension(element);
    extension._recipe = element.recipe;
    const store = createStore({
      options: {
        extensions: [extension],
      },
    });
    store.dispatch(editorSlice.actions.addElement(element));

    const createMock = jest.fn();
    (useCreateMock as jest.Mock).mockReturnValue(createMock);

    const resetMock = jest.fn();
    // eslint-disable-next-line unicorn/no-useless-undefined -- the parameter is required, the async function return value is void
    resetMock.mockResolvedValue(undefined);
    (useResetMock as jest.Mock).mockReturnValue(resetMock);

    const createRecipeMock = jest.fn();
    (useCreateRecipeMutationMock as jest.Mock).mockReturnValue([
      createRecipeMock,
    ]);

    const updateRecipeMock = jest.fn();
    (useUpdateRecipeMutationMock as jest.Mock).mockReturnValue([
      updateRecipeMock,
    ]);

    return {
      store,
      element,
      recipe,
      createMock,
      resetMock,
      createRecipeMock,
      updateRecipeMock,
    };
  };

  test("saves as personal extension", async () => {
    const { store, recipe, createMock, resetMock } = setupMocks();

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    act(() => {
      void result.current.save().catch((error) => {
        // Got an error, failing the test
        console.error(error);
        expect(error).toBeUndefined();
      });
    });

    // Ensure the Saving dialog is open, but saving hasn't started yet
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(false);

    // These deferreds let us go through saveElementAsPersonalExtension step by step
    const resettingElementDeferred = pDefer<void>();
    resetMock.mockReturnValueOnce(resettingElementDeferred.promise);
    const creatingElementDeferred = pDefer<void>();
    createMock.mockReturnValueOnce(creatingElementDeferred.promise);

    // Saving as personal extension
    // Invoke the saveElementAsPersonalExtension but don't wait for it to resolve yet
    const savingElementPromise = act(async () =>
      result.current.saveElementAsPersonalExtension()
    );

    // Check wizard state
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(true);

    // Check new element added to redux store
    const elements = selectElements(store.getState());
    expect(elements).toHaveLength(2);
    expect(elements[0].recipe).toStrictEqual({
      ...recipe.metadata,
      ...pick(recipe, ["sharing", "updated_at"]),
    });
    expect(elements[0].optionsDefinition).toStrictEqual(recipeOptions);

    expect(elements[1].recipe).toBeUndefined();
    expect(elements[1].optionsDefinition).toBeUndefined();

    // Check the source element is reset
    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(resetMock).toHaveBeenCalledWith({
      element: elements[0],
      shouldShowConfirmation: false,
    });

    // Resolving the reset promise to go further in the saveElementAsPersonalExtension
    resettingElementDeferred.resolve();
    await resettingElementDeferred.promise;

    // Check new element is saved
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      element: elements[1],
      pushToCloud: true,
    });

    // Resolving the create promise to go further in the saveElementAsPersonalExtension
    creatingElementDeferred.resolve();
    await creatingElementDeferred.promise;

    // Check the original recipe element is uninstalled
    expect(selectElements(store.getState())).toHaveLength(1);

    // Waiting for the saveElementAsPersonalExtension to complete entirely
    await savingElementPromise;

    // Check wizard state after saving
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  test("saves as new recipe", async () => {
    const { store, element, createMock, createRecipeMock } = setupMocks();
    createRecipeMock.mockReturnValueOnce({});

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    act(() => {
      void result.current.save();
    });

    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(false);

    // Saving with a new Recipe
    const newRecipeMeta = recipeMetadataFactory();
    const savingElementPromise = act(async () =>
      result.current.saveElementAndCreateNewRecipe(newRecipeMeta)
    );

    // Check wizard state
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(true);

    await savingElementPromise;

    // Check new recipe created
    expect(createRecipeMock).toHaveBeenCalledTimes(1);

    // Check the element is saved
    expect(createMock).toHaveBeenCalledWith({ element, pushToCloud: false });

    const elements = selectElements(store.getState());
    expect(elements).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(1);

    // Check the wizard is closed
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  test("doesn't update extensions if recipe creation fails", async () => {
    const { store, createMock, createRecipeMock } = setupMocks();
    createRecipeMock.mockReturnValueOnce({
      error: "Error for test",
    });

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    let savingPromise: Promise<void>;
    act(() => {
      savingPromise = result.current.save();
    });

    // Saving with a new Recipe
    const newRecipeMeta = recipeMetadataFactory();
    let creatingRecipePromise: Promise<void>;
    act(() => {
      creatingRecipePromise =
        result.current.saveElementAndCreateNewRecipe(newRecipeMeta);
    });

    try {
      await creatingRecipePromise;
      await savingPromise;
    } catch (error) {
      expect(error).toBe("Failed to create new Blueprint");
    }

    // Wizard closes on error
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);

    // Check it tried to create a recipe
    expect(createRecipeMock).toHaveBeenCalledTimes(1);

    // Check the element is not saved
    expect(createMock).not.toHaveBeenCalled();
  });

  test("updates the recipe", async () => {
    const { store, element, recipe, createMock, updateRecipeMock } =
      setupMocks();
    updateRecipeMock.mockReturnValueOnce({});

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    act(() => {
      void result.current.save();
    });

    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(false);

    // Saving with a new Recipe
    const newRecipeMeta = recipeMetadataFactory({ id: recipe.metadata.id });
    const savingElementPromise = act(async () =>
      result.current.saveElementAndUpdateRecipe(newRecipeMeta)
    );

    // Check wizard state
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(true);

    await savingElementPromise;

    // Check new recipe created
    expect(updateRecipeMock).toHaveBeenCalledTimes(1);

    // Check the element is saved
    expect(createMock).toHaveBeenCalledWith({ element, pushToCloud: true });

    const elements = selectElements(store.getState());
    expect(elements).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(1);

    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  test("doesn't update extensions if recipe update fails", async () => {
    const { store, createMock, updateRecipeMock } = setupMocks();
    updateRecipeMock.mockReturnValueOnce({
      error: "Error for test",
    });

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    let savingPromise: Promise<void>;
    act(() => {
      savingPromise = result.current.save();
    });

    // Saving with a new Recipe
    const newRecipeMeta = recipeMetadataFactory();
    let updatingRecipePromise: Promise<void>;
    act(() => {
      updatingRecipePromise =
        result.current.saveElementAndUpdateRecipe(newRecipeMeta);
    });

    try {
      await updatingRecipePromise;
      await savingPromise;
    } catch (error) {
      expect(error).toBe("Failed to update the Blueprint");
    }

    // Wizard closes on error
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);

    // Check it tried to create a recipe
    expect(updateRecipeMock).toHaveBeenCalledTimes(1);

    // Check the element is not saved
    expect(createMock).not.toHaveBeenCalled();
  });
});
