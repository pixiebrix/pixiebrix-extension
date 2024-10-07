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

import { type WizardValues } from "@/activation/wizardTypes";
import { renderHook } from "@/pageEditor/testHelpers";
import useActivateMod from "./useActivateMod";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { type ContextMenuDefinition } from "@/starterBricks/contextMenu/contextMenuTypes";
import { deactivateMod } from "@/store/deactivateUtils";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { type InnerDefinitions } from "@/types/registryTypes";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import databaseSchema from "@schemas/database.json";
import { set } from "lodash";
import {
  modComponentDefinitionFactory,
  starterBrickDefinitionFactory,
  defaultModDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { databaseFactory } from "@/testUtils/factories/databaseFactories";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { appApiMock } from "@/testUtils/appApiMock";
import type MockAdapter from "axios-mock-adapter";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { API_PATHS } from "@/data/service/urlPaths";
import { waitForEffect } from "@/testUtils/testHelpers";
import { editablePackageMetadataFactory } from "@/testUtils/factories/registryFactories";
import notify from "@/utils/notify";
import {
  type Deployment,
  type EditablePackageMetadata,
} from "@/types/contract";

jest.mock("@/contentScript/messenger/api");
jest.mock("@/utils/notify");
const mockedNotifyError = jest.mocked(notify.error);

const checkPermissionsMock = jest.mocked(checkModDefinitionPermissions);
const deactivateModMock = jest.mocked(deactivateMod);
const reactivateEveryTabMock = jest.mocked(reloadModsEveryTab);

function setupInputs(): {
  formValues: WizardValues;
  modDefinition: ModDefinition;
} {
  const formValues: WizardValues = {
    integrationDependencies: [],
    optionsArgs: {},
  };

  const starterBrickId = validateRegistryId("test/starter-brick-1");
  const modComponentDefinition = modComponentDefinitionFactory({
    id: starterBrickId,
  });
  const starterBrickDefinition = starterBrickDefinitionFactory({
    metadata: metadataFactory({
      id: starterBrickId,
      name: "Text Starter Brick 1",
    }),
    definition: {
      type: StarterBrickTypes.CONTEXT_MENU,
      isAvailable: {
        matchPatterns: ["*://*/*"],
        selectors: [],
        urlPatterns: [],
      },
      reader: [validateRegistryId("@pixiebrix/document-metadata")],
    },
  }) as StarterBrickDefinitionLike<ContextMenuDefinition>;
  starterBrickDefinition.definition.targetMode = "eventTarget";
  starterBrickDefinition.definition.contexts = ["all"];
  starterBrickDefinition.definition.documentUrlPatterns = ["*://*/*"];

  const modDefinition = defaultModDefinitionFactory({
    extensionPoints: [modComponentDefinition],
    definitions: {
      [starterBrickId]: starterBrickDefinition,
    } as unknown as InnerDefinitions,
  });

  return {
    formValues,
    modDefinition,
  };
}

function setModHasPermissions(hasPermissions: boolean) {
  checkPermissionsMock.mockResolvedValue({
    hasPermissions,
    // The exact permissions don't matter because we're mocking the check also
    permissions: emptyPermissionsFactory(),
  });
}

function setUserAcceptedPermissions(accepted: boolean) {
  jest.mocked(browser.permissions.request).mockResolvedValue(accepted);
}

describe("useActivateMod", () => {
  beforeEach(() => {
    reactivateEveryTabMock.mockClear();
    appApiMock.reset();
  });

  it("returns error if permissions are not granted", async () => {
    const { formValues, modDefinition } = setupInputs();
    setModHasPermissions(false);
    setUserAcceptedPermissions(false);

    const {
      result: { current: activateMod },
      getReduxStore,
    } = renderHook(() => useActivateMod("marketplace"), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
      },
    });

    const { success, error } = await activateMod(formValues, modDefinition);

    expect(success).toBe(false);
    expect(error).toBe("You must accept browser permissions to activate.");

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
    expect(deactivateModMock).not.toHaveBeenCalled();
    expect(reactivateEveryTabMock).not.toHaveBeenCalled();
  });

  it("ignores permissions if flag set", async () => {
    const { formValues, modDefinition } = setupInputs();
    setModHasPermissions(false);
    setUserAcceptedPermissions(false);

    const {
      result: { current: activateMod },
    } = renderHook(
      () => useActivateMod("marketplace", { checkPermissions: false }),
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
        },
      },
    );

    const { success, error } = await activateMod(formValues, modDefinition);

    expect(success).toBe(true);
    expect(error).toBeUndefined();
  });

  it("calls deactivateMod, activates to modComponentSlice, and calls reactivateEveryTab, if permissions are granted", async () => {
    const { formValues, modDefinition } = setupInputs();
    setModHasPermissions(false);
    setUserAcceptedPermissions(true);

    const {
      result: { current: activateMod },
      getReduxStore,
      act,
    } = renderHook(() => useActivateMod("extensionConsole"), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
      },
    });

    let success = false;
    let error: unknown;
    await act(async () => {
      const result = await activateMod(formValues, modDefinition);
      success = result.success;
      error = result.error;
    });

    expect(success).toBe(true);
    expect(error).toBeUndefined();

    const { dispatch } = getReduxStore();

    expect(deactivateModMock).toHaveBeenCalledWith(
      modDefinition.metadata.id,
      expect.toBeArray(),
      dispatch,
    );

    expect(dispatch).toHaveBeenCalledWith(
      modComponentSlice.actions.activateMod({
        modDefinition,
        configuredDependencies: [],
        optionsArgs: {},
        screen: "extensionConsole",
        isReactivate: false,
      }),
    );

    expect(reactivateEveryTabMock).toHaveBeenCalledOnce();
  });

  it("handles auto-created personal databases successfully", async () => {
    const { formValues: inputFormValues, modDefinition: inputModDefinition } =
      setupInputs();
    const databaseName = "Auto-created Personal Test Database";
    const formValues = {
      ...inputFormValues,
      optionsArgs: {
        myDatabase: databaseName,
      },
    };
    const modDefinition: ModDefinition = {
      ...inputModDefinition,
      options: {
        schema: {
          ...inputModDefinition.options?.schema,
          properties: {
            ...inputModDefinition.options?.schema?.properties,
            myDatabase: {
              $ref: databaseSchema.$id,
              format: "preview",
            },
          },
        },
        uiSchema: inputModDefinition.options?.uiSchema,
      },
    };
    setModHasPermissions(true);
    setUserAcceptedPermissions(true);

    const createdDatabase = databaseFactory({ name: databaseName });
    appApiMock.onPost(API_PATHS.DATABASES).reply(201, createdDatabase);

    const {
      result: { current: activateMod },
      getReduxStore,
      act,
    } = renderHook(() => useActivateMod("marketplace"), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
      },
    });

    let success = false;
    let error: unknown;
    await act(async () => {
      const result = await activateMod(formValues, modDefinition);
      success = result.success;
      error = result.error;
    });

    expect(success).toBe(true);
    expect(error).toBeUndefined();

    const { dispatch } = getReduxStore();

    expect(dispatch).toHaveBeenCalledWith(
      modComponentSlice.actions.activateMod({
        modDefinition,
        configuredDependencies: [],
        optionsArgs: {
          myDatabase: createdDatabase.id,
        },
        screen: "marketplace",
        isReactivate: false,
      }),
    );
  });

  const errorMessage = "Error creating database";
  const testCases = [
    {
      title: "handles network error in auto-created personal database",
      mockResponse(adapter: MockAdapter) {
        adapter.onPost(API_PATHS.DATABASES).networkError();
      },
    },
    {
      title: "handles error response in auto-created personal database request",
      mockResponse(adapter: MockAdapter) {
        adapter.onPost(API_PATHS.DATABASES).reply(400, { error: errorMessage });
      },
    },
  ];

  test.each(testCases)("$title", async ({ mockResponse }) => {
    mockResponse(appApiMock);

    const { formValues: inputFormValues, modDefinition: inputModDefinition } =
      setupInputs();
    const databaseName = "Auto-created Personal Test Database";
    const formValues = set(
      inputFormValues,
      "optionsArgs.myDatabase",
      databaseName,
    );
    const modDefinition = set(
      inputModDefinition,
      "options.schema.properties.myDatabase",
      {
        $ref: databaseSchema.$id,
        format: "preview",
      },
    );
    setModHasPermissions(true);
    const errorMessage = "Error creating database";

    const {
      result: { current: activateMod },
      act,
    } = renderHook(() => useActivateMod("marketplace"), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
      },
    });

    let success = false;
    let error: unknown;
    await act(async () => {
      const result = await activateMod(formValues, modDefinition);
      success = result.success;
      error = result.error;
    });

    expect(success).toBe(false);
    expect(error).toBe(errorMessage);
  });

  describe("personal deployment functionality", () => {
    const packageVersionId = "package-version-id";
    const testDeployment = {
      id: uuidv4(),
      name: "test-user-deployment",
    } as Deployment;
    let formValues: WizardValues;
    let editablePackage: EditablePackageMetadata;
    let modDefinition: ModDefinition;

    beforeEach(() => {
      ({ formValues, modDefinition } = setupInputs());

      setModHasPermissions(true);
      setUserAcceptedPermissions(true);

      editablePackage = editablePackageMetadataFactory({
        name: modDefinition.metadata.id,
      });
    });

    it("handles personal deployment creation successfully", async () => {
      appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);
      appApiMock
        .onGet(API_PATHS.BRICK_VERSIONS(editablePackage.id))
        .reply(200, [
          { id: packageVersionId, version: modDefinition.metadata.version },
        ]);
      appApiMock.onPost(API_PATHS.USER_DEPLOYMENTS).reply(201, testDeployment);

      const { result, getReduxStore } = renderHook(
        () => useActivateMod("marketplace"),
        {
          setupRedux(_dispatch, { store }) {
            jest.spyOn(store, "dispatch");
          },
        },
      );

      const { success, error } = await result.current(
        { ...formValues, personalDeployment: true },
        modDefinition,
      );

      expect(success).toBe(true);
      expect(error).toBeUndefined();

      const { dispatch } = getReduxStore();

      expect(dispatch).toHaveBeenCalledWith(
        modComponentSlice.actions.activateMod({
          modDefinition,
          configuredDependencies: [],
          optionsArgs: formValues.optionsArgs,
          screen: "marketplace",
          isReactivate: false,
          deployment: testDeployment,
        }),
      );

      expect(
        JSON.parse(
          appApiMock.history.post!.find(
            (request) => request.url === API_PATHS.USER_DEPLOYMENTS,
          )!.data,
        ),
      ).toEqual({
        package_version: packageVersionId,
        name: `Personal deployment for ${modDefinition.metadata.name}, version ${modDefinition.metadata.version}`,
        services: [],
        options_config: formValues.optionsArgs,
      });
    });

    it("notifies error when personal deployment was not created due to missing package", async () => {
      appApiMock.onGet(API_PATHS.BRICKS).reply(200, []);

      const { result } = renderHook(() => useActivateMod("marketplace"));
      await waitForEffect();

      const { success, error } = await result.current(
        { ...formValues, personalDeployment: true },
        modDefinition,
      );

      expect(success).toBe(true);
      expect(error).toBeUndefined();

      expect(mockedNotifyError).toHaveBeenCalledWith({
        message: `Error setting up device synchronization for ${modDefinition.metadata.name}. Please try reactivating.`,
        error: new Error(
          `Failed to find editable package for mod: ${modDefinition.metadata.id}`,
        ),
      });
    });

    it("notifies error when personal deployment was not created due to failed package call", async () => {
      appApiMock.onGet(API_PATHS.BRICKS).reply(500);

      const { result } = renderHook(() => useActivateMod("marketplace"));

      const { success, error } = await result.current(
        { ...formValues, personalDeployment: true },
        modDefinition,
      );

      expect(success).toBe(true);
      expect(error).toBeUndefined();

      expect(mockedNotifyError).toHaveBeenCalledWith({
        message: `Error setting up device synchronization for ${modDefinition.metadata.name}. Please try reactivating.`,
        error: expect.objectContaining({
          message: "Request failed with status code 500",
        }),
      });
    });

    it("notifies error when personal deployment was not created due to missing package version", async () => {
      appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);
      appApiMock
        .onGet(API_PATHS.BRICK_VERSIONS(editablePackage.id))
        .reply(200, []);

      const { result } = renderHook(() => useActivateMod("marketplace"));

      const { success, error } = await result.current(
        { ...formValues, personalDeployment: true },
        modDefinition,
      );

      expect(success).toBe(true);
      expect(error).toBeUndefined();

      expect(mockedNotifyError).toHaveBeenCalledWith({
        message: `Error setting up device synchronization for ${modDefinition.metadata.name}. Please try reactivating.`,
        error: new Error("Failed to find package version: 1.0.0"),
      });
    });

    it("notifies error when personal deployment was not created due to failed package versions call", async () => {
      appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);
      appApiMock.onGet(API_PATHS.BRICK_VERSIONS(editablePackage.id)).reply(500);

      const { result } = renderHook(() => useActivateMod("marketplace"));

      const { success, error } = await result.current(
        { ...formValues, personalDeployment: true },
        modDefinition,
      );

      expect(success).toBe(true);
      expect(error).toBeUndefined();

      expect(mockedNotifyError).toHaveBeenCalledWith({
        message: `Error setting up device synchronization for ${modDefinition.metadata.name}. Please try reactivating.`,
        error: expect.objectContaining({
          message: "Request failed with status code 500",
        }),
      });
    });

    it("notifies error when personal deployment was not created due to failed deployment call", async () => {
      appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);
      appApiMock
        .onGet(API_PATHS.BRICK_VERSIONS(editablePackage.id))
        .reply(200, [
          { id: packageVersionId, version: modDefinition.metadata.version },
        ]);
      appApiMock.onPost(API_PATHS.USER_DEPLOYMENTS).reply(500);

      const { result } = renderHook(() => useActivateMod("marketplace"));

      const { success, error } = await result.current(
        { ...formValues, personalDeployment: true },
        modDefinition,
      );

      expect(success).toBe(true);
      expect(error).toBeUndefined();

      expect(mockedNotifyError).toHaveBeenCalledWith({
        message: `Error setting up device synchronization for ${modDefinition.metadata.name}. Please try reactivating.`,
        error: expect.objectContaining({
          message: "Request failed with status code 500",
        }),
      });
    });
  });
});
