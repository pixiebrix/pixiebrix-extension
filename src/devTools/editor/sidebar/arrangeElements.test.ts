/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
  extensionFactory,
  installedRecipeMetadataFactory,
  menuItemFormStateFactory,
  recipeDefinitionFactory,
  recipeMetadataFactory,
} from "@/tests/factories";
import { RecipeDefinition } from "@/types/definitions";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { ActionFormState } from "@/devTools/editor/extensionPoints/menuItem";
import { IExtension } from "@/core";
import arrangeElements from "@/devTools/editor/sidebar/arrangeElements";

// Recipes
const ID_FOO = "test/recipe-foo";
const recipeFoo: RecipeDefinition = recipeDefinitionFactory({
  metadata: recipeMetadataFactory({
    id: validateRegistryId(ID_FOO),
    name: "Foo Recipe",
  }),
});

const ID_BAR = "test/recipe-bar";
const recipeBar: RecipeDefinition = recipeDefinitionFactory({
  metadata: recipeMetadataFactory({
    id: validateRegistryId(ID_BAR),
    name: "Bar Recipe",
  }),
});

// Extensions
const ID_FOO_A = uuidv4();
const installedFooA: IExtension = extensionFactory({
  id: ID_FOO_A,
  label: "A",
  _recipe: installedRecipeMetadataFactory({
    id: validateRegistryId(ID_FOO),
  }),
});

const ID_FOO_B = uuidv4();
const dynamicFooB: ActionFormState = menuItemFormStateFactory({
  uuid: ID_FOO_B,
  label: "B",
  recipe: installedRecipeMetadataFactory({
    id: validateRegistryId(ID_FOO),
  }),
});

const ID_ORPHAN_C = uuidv4();
const dynamicOrphanC: ActionFormState = menuItemFormStateFactory({
  uuid: ID_ORPHAN_C,
  label: "C",
});

const ID_BAR_D = uuidv4();
const installedBarD: IExtension = extensionFactory({
  id: ID_BAR_D,
  label: "D",
  _recipe: installedRecipeMetadataFactory({
    id: validateRegistryId(ID_BAR),
  }),
});

const ID_BAR_E = uuidv4();
const dynamicBarE: ActionFormState = menuItemFormStateFactory({
  uuid: ID_BAR_E,
  label: "E",
  recipe: installedRecipeMetadataFactory({
    id: validateRegistryId(ID_BAR),
  }),
});

const ID_BAR_F = uuidv4();
const installedBarF: IExtension = extensionFactory({
  id: ID_BAR_F,
  label: "F",
  _recipe: installedRecipeMetadataFactory({
    id: validateRegistryId(ID_BAR),
  }),
});

const ID_ORPHAN_G = uuidv4();
const installedOrphanG: IExtension = extensionFactory({
  id: ID_ORPHAN_G,
  label: "G",
});

const ID_ORPHAN_H = uuidv4();
const installedOrphanH: IExtension = extensionFactory({
  id: ID_ORPHAN_H,
  label: "H",
});

describe("arrangeElements()", () => {
  test("sort orphaned recipes by metadata.name", () => {
    const { elementsByRecipeId, orphanedElements } = arrangeElements({
      elements: [dynamicOrphanC],
      installed: [installedOrphanH, installedOrphanG],
      recipes: [],
      availableInstalledIds: new Set([
        installedOrphanG.id,
        installedOrphanH.id,
      ]),
      availableDynamicIds: new Set([dynamicOrphanC.uuid]),
      showAll: false,
      groupByRecipe: true,
      activeElementId: dynamicOrphanC.uuid,
    });

    expect(elementsByRecipeId).toStrictEqual([]);
    expect(orphanedElements).toStrictEqual([
      dynamicOrphanC,
      installedOrphanG,
      installedOrphanH,
    ]);
  });

  test("group recipes and sort properly", () => {
    const { elementsByRecipeId, orphanedElements } = arrangeElements({
      elements: [dynamicBarE, dynamicFooB],
      installed: [installedFooA, installedBarF, installedBarD],
      recipes: [recipeFoo, recipeBar],
      availableInstalledIds: new Set([
        installedFooA.id,
        installedBarD.id,
        installedBarF.id,
      ]),
      availableDynamicIds: new Set([dynamicBarE.uuid, dynamicFooB.uuid]),
      showAll: false,
      groupByRecipe: true,
      activeElementId: dynamicBarE.uuid,
    });

    expect(elementsByRecipeId).toStrictEqual([
      [recipeBar.metadata.id, [installedBarD, dynamicBarE, installedBarF]],
      [recipeFoo.metadata.id, [installedFooA, dynamicFooB]],
    ]);
    expect(orphanedElements).toStrictEqual([]);
  });

  test("handle groupByRecipe flag properly", () => {
    const { elementsByRecipeId, orphanedElements } = arrangeElements({
      elements: [dynamicBarE, dynamicFooB, dynamicOrphanC],
      installed: [
        installedFooA,
        installedBarF,
        installedBarD,
        installedOrphanG,
        installedOrphanH,
      ],
      recipes: [recipeFoo, recipeBar],
      availableInstalledIds: new Set([
        installedFooA.id,
        installedBarD.id,
        installedBarF.id,
        installedOrphanG.id,
        installedOrphanH.id,
      ]),
      availableDynamicIds: new Set([
        dynamicBarE.uuid,
        dynamicFooB.uuid,
        dynamicOrphanC.uuid,
      ]),
      showAll: false,
      groupByRecipe: false,
      activeElementId: dynamicBarE.uuid,
    });

    expect(elementsByRecipeId).toStrictEqual([]);
    expect(orphanedElements).toStrictEqual([
      installedFooA,
      dynamicFooB,
      dynamicOrphanC,
      installedBarD,
      dynamicBarE,
      installedBarF,
      installedOrphanG,
      installedOrphanH,
    ]);
  });

  test("handle showAll flag properly", () => {
    const { elementsByRecipeId, orphanedElements } = arrangeElements({
      elements: [dynamicBarE],
      installed: [installedFooA, installedOrphanH],
      recipes: [recipeFoo, recipeBar],
      availableInstalledIds: new Set([installedFooA.id]),
      availableDynamicIds: new Set([dynamicBarE.uuid]),
      showAll: true,
      groupByRecipe: true,
      activeElementId: dynamicBarE.uuid,
    });

    expect(elementsByRecipeId).toStrictEqual([
      [recipeBar.metadata.id, [dynamicBarE]],
      [recipeFoo.metadata.id, [installedFooA]],
    ]);
    expect(orphanedElements).toStrictEqual([installedOrphanH]);
  });

  test("keep active element when not available", () => {
    const { elementsByRecipeId, orphanedElements } = arrangeElements({
      elements: [dynamicBarE],
      installed: [],
      recipes: [recipeBar],
      availableInstalledIds: new Set([]),
      availableDynamicIds: new Set([]),
      showAll: false,
      groupByRecipe: false,
      activeElementId: dynamicBarE.uuid,
    });

    expect(elementsByRecipeId).toStrictEqual([]);
    expect(orphanedElements).toStrictEqual([dynamicBarE]);
  });
});
