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
import { hookAct, renderHook } from "../testHelpers";
import useSaveMod, { isModEditable } from "./useSaveMod";
import { validateRegistryId } from "../../types/helpers";
import { appApiMock } from "../../testUtils/appApiMock";
import { editablePackageMetadataFactory } from "../../testUtils/factories/registryFactories";
import notify from "../../utils/notify";
import { defaultModDefinitionFactory } from "../../testUtils/factories/modDefinitionFactories";
import { type SemVerString } from "../../types/registryTypes";
import modDefinitionRegistry from "../../modDefinitions/registry";
import { loadBrickYaml } from "../../runtime/brickYaml";
import { type ModDefinition } from "../../types/modDefinitionTypes";
import type { components } from "../../types/swagger";
import {
  actions as editorActions,
  editorSlice,
} from "../store/editor/editorSlice";
import type {
  EditablePackageMetadata,
  PackageUpsertResponse,
} from "../../types/contract";
import modComponentSlice from "../../store/modComponents/modComponentSlice";
import { type UUID } from "../../types/stringTypes";
import { API_PATHS } from "@/data/service/urlPaths";
import { createNewUnsavedModMetadata } from "../../utils/modUtils";
import { formStateFactory } from "../../testUtils/factories/pageEditorFactories";
import { createPrivateSharing } from "../../utils/registryUtils";
import { timestampFactory } from "../../testUtils/factories/stringFactories";
import { propertiesToSchema } from "../../utils/schemaUtils";

const modId = validateRegistryId("@test/mod");

jest.mock("../../utils/notify");
jest.mock("../../contentScript/messenger/api");

beforeEach(() => {
  jest.clearAllMocks();
});

function packageUpsertResponseFactory(
  editablePackage: EditablePackageMetadata,
): PackageUpsertResponse {
  return {
    ...editablePackage,
    ...createPrivateSharing(),
    updated_at: timestampFactory(),
    // OK to pass empty string because it's not relevant to the tests
    config: "",
  };
}

