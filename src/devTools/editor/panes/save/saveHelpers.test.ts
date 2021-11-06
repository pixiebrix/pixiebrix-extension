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
import { extensionPointFactory, recipeFactory } from "@/tests/factories";
import { optionsSlice } from "@/options/slices";
import menuItemExtensionAdapter from "@/devTools/editor/extensionPoints/menuItem";
import { UnknownObject } from "@/types";
import { lookupExtensionPoint } from "@/devTools/editor/extensionPoints/base";
import { produce } from "immer";

jest.mock("@/background/initContextMenus");

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
  test("versioned extensionPoint package", async () => {
    const extensionPoint = extensionPointFactory();
    const recipe = recipeFactory({
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
        draft.extensionPoints[0].services = {};
        draft.extensionPoints[0].label = "New Label";
        delete draft.sharing;
      })
    );
  });
});
