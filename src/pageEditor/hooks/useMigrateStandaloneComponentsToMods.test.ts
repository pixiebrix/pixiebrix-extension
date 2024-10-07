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

import { renderHook } from "@/pageEditor/testHelpers";
import useMigrateStandaloneComponentsToMods from "@/pageEditor/hooks/useMigrateStandaloneComponentsToMods";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { array } from "cooky-cutter";

describe("useMigrateStandaloneComponentsToMods", () => {
  test("given empty form states and components, does nothing", () => {
    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
        },
      },
    );

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("given only activated components, does nothing", () => {
    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
          dispatch(
            modComponentActions.UNSAFE_setModComponents(
              array(activatedModComponentFactory, 3)(),
            ),
          );
        },
      },
    );

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("given unsaved form state, does not migrate", () => {
    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
          dispatch(editorActions.addModComponentFormState(formStateFactory()));
        },
      },
    );

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("given activated component with no mod metadata and a form state, logs a warning and does nothing", () => {
    // Handle completely missing _recipe property
    const standaloneComponent = activatedModComponentFactory();
    delete standaloneComponent._recipe;

    const consoleWarnSpy = jest.spyOn(console, "warn");

    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
          dispatch(
            modComponentActions.UNSAFE_setModComponents([standaloneComponent]),
          );
          dispatch(
            editorActions.addModComponentFormState(
              formStateFactory({
                formStateConfig: { uuid: standaloneComponent.id },
              }),
            ),
          );
        },
      },
    );

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Found activated mod component without mod metadata",
      standaloneComponent,
    );

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("given activated component with mod metadata, syncs the form state", () => {
    const modMetadata = modMetadataFactory();
    const standaloneComponent = activatedModComponentFactory({
      _recipe: modMetadata,
    });
    const formState = formStateFactory({
      formStateConfig: { uuid: standaloneComponent.id },
    });

    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
          dispatch(
            modComponentActions.UNSAFE_setModComponents([standaloneComponent]),
          );
          dispatch(editorActions.addModComponentFormState(formState));
        },
      },
    );

    const { dispatch } = getReduxStore();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      editorActions.syncModComponentFormState({
        ...formState,
        modMetadata,
      }),
    );
  });

  test("given various components and form states, migrates standalone form states correctly", async () => {
    // Mod 1 has components with _recipe but form states have not been migrated
    const modMetadata1 = modMetadataFactory();
    // Need to extract the id generation out of factories to prevent overlaps between components and form states
    const componentId1a = autoUUIDSequence();
    const modComponent1a = activatedModComponentFactory({
      id: componentId1a,
      _recipe: modMetadata1,
    });
    const componentId1b = autoUUIDSequence();
    const modComponent1b = activatedModComponentFactory({
      id: componentId1b,
      _recipe: modMetadata1,
    });
    const formState1b = formStateFactory({
      formStateConfig: { uuid: componentId1b },
    });
    const componentId1c = autoUUIDSequence();
    const modComponent1c = activatedModComponentFactory({
      id: componentId1c,
      _recipe: modMetadata1,
    });
    const formState1c = formStateFactory({
      formStateConfig: { uuid: componentId1c },
    });

    const standaloneComponentId = autoUUIDSequence();
    const standaloneComponent = activatedModComponentFactory({
      id: standaloneComponentId,
    });
    delete standaloneComponent._recipe;

    // Mod 2 has no form states
    const modMetadata2 = modMetadataFactory();
    const componentId2 = autoUUIDSequence();
    const modComponent2 = activatedModComponentFactory({
      id: componentId2,
      _recipe: modMetadata2,
    });

    // Mod 3 has two components with form states created with the mod metadata already
    const modMetadata3 = modMetadataFactory();
    const componentId3a = autoUUIDSequence();
    const modComponent3a = activatedModComponentFactory({
      id: componentId3a,
      _recipe: modMetadata3,
    });
    const formState3a = formStateFactory({
      formStateConfig: {
        uuid: componentId3a,
        modMetadata: modMetadata3,
      },
    });
    const componentId3b = autoUUIDSequence();
    const modComponent3b = activatedModComponentFactory({
      id: componentId3b,
      _recipe: modMetadata3,
    });
    const formState3b = formStateFactory({
      formStateConfig: {
        uuid: componentId3b,
        modMetadata: modMetadata3,
      },
    });

    // Form state 4 is a newly created form state with no mod component or mod
    const componentId4 = autoUUIDSequence();
    const formState4 = formStateFactory({
      formStateConfig: { uuid: componentId4 },
    });

    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
          dispatch(
            modComponentActions.UNSAFE_setModComponents([
              modComponent1a,
              modComponent1b,
              modComponent1c,
              standaloneComponent,
              modComponent2,
              modComponent3a,
              modComponent3b,
            ]),
          );
          dispatch(editorActions.addModComponentFormState(formState1b));
          dispatch(editorActions.addModComponentFormState(formState1c));
          dispatch(editorActions.addModComponentFormState(formState3a));
          dispatch(editorActions.addModComponentFormState(formState3b));
          dispatch(editorActions.addModComponentFormState(formState4));
        },
      },
    );

    const { dispatch } = getReduxStore();

    // Only Mod 1's form states should be migrated
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(
      editorActions.syncModComponentFormState({
        ...formState1b,
        modMetadata: modMetadata1,
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      editorActions.syncModComponentFormState({
        ...formState1c,
        modMetadata: modMetadata1,
      }),
    );
  });
});