describe("useSaveMod", () => {
  function setupModDefinitionMocks(
    definitionOverrides: Partial<ModDefinition> = {},
  ) {
    appApiMock.reset();

    const editablePackage = editablePackageMetadataFactory({
      name: modId,
    });

    const modDefinition = defaultModDefinitionFactory({
      metadata: {
        id: editablePackage.name,
        name: editablePackage.verbose_name!,
        version: editablePackage.version as SemVerString,
      },
      ...definitionOverrides,
    });

    // Register directly in modDefinitionRegistry because background call to sync with the bricks registry endpoint is mocked
    modDefinitionRegistry.register([
      {
        id: modId,
        ...modDefinition,
      },
    ]);

    appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);

    appApiMock
      .onPut(API_PATHS.BRICK(editablePackage.id))
      .reply(200, packageUpsertResponseFactory(editablePackage));

    return {
      modDefinition,
    };
  }

  it("saves with no dirty changes", async () => {
    const { modDefinition } = setupModDefinitionMocks();

    const { result, waitForEffect } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await waitForEffect();

    await hookAct(async () => {
      await result.current(modId);
    });

    // Assert error first to assist with debugging failures
    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith("Saved mod");
  });

  it("preserves original options if no dirty options", async () => {
    const { modDefinition } = setupModDefinitionMocks({
      options: {
        schema: {
          type: "object",
          properties: {
            test: {
              type: "string",
            },
          },
        },
      },
    });

    const { result, waitForEffect } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await waitForEffect();

    await hookAct(async () => {
      await result.current(modId);
    });

    // Assert error first to assist with debugging failures
    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith("Saved mod");

    const yamlConfig = (
      JSON.parse(
        appApiMock.history.put[0]!.data,
      ) as components["schemas"]["Package"]
    ).config;

    expect((loadBrickYaml(yamlConfig) as ModDefinition).options).toStrictEqual({
      schema: {
        type: "object",
        properties: {
          test: {
            type: "string",
          },
        },
      },
    });
  });

  it("saves dirty options", async () => {
    const { modDefinition } = setupModDefinitionMocks();

    const { result, waitForEffect } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
        dispatch(editorSlice.actions.setActiveModId(modId));
        dispatch(
          editorSlice.actions.editModOptionsDefinition({
            schema: {
              type: "object",
              properties: {
                test: {
                  type: "string",
                },
              },
            },
          }),
        );
      },
    });

    await waitForEffect();

    await hookAct(async () => {
      await result.current(modId);
    });

    // Assert error first to assist with debugging failures
    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith("Saved mod");

    const yamlConfig = (
      JSON.parse(
        appApiMock.history.put[0]!.data,
      ) as components["schemas"]["Package"]
    ).config;

    expect((loadBrickYaml(yamlConfig) as ModDefinition).options).toStrictEqual({
      schema: {
        type: "object",
        properties: {
          test: {
            type: "string",
          },
        },
      },
      uiSchema: {
        "ui:order": ["test", "*"],
      },
    });
  });

  it("saves dirty mod variable definitions", async () => {
    const { modDefinition } = setupModDefinitionMocks();

    const { result, waitForEffect } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
        dispatch(editorSlice.actions.setActiveModId(modId));
        dispatch(
          editorSlice.actions.editModVariablesDefinition({
            schema: propertiesToSchema(
              { modVariableName: { type: "string" } },
              [],
            ),
          }),
        );
      },
    });

    await waitForEffect();

    await hookAct(async () => {
      await result.current(modId);
    });

    const yamlConfig = (
      JSON.parse(
        appApiMock.history.put[0]!.data,
      ) as components["schemas"]["Package"]
    ).config;

    expect(
      (loadBrickYaml(yamlConfig) as ModDefinition).variables,
    ).toStrictEqual({
      schema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {
          modVariableName: {
            type: "string",
          },
        },
        required: [],
      },
    });
  });

  it("opens the create mod modal if save is called with a temporary, internal mod", async () => {
    appApiMock.reset();

    const temporaryModMetadata = createNewUnsavedModMetadata({
      modName: "Test Mod",
    });

    const { result, waitForEffect, getReduxStore } = renderHook(
      () => useSaveMod(),
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");

          dispatch(
            editorActions.addModComponentFormState(
              formStateFactory({
                formStateConfig: {
                  modMetadata: temporaryModMetadata,
                },
              }),
            ),
          );
        },
      },
    );

    await waitForEffect();

    const { dispatch } = getReduxStore();

    await hookAct(async () => {
      await result.current(temporaryModMetadata.id);
    });

    expect(dispatch).toHaveBeenCalledWith(
      editorActions.showCreateModModal({
        keepLocalCopy: false,
        sourceModId: temporaryModMetadata.id,
      }),
    );
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });
});

describe("isModEditable", () => {
  test("returns true if mod is in editable packages", () => {
    const mod = defaultModDefinitionFactory();
    const editablePackages: EditablePackageMetadata[] = [
      {
        id: null as unknown as UUID,
        name: validateRegistryId("test/mod"),
      },
      {
        id: null as unknown as UUID,
        name: mod.metadata.id,
      },
    ] as EditablePackageMetadata[];

    expect(isModEditable(editablePackages, mod)).toBe(true);
  });

  test("returns false if mod is not in editable packages", () => {
    const mod = defaultModDefinitionFactory();
    const editablePackages: EditablePackageMetadata[] = [
      {
        id: null as unknown as UUID,
        name: validateRegistryId("test/mod"),
      },
    ] as EditablePackageMetadata[];

    expect(isModEditable(editablePackages, mod)).toBe(false);
  });

  test("returns false if mod is null", () => {
    const editablePackages: EditablePackageMetadata[] = [
      {
        id: null as unknown as UUID,
        name: validateRegistryId("test/mod"),
      },
    ] as EditablePackageMetadata[];

    expect(
      isModEditable(editablePackages, null as unknown as ModDefinition),
    ).toBe(false);
  });
});
