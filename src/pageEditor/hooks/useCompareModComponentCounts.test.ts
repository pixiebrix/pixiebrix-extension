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
import useCompareModComponentCounts from "@/pageEditor/hooks/useCompareModComponentCounts";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions as modComponentsActions } from "@/store/modComponents/modComponentSlice";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import {
  modComponentDefinitionFactory,
  modDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { array } from "cooky-cutter";

describe("useCompareModComponentCounts", () => {
  it("should return true for 1 clean component in state and 1 in the definition", () => {
    const modDefinition = modDefinitionFactory();
    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
      },
    });

    expect(result.current(modDefinition, {})).toBe(true);
  });

  it("should return true for 0 clean components and 1 dirty component in state and 1 in the definition", () => {
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
    });
    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(result.current(modDefinition, {})).toBe(true);
  });

  it("should return true for 1 clean component and 0 dirty components and 1 in the definition", () => {
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
      },
    });

    expect(result.current(modDefinition, {})).toBe(true);
  });

  it("should return true for 1 clean and 1 unmatching dirty component in state and 2 in the definition", () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
    });
    const unsavedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });

    const dirtyFormState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(dirtyFormState));
      },
    });

    expect(
      result.current(unsavedModDefinition, {
        sourceModDefinition: activatedModDefinition,
      }),
    ).toBe(true);
  });

  it("should return true for 3 clean and 2 unmatching dirty form state and 5 components in the definition", () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 3),
    });
    const unsavedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 5),
    });

    const dirtyFormState1 = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });
    const dirtyFormState2 = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(dirtyFormState1));
        dispatch(editorActions.addModComponentFormState(dirtyFormState2));
      },
    });

    expect(
      result.current(unsavedModDefinition, {
        sourceModDefinition: activatedModDefinition,
      }),
    ).toBe(true);
  });

  it("should return false for 1 clean and 1 unmatching form state and 1 in definition", () => {
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
    });
    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(result.current(modDefinition, {})).toBe(false);
  });

  it("should return false for 1 clean and 1 unmatching form state and 3 in definition", () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
    });
    const unsavedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 3),
    });

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(
      result.current(unsavedModDefinition, {
        sourceModDefinition: activatedModDefinition,
      }),
    ).toBe(false);
  });

  it("should return false for 1 clean and 0 unmatching form state and 0 in definition", () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
    });
    const unsavedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: [],
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
      },
    });

    expect(
      result.current(unsavedModDefinition, {
        sourceModDefinition: activatedModDefinition,
      }),
    ).toBe(false);
  });

  it("should return false for 1 clean and 0 unmatching form state and 2 in definition", () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
    });
    const unsavedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
      },
    });

    expect(
      result.current(unsavedModDefinition, {
        sourceModDefinition: activatedModDefinition,
      }),
    ).toBe(false);
  });

  it("should return false for 0 clean and 1 unmatching form state and 0 in definition", () => {
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: [],
    });

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(result.current(modDefinition, {})).toBe(false);
  });

  it("should return false for 0 clean and 1 unmatching form state and 2 in definition", () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: [],
    });
    const unsavedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(
      result.current(unsavedModDefinition, {
        sourceModDefinition: activatedModDefinition,
      }),
    ).toBe(false);
  });

  it("should return false for 3 clean and 1 unmatching form state and 3 in definition", () => {
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 3),
    });

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(result.current(modDefinition, {})).toBe(false);
  });

  it("should return false for 3 clean and 1 unmatching form state and 5 in definition", () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 3),
    });
    const unsavedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 5),
    });

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition: activatedModDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(
      result.current(unsavedModDefinition, {
        sourceModDefinition: activatedModDefinition,
      }),
    ).toBe(false);
  });

  it("should return true for 0 clean and 0 unmatching form state and includes new form state and 1 in definition", () => {
    const modDefinition = modDefinitionFactory();
    const newFormState = formStateFactory();

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(newFormState));
      },
    });

    expect(
      result.current(modDefinition, {
        newModComponentFormState: newFormState,
      }),
    ).toBe(true);
  });

  it("should return false for 0 clean and 0 unmatching form state and includes new form state and 2 in definition", () => {
    const modDefinition = modDefinitionFactory({
      extensionPoints: array(modComponentDefinitionFactory, 2),
    });
    const formState = formStateFactory();

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(
      result.current(modDefinition, { newModComponentFormState: formState }),
    ).toBe(false);
  });

  it("should return false for 0 clean and 0 unmatching form state and includes new form state and 0 in definition", () => {
    const modDefinition = modDefinitionFactory({
      extensionPoints: [],
    });
    const formState = formStateFactory();

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(
      result.current(modDefinition, { newModComponentFormState: formState }),
    ).toBe(false);
  });

  it("should return false for 1 clean and 0 unmatching form state and includes new form state and 1 in definition", () => {
    const modDefinition = modDefinitionFactory();
    const formState = formStateFactory();

    const { result } = renderHook(() => useCompareModComponentCounts(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.activateMod({
            modDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
      },
    });

    expect(
      result.current(modDefinition, { newModComponentFormState: formState }),
    ).toBe(false);
  });
});
