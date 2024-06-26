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

import { configureStore, type Store } from "@reduxjs/toolkit";
import { renderHook, act } from "@testing-library/react-hooks";
import React from "react";
import { Provider } from "react-redux";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { savingExtensionSlice } from "./savingExtensionSlice";
import useSavingWizard from "./useSavingWizard";
import useUpsertModComponentFormStateMock from "@/pageEditor/hooks/useUpsertModComponentFormState";
import useResetExtensionMock from "@/pageEditor/hooks/useResetExtension";
import {
  useCreateModDefinitionMutation as useCreateModDefinitionMutationMock,
  useUpdateModDefinitionMutation as useUpdateModDefinitionMutationMock,
  useGetEditablePackagesQuery as useGetEditablePackagesQueryMock,
} from "@/data/service/api";
import { selectModComponentFormStates } from "@/pageEditor/slices/editorSelectors";
import { uuidv4 } from "@/types/helpers";
import menuItem from "@/pageEditor/starterBricks/menuItem";
import pDefer from "p-defer";
import { pick } from "lodash";
import extensionsSlice from "@/store/extensionsSlice";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import {
  formStateFactory,
  menuItemFormStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { minimalUiSchemaFactory } from "@/utils/schemaUtils";

jest.mock("@/pageEditor/hooks/useUpsertModComponentFormState");
jest.mock("@/pageEditor/hooks/useResetExtension");

jest.mock("@/data/service/api", () => ({
  useCreateModDefinitionMutation: jest.fn().mockReturnValue([]),
  useUpdateModDefinitionMutation: jest.fn().mockReturnValue([]),
  useGetEditablePackagesQuery: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
  }),
}));

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useAllModDefinitions: jest.fn().mockReturnValue({
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
  const modDefinition = defaultModDefinitionFactory();
  jest.mocked(useAllModDefinitions).mockReturnValue({
    data: [modDefinition],
    isLoading: false,
  } as any);

  const modMetadata = modMetadataFactory(modDefinition.metadata);
  const modComponentFormState = formStateFactory({
    recipe: modMetadata,
  });

  const store = createStore();
  store.dispatch(
    editorSlice.actions.addModComponentFormState(modComponentFormState),
  );

  const { result } = renderUseSavingWizard(store);
  // Modal is closed.
  expect(result.current.isWizardOpen).toBe(false);

  // Save will open the modal window.
  // Should not await for the promise to resolve to check that window is open.
  void act(async () => expect(result.current.save()).toResolve());

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

test("saves non packaged mod component form state", async () => {
  const modComponentFormState = formStateFactory();
  const store = createStore();
  store.dispatch(
    editorSlice.actions.addModComponentFormState(modComponentFormState),
  );

  const createMock = jest.fn();
  jest
    .mocked(useUpsertModComponentFormStateMock)
    .mockReturnValueOnce(createMock);

  const { result } = renderUseSavingWizard(store);

  void act(async () => expect(result.current.save()).toResolve());

  expect(result.current.isSaving).toBe(true);
  expect(createMock).toHaveBeenCalledTimes(1);
  expect(createMock).toHaveBeenCalledWith({
    modComponentFormState,
    options: {
      // Single ModComponentBase, so need to push as StandaloneModDefinition an handle all permissions/notifications/reactivation
      pushToCloud: true,
      checkPermissions: true,
      notifySuccess: true,
      reactivateEveryTab: true,
    },
  });
});

describe("saving a mod component", () => {
  const modOptions: ModOptionsDefinition = {
    schema: {
      type: "object",
      properties: {
        channels: {
          type: "string",
          title: "Channels",
        },
      },
    },
    uiSchema: minimalUiSchemaFactory(),
  };
  const setupMocks = () => {
    const modDefinition = defaultModDefinitionFactory({
      options: modOptions,
    });
    jest.mocked(useAllModDefinitions).mockReturnValue({
      data: [modDefinition],
      isLoading: false,
    } as any);

    jest.mocked(useGetEditablePackagesQueryMock).mockReturnValue({
      data: [{ name: modDefinition.metadata.id, id: uuidv4() }],
      isLoading: false,
    } as any);

    const extensionLabel = modDefinition.extensionPoints[0].label;
    const menuItemFormState = menuItemFormStateFactory({
      label: extensionLabel,
      recipe: {
        ...modDefinition.metadata,
        updated_at: modDefinition.updated_at,
        sharing: modDefinition.sharing,
      },
      optionsDefinition: modOptions,
    });
    const extension = menuItem.selectExtension(menuItemFormState);
    extension._recipe = menuItemFormState.recipe;
    const store = createStore({
      options: {
        extensions: [extension],
      },
    });
    store.dispatch(
      editorSlice.actions.addModComponentFormState(menuItemFormState),
    );

    const createMock = jest.fn();
    jest.mocked(useUpsertModComponentFormStateMock).mockReturnValue(createMock);

    const resetMock = jest.fn();
    jest.mocked(useResetExtensionMock).mockReturnValue(resetMock);

    const createModMock = jest.fn();
    jest
      .mocked(useCreateModDefinitionMutationMock)
      .mockReturnValue([createModMock] as any);

    const updateModMock = jest.fn();
    jest
      .mocked(useUpdateModDefinitionMutationMock)
      .mockReturnValue([updateModMock] as any);

    return {
      store,
      modComponentFormState: menuItemFormState,
      recipe: modDefinition,
      createMock,
      resetMock,
      createModMock,
      updateModMock,
    };
  };

  test("saves as personal extension", async () => {
    const { store, recipe, createMock, resetMock } = setupMocks();

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    void act(async () => expect(result.current.save()).toResolve());

    // Ensure the Saving dialog is open, but saving hasn't started yet
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(false);

    // These defers let us go through saveAsPersonalModComponent step by step
    const resettingElementDeferred = pDefer<void>();
    resetMock.mockReturnValueOnce(resettingElementDeferred.promise);
    const creatingElementDeferred = pDefer<void>();
    createMock.mockReturnValueOnce(creatingElementDeferred.promise);

    // Saving as personal mod component
    // Invoke the saveElementAsPersonalExtension but don't wait for it to resolve yet
    const savingElementPromise = act(async () =>
      result.current.saveElementAsPersonalExtension(),
    );

    // Check wizard state
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(true);

    // Check new mod component form state added to redux store
    const modComponentFormStates = selectModComponentFormStates(
      store.getState(),
    );
    expect(modComponentFormStates).toHaveLength(2);
    expect(modComponentFormStates[0].recipe).toStrictEqual({
      ...recipe.metadata,
      ...pick(recipe, ["sharing", "updated_at"]),
    });
    expect(modComponentFormStates[0].optionsDefinition).toStrictEqual(
      modOptions,
    );

    expect(modComponentFormStates[1].recipe).toBeUndefined();
    expect(modComponentFormStates[1].optionsDefinition).toBeUndefined();

    // Check the source mod component form state is reset
    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(resetMock).toHaveBeenCalledWith({
      extensionId: modComponentFormStates[0].uuid,
      shouldShowConfirmation: false,
    });

    // Resolving the reset promise to go further in the saveElementAsPersonalExtension
    resettingElementDeferred.resolve();
    await resettingElementDeferred.promise;

    // Check new mod component form state is saved
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      modComponentFormState: modComponentFormStates[1],
      options: {
        // Single ModComponentBase, so need to push as StandaloneModDefinition an handle all permissions/notifications/reactivation
        pushToCloud: true,
        // FIXME: verify checkPermissions should be false
        checkPermissions: false,
        notifySuccess: true,
        reactivateEveryTab: true,
      },
    });

    // Resolving the create promise to go further in the saveElementAsPersonalExtension
    creatingElementDeferred.resolve();
    await creatingElementDeferred.promise;

    // Check the original mod component form state is uninstalled
    expect(selectModComponentFormStates(store.getState())).toHaveLength(1);

    // Waiting for the saveElementAsPersonalExtension to complete entirely
    await savingElementPromise;

    // Check wizard state after saving
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  test("saves as new mod", async () => {
    const { store, modComponentFormState, createMock, createModMock } =
      setupMocks();
    createModMock.mockReturnValueOnce({});

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    act(() => {
      void result.current.save();
    });

    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(false);

    // Saving with a new mod
    const newModMeta = metadataFactory();
    const savingElementPromise = act(async () =>
      result.current.saveElementAndCreateNewRecipe(newModMeta),
    );

    // Check wizard state
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(true);

    await savingElementPromise;

    // Check new mod created
    expect(createModMock).toHaveBeenCalledTimes(1);

    // Check the mod component form state is saved
    expect(createMock).toHaveBeenCalledWith({
      modComponentFormState,
      options: {
        pushToCloud: false,
        // New ModDefinition with single ModComponentDefinition, so let create handle permissions
        // check/notifications/reactivation
        checkPermissions: true,
        notifySuccess: true,
        reactivateEveryTab: true,
      },
      modId: newModMeta.id,
    });

    const modComponentFormStates = selectModComponentFormStates(
      store.getState(),
    );
    expect(modComponentFormStates).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(1);

    // Check the wizard is closed
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  test("doesn't update extensions if mod creation fails", async () => {
    const { store, createMock, createModMock } = setupMocks();
    createModMock.mockReturnValueOnce({
      error: "Error for test",
    });

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    let savingPromise: Promise<void>;
    act(() => {
      savingPromise = result.current.save();
    });

    // Saving with a new mod
    const newModMeta = metadataFactory();
    let creatingModPromise: Promise<void>;
    act(() => {
      creatingModPromise =
        result.current.saveElementAndCreateNewRecipe(newModMeta);
    });

    try {
      await creatingModPromise;
      await savingPromise;
    } catch (error) {
      expect(error).toBe("Failed to create new mod");
    }

    // Wizard closes on error
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);

    // Check it tried to create a mod
    expect(createModMock).toHaveBeenCalledTimes(1);

    // Check the mod component form state is not saved
    expect(createMock).not.toHaveBeenCalled();
  });

  test("updates the mod", async () => {
    const { store, modComponentFormState, recipe, createMock, updateModMock } =
      setupMocks();
    updateModMock.mockReturnValueOnce({});

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    act(() => {
      void result.current.save();
    });

    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(false);

    // Saving with a new mod
    const newModMeta = metadataFactory({ id: recipe.metadata.id });
    const savingModComponentFormStatePromise = act(async () =>
      result.current.saveElementAndUpdateRecipe(newModMeta),
    );

    // Check wizard state
    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isSaving).toBe(true);

    await savingModComponentFormStatePromise;

    // Check new mod created
    expect(updateModMock).toHaveBeenCalledTimes(1);

    // Check the mod component form state is saved
    expect(createMock).toHaveBeenCalledWith({
      modComponentFormState,
      options: {
        // FIXME: is this correct?
        pushToCloud: true,
        checkPermissions: true,
        notifySuccess: true,
        reactivateEveryTab: true,
      },
      modId: newModMeta.id,
    });

    const modComponentFormStates = selectModComponentFormStates(
      store.getState(),
    );
    expect(modComponentFormStates).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(1);

    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  test("doesn't update extensions if mod update fails", async () => {
    const { store, createMock, updateModMock } = setupMocks();
    updateModMock.mockReturnValueOnce({
      error: "Error for test",
    });

    // Render hook
    const { result } = renderUseSavingWizard(store);

    // Get into the saving process
    let savingPromise: Promise<void>;
    act(() => {
      savingPromise = result.current.save();
    });

    // Saving with a new mod
    const newModMeta = metadataFactory();
    let updatingModPromise: Promise<void>;
    act(() => {
      updatingModPromise =
        result.current.saveElementAndUpdateRecipe(newModMeta);
    });

    try {
      await updatingModPromise;
      await savingPromise;
    } catch (error) {
      expect(error).toBe("Failed to update the mod");
    }

    // Wizard closes on error
    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);

    // Check it tried to create a mod
    expect(updateModMock).toHaveBeenCalledTimes(1);

    // Check the mod component form state is not saved
    expect(createMock).not.toHaveBeenCalled();
  });
});
