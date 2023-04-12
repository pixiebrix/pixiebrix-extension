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

import {
  extensionPointConfigFactory,
  extensionPointDefinitionFactory,
  recipeDefinitionFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories";
import { type WizardValues } from "@/activation/wizardTypes";
import { renderHook } from "@/pageEditor/testHelpers";
import useMarketplaceActivateRecipe from "./useMarketplaceActivateRecipe";
import { validateRegistryId } from "@/types/helpers";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { type MenuDefinition } from "@/extensionPoints/contextMenu";
import ensureRecipePermissions from "@/recipes/ensureRecipePermissions";
import { uninstallRecipe } from "@/store/uninstallUtils";
import { reactivateEveryTab } from "@/background/messenger/api";
import { type RecipeDefinition } from "@/types/recipeTypes";
import extensionsSlice from "@/store/extensionsSlice";
import { type InnerDefinitions } from "@/types/registryTypes";

jest.mock("@/recipes/ensureRecipePermissions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const ensurePermissionsMock = ensureRecipePermissions as jest.MockedFunction<
  typeof ensureRecipePermissions
>;

const uninstallRecipeMock = uninstallRecipe as jest.MockedFunction<
  typeof uninstallRecipe
>;

const reactivateEveryTabMock = reactivateEveryTab as jest.MockedFunction<
  typeof reactivateEveryTab
>;

function setupInputs(): {
  formValues: WizardValues;
  recipe: RecipeDefinition;
} {
  const formValues: WizardValues = {
    extensions: { 0: true },
    services: [],
    optionsArgs: {},
  };

  const extensionPointId = validateRegistryId("test/extension-point-1");
  const extensionPoint = extensionPointConfigFactory({
    id: extensionPointId,
  });
  const extensionPointDefinition = extensionPointDefinitionFactory({
    metadata: recipeMetadataFactory({
      id: extensionPointId,
      name: "Text Extension Point 1",
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
  }) as ExtensionPointConfig<MenuDefinition>;
  extensionPointDefinition.definition.targetMode = "eventTarget";
  extensionPointDefinition.definition.contexts = ["all"];
  extensionPointDefinition.definition.documentUrlPatterns = ["*://*/*"];

  const recipe = recipeDefinitionFactory({
    extensionPoints: [extensionPoint],
    definitions: {
      [extensionPointId]: extensionPointDefinition,
    } as unknown as InnerDefinitions,
  });

  return {
    formValues,
    recipe,
  };
}

describe("useActivateRecipe", () => {
  it("returns error if permissions are not granted", async () => {
    const { formValues, recipe } = setupInputs();

    ensurePermissionsMock.mockResolvedValue(false);

    const {
      result: { current: activateRecipe },
      getReduxStore,
    } = renderHook(() => useMarketplaceActivateRecipe(), {
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

    ensurePermissionsMock.mockResolvedValue(true);

    const {
      result: { current: activateRecipe },
      getReduxStore,
      act,
    } = renderHook(() => useMarketplaceActivateRecipe(), {
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
      })
    );

    expect(reactivateEveryTabMock).toHaveBeenCalledOnce();
  });
});
