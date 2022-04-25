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
  buildRecipe,
  generateScopeBrickId,
  isRecipeEditable,
  replaceRecipeExtension,
} from "@/pageEditor/panes/save/saveHelpers";
import { validateRegistryId } from "@/types/helpers";
import {
  extensionPointDefinitionFactory,
  innerExtensionPointRecipeFactory,
  versionedExtensionPointRecipeFactory,
  extensionPointConfigFactory,
  recipeFactory,
  versionedRecipeWithResolvedExtensions,
} from "@/testUtils/factories";
import menuItemExtensionAdapter from "@/pageEditor/extensionPoints/menuItem";
import { UnknownObject } from "@/types";
import {
  internalExtensionPointMetaFactory,
  lookupExtensionPoint,
} from "@/pageEditor/extensionPoints/base";
import { produce } from "immer";
import { makeInternalId } from "@/registry/internal";
import { cloneDeep } from "lodash";
import { InnerDefinitionRef } from "@/core";
import { MenuDefinition } from "@/extensionPoints/menuItemExtension";
import extensionsSlice from "@/store/extensionsSlice";
import {
  MINIMAL_SCHEMA,
  MINIMAL_UI_SCHEMA,
} from "@/components/formBuilder/formBuilderHelpers";
import {
  EditablePackage,
  OptionsDefinition,
  RecipeDefinition,
  UnsavedRecipeDefinition,
} from "@/types/definitions";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { ExtensionOptionsState } from "@/store/extensionsTypes";

jest.mock("@/background/contextMenus");
jest.mock("@/background/messenger/api");
jest.mock("@/telemetry/events");

