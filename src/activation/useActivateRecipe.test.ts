/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import useActivateRecipe from "./useActivateRecipe";
import { validateRegistryId } from "@/types/helpers";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { type MenuDefinition } from "@/starterBricks/contextMenu";
import { uninstallRecipe } from "@/store/uninstallUtils";
import { reactivateEveryTab } from "@/background/messenger/api";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import extensionsSlice from "@/store/extensionsSlice";
import { type InnerDefinitions } from "@/types/registryTypes";
import { checkRecipePermissions } from "@/modDefinitions/recipePermissionsHelpers";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import databaseSchema from "@schemas/database.json";
import { set } from "lodash";
import {
  modComponentDefinitionFactory,
  starterBrickConfigFactory,
  recipeFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories/modDefinitionFactories";

import { databaseFactory } from "@/testUtils/factories/databaseFactories";

const checkPermissionsMock = jest.mocked(checkRecipePermissions);
const uninstallRecipeMock = jest.mocked(uninstallRecipe);
const reactivateEveryTabMock = jest.mocked(reactivateEveryTab);

const createDatabaseMock = jest.fn();

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");
  return {
    ...actual,
    useCreateDatabaseMutation: jest.fn(() => [createDatabaseMock]),
  };
});

function setupInputs(): {
  formValues: WizardValues;
  recipe: ModDefinition;
} {
  const formValues: WizardValues = {
    extensions: { 0: true },
    services: [],
    optionsArgs: {},
  };

  const extensionPointId = validateRegistryId("test/starter-brick-1");
  const modComponentDefinition = modComponentDefinitionFactory({
    id: extensionPointId,
  });
  const starterBrickConfig = starterBrickConfigFactory({
    metadata: recipeMetadataFactory({
      id: extensionPointId,
      name: "Text Starter Brick 1",
    }),
    definition: {
      type: "contextMenu",
      isAvailable: {
        matchPatterns: ["*://*/*"],
        selectors: [],
        urlPatterns: [],
      },
      reader: [validateRegistryId("@pixiebrix/document-metadata")],
    },
  }) as StarterBrickConfig<MenuDefinition>;
  starterBrickConfig.definition.targetMode = "eventTarget";
  starterBrickConfig.definition.contexts = ["all"];
  starterBrickConfig.definition.documentUrlPatterns = ["*://*/*"];

  const modDefinition = recipeFactory({
    extensionPoints: [modComponentDefinition],
    definitions: {
      [extensionPointId]: starterBrickConfig,
    } as unknown as InnerDefinitions,
  });

  return {
    formValues,
    recipe: modDefinition,
  };
}

function setRecipeHasPermissions(hasPermissions: boolean) {
  checkPermissionsMock.mockResolvedValue({
    hasPermissions,
    // The exact permissions don't matter because we're mocking the check also
    permissions: emptyPermissionsFactory(),
  });
}

function setUserAcceptedPermissions(accepted: boolean) {
  jest.mocked(browser.permissions.request).mockResolvedValue(accepted);
}

