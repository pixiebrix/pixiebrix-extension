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

import {
  generateScopeBrickId,
  replaceRecipeExtension,
} from "@/devTools/editor/panes/save/saveHelpers";
import { validateRegistryId } from "@/types/helpers";
import {
  recipeDefinitionFactory,
  innerExtensionPointRecipeFactory,
  versionedExtensionPointRecipeFactory,
} from "@/tests/factories";
import { optionsSlice } from "@/options/slices";
import menuItemExtensionAdapter from "@/devTools/editor/extensionPoints/menuItem";
import { UnknownObject } from "@/types";
import { lookupExtensionPoint } from "@/devTools/editor/extensionPoints/base";
import { produce } from "immer";
import { makeInternalId } from "@/registry/internal";
import { cloneDeep } from "lodash";
import { InnerDefinitionRef } from "@/core";
import { MenuDefinition } from "@/extensionPoints/menuItemExtension";

jest.mock("@/background/initContextMenus");
jest.mock("@/background/messenger/api");

jest.mock("@/devTools/editor/extensionPoints/base", () => ({
  ...(jest.requireActual(
    "@/devTools/editor/extensionPoints/base"
  ) as UnknownObject),
  lookupExtensionPoint: jest.fn(),
}));

describe("generatePersonalBrickId", () => {
  test("replace other scope", () => {
    expect(
      generateScopeBrickId("@foo", validateRegistryId("@pixiebrix/baz"))
    ).toBe("@foo/baz");
  });

  test("add scope", () => {
    expect(generateScopeBrickId("@foo", validateRegistryId("baz"))).toBe(
      "@foo/baz"
    );
    expect(
      generateScopeBrickId("@foo", validateRegistryId("collection/baz"))
    ).toBe("@foo/collection/baz");
  });
});

describe("replaceRecipeExtension round trip", () => {
  test("single extension with versioned extensionPoint", async () => {
    const extensionPoint = recipeDefinitionFactory();
    const recipe = versionedExtensionPointRecipeFactory({
      extensionPointId: extensionPoint.metadata.id,
    })();

    const state = optionsSlice.reducer(
      { extensions: [] },
      optionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    (lookupExtensionPoint as any).mockResolvedValue(extensionPoint);

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0]
    );
    element.label = "New Label";

    const newId = generateScopeBrickId("@test", recipe.metadata.id);
    const newRecipe = replaceRecipeExtension(
      recipe,
      { ...recipe.metadata, id: newId },
      state.extensions,
      element
    );

    expect(newRecipe).toStrictEqual(
      produce(recipe, (draft) => {
        draft.metadata.id = newId;
        // `services` gets normalized from undefined to {}
        draft.extensionPoints[0].services = {};
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("does not modify other extension point", async () => {
    const extensionPoint = recipeDefinitionFactory();

    const recipe = versionedExtensionPointRecipeFactory({
      extensionPointId: extensionPoint.metadata.id,
    })();

    recipe.extensionPoints.push({
      ...recipe.extensionPoints[0],
      label: "Other Extension",
    });

    const state = optionsSlice.reducer(
      { extensions: [] },
      optionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    (lookupExtensionPoint as any).mockResolvedValue(extensionPoint);

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0]
    );
    element.label = "New Label";

    const newId = generateScopeBrickId("@test", recipe.metadata.id);
    const newRecipe = replaceRecipeExtension(
      recipe,
      { ...recipe.metadata, id: newId },
      state.extensions,
      element
    );

    expect(newRecipe).toStrictEqual(
      produce(recipe, (draft) => {
        draft.metadata.id = newId;
        // `services` gets normalized from undefined to {}
        draft.extensionPoints[0].services = {};
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("single extension point with innerDefinition", async () => {
    const recipe = innerExtensionPointRecipeFactory()();

    const state = optionsSlice.reducer(
      { extensions: [] },
      optionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    (lookupExtensionPoint as any).mockResolvedValue({
      ...recipe.definitions.extensionPoint,
      metadata: {
        id: makeInternalId(recipe.definitions.extensionPoint),
        name: "Internal Extension Point",
        version: "1.0.0",
      },
    });

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0]
    );

    element.label = "New Label";

    const newId = generateScopeBrickId("@test", recipe.metadata.id);

    const newRecipe = replaceRecipeExtension(
      recipe,
      { ...recipe.metadata, id: newId },
      state.extensions,
      element
    );

    expect(newRecipe).toStrictEqual(
      produce(recipe, (draft) => {
        draft.metadata.id = newId;
        // `services` gets normalized from undefined to {}
        draft.extensionPoints[0].services = {};
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("generate fresh identifier definition changed", async () => {
    const recipe = innerExtensionPointRecipeFactory()();

    recipe.extensionPoints.push({
      ...recipe.extensionPoints[0],
      label: "Other Extension",
    });

    const state = optionsSlice.reducer(
      { extensions: [] },
      optionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    (lookupExtensionPoint as any).mockResolvedValue({
      ...recipe.definitions.extensionPoint,
      metadata: {
        id: makeInternalId(recipe.definitions.extensionPoint),
        name: "Internal Extension Point",
        version: "1.0.0",
      },
    });

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0]
    );

    element.label = "New Label";
    const newTemplate = '<input value="Click Me!"/>';
    element.extensionPoint.definition.template = newTemplate;

    const newId = generateScopeBrickId("@test", recipe.metadata.id);

    const newRecipe = replaceRecipeExtension(
      recipe,
      { ...recipe.metadata, id: newId },
      state.extensions,
      element
    );

    expect(newRecipe).toStrictEqual(
      produce(recipe, (draft) => {
        draft.metadata.id = newId;

        draft.definitions.extensionPoint2 = cloneDeep(
          recipe.definitions.extensionPoint
        );
        (draft.definitions.extensionPoint2
          .definition as MenuDefinition).template = newTemplate;
        draft.extensionPoints[0].id = "extensionPoint2" as InnerDefinitionRef;
        // `services` gets normalized from undefined to {}
        draft.extensionPoints[0].services = {};
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("reuse identifier definition for multiple if extensionPoint not modified", async () => {
    const recipe = innerExtensionPointRecipeFactory()();

    recipe.extensionPoints.push({
      ...recipe.extensionPoints[0],
      label: "Other Extension",
    });

    const state = optionsSlice.reducer(
      { extensions: [] },
      optionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    (lookupExtensionPoint as any).mockResolvedValue({
      ...recipe.definitions.extensionPoint,
      metadata: {
        id: makeInternalId(recipe.definitions.extensionPoint),
        name: "Internal Extension Point",
        version: "1.0.0",
      },
    });

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0]
    );

    element.label = "New Label";

    const newId = generateScopeBrickId("@test", recipe.metadata.id);

    const newRecipe = replaceRecipeExtension(
      recipe,
      { ...recipe.metadata, id: newId },
      state.extensions,
      element
    );

    expect(newRecipe).toStrictEqual(
      produce(recipe, (draft) => {
        draft.metadata.id = newId;
        // `services` gets normalized from undefined to {}
        draft.extensionPoints[0].services = {};
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });
});
