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
import { hookAct, renderHook } from "@/pageEditor/testHelpers";
import useSaveMod, { isModEditable } from "@/pageEditor/hooks/useSaveMod";
import { validateRegistryId } from "@/types/helpers";
import { appApiMock } from "@/testUtils/appApiMock";
import { editablePackageMetadataFactory } from "@/testUtils/factories/registryFactories";
import notify from "@/utils/notify";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { type SemVerString } from "@/types/registryTypes";
import modDefinitionRegistry from "@/modDefinitions/registry";
import { loadBrickYaml } from "@/runtime/brickYaml";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import type { components } from "@/types/swagger";
import {
  actions as editorActions,
  editorSlice,
} from "@/pageEditor/store/editor/editorSlice";
import type { EditablePackageMetadata } from "@/types/contract";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { type UUID } from "@/types/stringTypes";
import { API_PATHS } from "@/data/service/urlPaths";
import { createNewUnsavedModMetadata } from "@/utils/modUtils";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";

const modId = validateRegistryId("@test/mod");

jest.mock("@/utils/notify");
jest.mock("@/contentScript/messenger/api");

describe("useSaveMod", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves with no dirty changes", async () => {
    appApiMock.reset();

    const editablePackage = editablePackageMetadataFactory({
      name: modId,
    });

    const definition = defaultModDefinitionFactory({
      metadata: {
        id: editablePackage.name,
        name: editablePackage.verbose_name!,
        version: editablePackage.version as SemVerString,
      },
    });

    // Register directly in modDefinitionRegistry because background call to sync with the bricks registry endpoint is mocked
    modDefinitionRegistry.register([
      {
        id: modId,
        ...definition,
      },
    ]);

    appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);

    appApiMock.onPut(API_PATHS.BRICK(editablePackage.id)).reply(200, {});
    appApiMock.onPut(API_PATHS.BRICK(editablePackage.id)).reply(200, {});

    const { result, waitForEffect } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition: definition,
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

    expect(notify.success).toHaveBeenCalledWith("Saved mod");
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("preserves original options if no dirty options", async () => {
    appApiMock.reset();

    const editablePackage = editablePackageMetadataFactory({
      name: modId,
    });

    const definition = defaultModDefinitionFactory({
      metadata: {
        id: editablePackage.name,
        name: editablePackage.verbose_name!,
        version: editablePackage.version as SemVerString,
      },
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

    // Register directly in modDefinitionRegistry because background call to sync with API_PATHS.REGISTRY_BRICKS is mocked
    // This data structure is not quite what happens in practice because the modDefinitionRegistry factory calls
    // normalizeModOptionsDefinition during hydration.
    modDefinitionRegistry.register([
      {
        id: modId,
        ...definition,
      },
    ]);

    appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);

    const putMock = appApiMock
      .onPut(API_PATHS.BRICK(editablePackage.id))
      .reply(200, {});

    const { result, waitForEffect } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition: definition,
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

    expect(notify.success).toHaveBeenCalledWith("Saved mod");

    const yamlConfig = (
      JSON.parse(
        putMock.history.put![0]!.data,
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
    appApiMock.reset();

    const editablePackage = editablePackageMetadataFactory({
      name: modId,
    });

    const definition = defaultModDefinitionFactory({
      metadata: {
        id: editablePackage.name,
        name: editablePackage.verbose_name!,
        version: editablePackage.version as SemVerString,
      },
    });

    // Register directly in modDefinitionRegistry because background call to sync with API_PATHS.REGISTRY_BRICKS is mocked
    // This data structure is not quite what happens in practice because the modDefinitionRegistry factory calls
    // normalizeModOptionsDefinition during hydration.
    modDefinitionRegistry.register([
      {
        id: modId,
        ...definition,
      },
    ]);

    appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);

    const putMock = appApiMock
      .onPut(API_PATHS.BRICK(editablePackage.id))
      .reply(200, {});

    const { result, waitForEffect } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition: definition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
        dispatch(editorSlice.actions.setActiveModId(modId));
        dispatch(
          editorSlice.actions.editModOptionsDefinitions({
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

    expect(notify.success).toHaveBeenCalledWith("Saved mod");

    const yamlConfig = (
      JSON.parse(
        putMock.history.put![0]!.data,
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

  it("opens the create mod modal if save is called with a temporary, internal mod", async () => {
    appApiMock.reset();

    const temporaryModId = createNewUnsavedModMetadata({
      modName: "Test Mod",
    }).id;

    const { result, waitForEffect, getReduxStore } = renderHook(
      () => useSaveMod(),
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
          dispatch(
            modComponentSlice.actions.activateMod({
              modDefinition: defaultModDefinitionFactory({
                metadata: modMetadataFactory({
                  id: temporaryModId,
                }),
              }),
              screen: "pageEditor",
              isReactivate: false,
            }),
          );
        },
      },
    );

    await waitForEffect();

    const { dispatch } = getReduxStore();

    await hookAct(async () => {
      await result.current(temporaryModId);
    });

    expect(dispatch).toHaveBeenCalledWith(
      editorActions.showCreateModModal({ keepLocalCopy: false }),
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