jest.mock("@/pageEditor/extensionPoints/base", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Wrong
  ...(jest.requireActual("@/pageEditor/extensionPoints/base") as UnknownObject),
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
    const extensionPoint = extensionPointDefinitionFactory();
    const recipe = versionedExtensionPointRecipeFactory({
      extensionPointId: extensionPoint.metadata.id,
    })();

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);

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
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("does not modify other extension point", async () => {
    const extensionPoint = extensionPointDefinitionFactory();

    const recipe = versionedExtensionPointRecipeFactory({
      extensionPointId: extensionPoint.metadata.id,
    })();

    recipe.extensionPoints.push({
      ...recipe.extensionPoints[0],
      label: "Other Extension",
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);

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
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("single extension point with innerDefinition", async () => {
    const recipe = innerExtensionPointRecipeFactory()();

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    (lookupExtensionPoint as jest.Mock).mockResolvedValue({
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

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    (lookupExtensionPoint as jest.Mock).mockResolvedValue({
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
        (
          draft.definitions.extensionPoint2.definition as MenuDefinition
        ).template = newTemplate;
        draft.extensionPoints[0].id = "extensionPoint2" as InnerDefinitionRef;
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

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    (lookupExtensionPoint as jest.Mock).mockResolvedValue({
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
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("updates Recipe API version with single extension", async () => {
    const extensionPoint = extensionPointDefinitionFactory({
      apiVersion: "v2",
    });

    const extensionPointId = extensionPoint.metadata.id;
    const recipe = innerExtensionPointRecipeFactory({
      extensionPointRef: extensionPointId as any,
    })({
      apiVersion: "v2",
      definitions: {
        [extensionPointId]: extensionPoint,
      } as any,
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);

    const element = await menuItemExtensionAdapter.fromExtension({
      ...state.extensions[0],
      apiVersion: "v3",
    });
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
        draft.apiVersion = "v3";
        draft.metadata.id = newId;
        draft.definitions[extensionPoint.metadata.id].apiVersion = "v3";
        draft.extensionPoints[0].label = "New Label";
      })
    );
  });

  test("throws when API version mismatch and cannot update recipe", async () => {
    const extensionPoint = extensionPointDefinitionFactory();
    const recipe = versionedExtensionPointRecipeFactory({
      extensionPointId: extensionPoint.metadata.id,
    })({
      apiVersion: "v2",
      extensionPoints: [
        extensionPointConfigFactory({
          id: extensionPoint.metadata.id,
        }),
        extensionPointConfigFactory(),
      ],
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);

    const element = await menuItemExtensionAdapter.fromExtension({
      ...state.extensions[0],
      apiVersion: "v3",
    });
    element.label = "New Label";

    const newId = generateScopeBrickId("@test", recipe.metadata.id);
    expect(() =>
      replaceRecipeExtension(
        recipe,
        { ...recipe.metadata, id: newId },
        state.extensions,
        element
      )
    ).toThrow();
  });
});

describe("blueprint options", () => {
  async function runReplaceRecipeExtensions(
    recipeOptions: OptionsDefinition,
    elementOptions: OptionsDefinition
  ) {
    const recipe = recipeFactory({
      options: recipeOptions,
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installRecipe({
        recipe,
        services: {},
        extensionPoints: recipe.extensionPoints,
      })
    );

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0]
    );

    element.optionsDefinition = elementOptions;

    return replaceRecipeExtension(
      recipe,
      recipe.metadata,
      state.extensions,
      element
    );
  }

  test("doesn't add empty schema when blueprint options is empty", async () => {
    const emptyOptions = {
      schema: MINIMAL_SCHEMA,
      uiSchema: MINIMAL_UI_SCHEMA,
    };

    const updatedRecipe = await runReplaceRecipeExtensions(
      undefined,
      emptyOptions
    );

    expect(updatedRecipe.options).toBeUndefined();
  });

  test("creates blueprint options", async () => {
    const elementOptions: OptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
      uiSchema: MINIMAL_UI_SCHEMA,
    };

    const updatedRecipe = await runReplaceRecipeExtensions(
      undefined,
      elementOptions
    );

    expect(updatedRecipe.options).toBe(elementOptions);
  });

  test("updates blueprint options", async () => {
    const blueprintOptions: OptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
      uiSchema: MINIMAL_UI_SCHEMA,
    };

    const elementOptions: OptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          credentials: {
            type: "string",
          },
        },
      },
      uiSchema: MINIMAL_UI_SCHEMA,
    };

    const updatedRecipe = await runReplaceRecipeExtensions(
      blueprintOptions,
      elementOptions
    );

    expect(updatedRecipe.options).toBe(elementOptions);
  });

  test("removes blueprint options", async () => {
    const blueprintOptions: OptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
      uiSchema: MINIMAL_UI_SCHEMA,
    };

    const elementOptions: OptionsDefinition = {
      schema: MINIMAL_SCHEMA,
      uiSchema: MINIMAL_UI_SCHEMA,
    };

    const updatedRecipe = await runReplaceRecipeExtensions(
      blueprintOptions,
      elementOptions
    );

    expect(updatedRecipe.options).toBeUndefined();
  });
});

describe("isRecipeEditable", () => {
  test("returns true if recipe is in editable packages", () => {
    const recipe = recipeFactory();
    const editablePackages: EditablePackage[] = [
      {
        id: null,
        name: validateRegistryId("test/recipe"),
      },
      {
        id: null,
        name: recipe.metadata.id,
      },
    ];

    expect(isRecipeEditable(editablePackages, recipe)).toBe(true);
  });

  test("returns false if recipe is not in editable packages", () => {
    const recipe = recipeFactory();
    const editablePackages: EditablePackage[] = [
      {
        id: null,
        name: validateRegistryId("test/recipe"),
      },
    ];

    expect(isRecipeEditable(editablePackages, recipe)).toBe(false);
  });

  test("returns false if recipe is null", () => {
    const editablePackages: EditablePackage[] = [
      {
        id: null,
        name: validateRegistryId("test/recipe"),
      },
    ];

    expect(isRecipeEditable(editablePackages, null)).toBe(false);
  });
});

function selectExtensionPoints(
  recipe: UnsavedRecipeDefinition
): ExtensionPointConfig[] {
  return recipe.extensionPoints.map(({ id }) => {
    const definition = recipe.definitions[id]
      .definition as ExtensionPointDefinition;
    return {
      apiVersion: recipe.apiVersion,
      metadata: internalExtensionPointMetaFactory(),
      definition,
      kind: "extensionPoint",
    };
  });
}

type InstalledRecipe = {
  recipe: RecipeDefinition;
  state: ExtensionOptionsState;
};

function installRecipe(extensionCount = 1): InstalledRecipe {
  const recipe = versionedRecipeWithResolvedExtensions(extensionCount)();

  const state = extensionsSlice.reducer(
    { extensions: [] },
    extensionsSlice.actions.installRecipe({
      recipe,
      services: {},
      extensionPoints: recipe.extensionPoints,
    })
  );

  return { recipe, state };
}

describe("buildRecipe", () => {
  test("one clean extension", () => {
    const { recipe, state } = installRecipe(1);

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: state.extensions,
      dirtyRecipeElements: [],
    });

    expect(newRecipe).toStrictEqual(recipe);
  });

  test("two clean extensions", () => {
    const { recipe, state } = installRecipe(2);

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: state.extensions,
      dirtyRecipeElements: [],
    });

    expect(newRecipe).toStrictEqual(recipe);
  });

  test("three clean extensions", () => {
    const { recipe, state } = installRecipe(3);

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: state.extensions,
      dirtyRecipeElements: [],
    });

    expect(newRecipe).toStrictEqual(recipe);
  });

  test("one dirty element", async () => {
    const { recipe, state } = installRecipe(1);

    const [extensionPoint] = selectExtensionPoints(recipe);
    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);

    const extension = state.extensions[0];
    const adapter = ADAPTERS.get(extensionPoint.definition.type);
    const element = (await adapter.fromExtension(extension)) as FormState;

    const newLabel = "New Label";
    element.label = newLabel;

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: [],
      dirtyRecipeElements: [element],
    });

    const updated = produce(recipe, (draft) => {
      draft.extensionPoints[0].label = newLabel;
    });

    expect(newRecipe).toStrictEqual(updated);
  });

  test("two dirty elements", async () => {
    const { recipe, state } = installRecipe(2);

    const extensionPoints = selectExtensionPoints(recipe);

    const elements: FormState[] = [];

    for (const [index, extensionPoint] of extensionPoints.entries()) {
      (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);
      const extension = state.extensions[index];
      const adapter = ADAPTERS.get(extensionPoint.definition.type);
      // eslint-disable-next-line no-await-in-loop
      const element = (await adapter.fromExtension(extension)) as FormState;
      element.label = `New Label ${index}`;
      elements.push(element);
    }

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: [],
      dirtyRecipeElements: elements,
    });

    const updated = produce(recipe, (draft) => {
      for (const [index, extensionPoint] of draft.extensionPoints.entries()) {
        extensionPoint.label = `New Label ${index}`;
      }
    });

    expect(newRecipe).toStrictEqual(updated);
  });

  test("three dirty elements", async () => {
    const { recipe, state } = installRecipe(3);

    const extensionPoints = selectExtensionPoints(recipe);

    const elements: FormState[] = [];

    for (const [index, extensionPoint] of extensionPoints.entries()) {
      (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);
      const extension = state.extensions[0];
      const adapter = ADAPTERS.get(extensionPoint.definition.type);
      // eslint-disable-next-line no-await-in-loop
      const element = (await adapter.fromExtension(extension)) as FormState;
      element.label = `New Label ${index}`;
      elements.push(element);
    }

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: [],
      dirtyRecipeElements: elements,
    });

    const updated = produce(recipe, (draft) => {
      for (const [index, extensionPoint] of draft.extensionPoints.entries()) {
        extensionPoint.label = `New Label ${index}`;
      }
    });

    expect(newRecipe).toStrictEqual(updated);
  });

  test("one dirty element and one clean extension", async () => {
    const { recipe, state } = installRecipe(2);

    const [extensionPoint] = selectExtensionPoints(recipe);
    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);
    const extension = state.extensions[0];
    const adapter = ADAPTERS.get(extensionPoint.definition.type);
    const element = (await adapter.fromExtension(extension)) as FormState;
    const newLabel = "New Label";
    const oldLabel = element.label;
    element.label = newLabel;

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: [state.extensions[1]],
      dirtyRecipeElements: [element],
    });

    const updated = produce(recipe, (draft) => {
      const extensionPoint = draft.extensionPoints.find(
        (x) => x.label === oldLabel
      );
      extensionPoint.label = newLabel;
    });

    expect(newRecipe).toStrictEqual(updated);
  });

  test("one dirty element and two clean extensions", async () => {
    const { recipe, state } = installRecipe(3);

    const [extensionPoint] = selectExtensionPoints(recipe);
    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);
    const extension = state.extensions[0];
    const adapter = ADAPTERS.get(extensionPoint.definition.type);
    const element = (await adapter.fromExtension(extension)) as FormState;
    const newLabel = "New Label";
    const oldLabel = element.label;
    element.label = newLabel;

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: [state.extensions[1], state.extensions[2]],
      dirtyRecipeElements: [element],
    });

    const updated = produce(recipe, (draft) => {
      const extensionPoint = draft.extensionPoints.find(
        (x) => x.label === oldLabel
      );
      extensionPoint.label = newLabel;
    });

    expect(newRecipe).toStrictEqual(updated);
  });

  test("two dirty elements and one clean extension", async () => {
    const { recipe, state } = installRecipe(3);

    const extensionPoints = selectExtensionPoints(recipe);

    const elements: FormState[] = [];

    for (const [index, extensionPoint] of extensionPoints
      .slice(0, 2)
      .entries()) {
      (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);
      const extension = state.extensions[index];
      const adapter = ADAPTERS.get(extensionPoint.definition.type);
      // eslint-disable-next-line no-await-in-loop
      const element = (await adapter.fromExtension(extension)) as FormState;
      element.label = `New Label ${index}`;
      elements.push(element);
    }

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: [state.extensions[2]],
      dirtyRecipeElements: elements,
    });

    const updated = produce(recipe, (draft) => {
      for (const [index, extensionPoint] of draft.extensionPoints
        .slice(0, 2)
        .entries()) {
        extensionPoint.label = `New Label ${index}`;
      }
    });

    expect(newRecipe).toStrictEqual(updated);
  });

  test("two dirty elements and two clean extensions", async () => {
    const { recipe, state } = installRecipe(4);

    const extensionPoints = selectExtensionPoints(recipe);

    const elements: FormState[] = [];

    for (const [index, extensionPoint] of extensionPoints
      .slice(0, 2)
      .entries()) {
      (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);
      const extension = state.extensions[index];
      const adapter = ADAPTERS.get(extensionPoint.definition.type);
      // eslint-disable-next-line no-await-in-loop
      const element = (await adapter.fromExtension(extension)) as FormState;
      element.label = `New Label ${index}`;
      elements.push(element);
    }

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions: [state.extensions[2], state.extensions[3]],
      dirtyRecipeElements: elements,
    });

    const updated = produce(recipe, (draft) => {
      for (const [index, extensionPoint] of draft.extensionPoints
        .slice(0, 2)
        .entries()) {
        extensionPoint.label = `New Label ${index}`;
      }
    });

    expect(newRecipe).toStrictEqual(updated);
  });
});