describe("useActivateRecipe", () => {
  it("returns error if permissions are not granted", async () => {
    const { formValues, recipe } = setupInputs();
    setRecipeHasPermissions(false);
    setUserAcceptedPermissions(false);

    const {
      result: { current: activateRecipe },
      getReduxStore,
    } = renderHook(() => useActivateRecipe("marketplace"), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
      },
    });

    const { success, error } = await activateRecipe(formValues, recipe);

    expect(success).toBe(false);
    expect(error).toBe("You must accept browser permissions to activate.");

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
    expect(uninstallRecipeMock).not.toHaveBeenCalled();
    expect(reactivateEveryTabMock).not.toHaveBeenCalled();
  });

  it("calls uninstallRecipe, installs to extensionsSlice, and calls reactivateEveryTab, if permissions are granted", async () => {
    const { formValues, recipe } = setupInputs();
    setRecipeHasPermissions(false);
    setUserAcceptedPermissions(true);

    const {
      result: { current: activateRecipe },
      getReduxStore,
      act,
    } = renderHook(() => useActivateRecipe("extensionConsole"), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
      },
    });

    let success: boolean;
    let error: unknown;
    await act(async () => {
      const result = await activateRecipe(formValues, recipe);
      success = result.success;
      error = result.error;
    });

    expect(success).toBe(true);
    expect(error).toBeUndefined();

    const { dispatch } = getReduxStore();

    expect(uninstallRecipeMock).toHaveBeenCalledWith(
      recipe.metadata.id,
      expect.toBeArray(),
      dispatch
    );

    expect(dispatch).toHaveBeenCalledWith(
      extensionsSlice.actions.installRecipe({
        recipe,
        extensionPoints: recipe.extensionPoints,
        services: {},
        optionsArgs: {},
        screen: "extensionConsole",
        isReinstall: false,
      })
    );

    expect(reactivateEveryTabMock).toHaveBeenCalledOnce();
  });

  it("handles auto-created personal databases successfully", async () => {
    const { formValues: inputFormValues, recipe: inputRecipe } = setupInputs();
    const databaseName = "Auto-created Personal Test Database";
    const formValues = {
      ...inputFormValues,
      optionsArgs: {
        myDatabase: databaseName,
      },
    };
    const recipe = {
      ...inputRecipe,
      options: {
        schema: {
          ...inputRecipe.options?.schema,
          properties: {
            ...inputRecipe.options?.schema?.properties,
            myDatabase: {
              $ref: databaseSchema.$id,
              format: "preview",
            },
          },
        },
        uiSchema: inputRecipe.options?.uiSchema,
      },
    };
    setRecipeHasPermissions(true);
    setUserAcceptedPermissions(true);
    const createdDatabase = databaseFactory({ name: databaseName });
    createDatabaseMock.mockImplementation(async (name) => ({
      data: createdDatabase,
    }));

    const {
      result: { current: activateRecipe },
      getReduxStore,
      act,
    } = renderHook(() => useActivateRecipe("marketplace"), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
      },
    });

    let success: boolean;
    let error: unknown;
    await act(async () => {
      const result = await activateRecipe(formValues, recipe);
      success = result.success;
      error = result.error;
    });

    expect(success).toBe(true);
    expect(error).toBeUndefined();
    expect(createDatabaseMock).toHaveBeenCalledWith({ name: databaseName });

    const { dispatch } = getReduxStore();

    expect(dispatch).toHaveBeenCalledWith(
      extensionsSlice.actions.installRecipe({
        recipe,
        extensionPoints: recipe.extensionPoints,
        services: {},
        optionsArgs: {
          myDatabase: createdDatabase.id,
        },
        screen: "marketplace",
        isReinstall: false,
      })
    );
  });

  const errorMessage = "Error creating database";
  const testCases = [
    {
      title: "handles un-caught error in auto-created personal database",
      async createDatabaseMockImplementation() {
        throw new Error(errorMessage);
      },
    },
    {
      title: "handles error response in auto-created personal database request",
      async createDatabaseMockImplementation() {
        return { error: errorMessage };
      },
    },
  ];

  test.each(testCases)(
    "$title",
    async ({ createDatabaseMockImplementation }) => {
      const { formValues: inputFormValues, recipe: inputRecipe } =
        setupInputs();
      const databaseName = "Auto-created Personal Test Database";
      const formValues = set(
        inputFormValues,
        "optionsArgs.myDatabase",
        databaseName
      );
      const recipe = set(inputRecipe, "options.schema.properties.myDatabase", {
        $ref: databaseSchema.$id,
        format: "preview",
      });
      setRecipeHasPermissions(true);
      const errorMessage = "Error creating database";
      createDatabaseMock.mockImplementation(createDatabaseMockImplementation);

      const {
        result: { current: activateRecipe },
        act,
      } = renderHook(() => useActivateRecipe("marketplace"), {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
        },
      });

      let success: boolean;
      let error: unknown;
      await act(async () => {
        const result = await activateRecipe(formValues, recipe);
        success = result.success;
        error = result.error;
      });

      expect(success).toBe(false);
      expect(error).toBe(errorMessage);
    }
  );
});
