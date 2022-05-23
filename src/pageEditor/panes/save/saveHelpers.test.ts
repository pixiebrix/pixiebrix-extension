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
import { validateRegistryId, validateSemVerString } from "@/types/helpers";
import {
  extensionPointDefinitionFactory,
  innerExtensionPointRecipeFactory,
  versionedExtensionPointRecipeFactory,
  extensionPointConfigFactory,
  recipeFactory,
  versionedRecipeWithResolvedExtensions,
  extensionFactory,
} from "@/testUtils/factories";
import menuItemExtensionAdapter from "@/pageEditor/extensionPoints/menuItem";
import { UnknownObject } from "@/types";
import {
  internalExtensionPointMetaFactory,
  lookupExtensionPoint,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
} from "@/pageEditor/extensionPoints/base";
import { produce } from "immer";
import { makeInternalId } from "@/registry/internal";
import { cloneDeep, range, uniq } from "lodash";
import { InnerDefinitionRef, UnresolvedExtension } from "@/core";
import { MenuDefinition } from "@/extensionPoints/menuItemExtension";
import extensionsSlice from "@/store/extensionsSlice";
import {
  getMinimalSchema,
  getMinimalUiSchema,
} from "@/components/formBuilder/formBuilderHelpers";
import {
  EditablePackage,
  OptionsDefinition,
  UnsavedRecipeDefinition,
} from "@/types/definitions";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";

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
        version: validateSemVerString("1.0.0"),
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
        version: validateSemVerString("1.0.0"),
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
        version: validateSemVerString("1.0.0"),
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
      schema: getMinimalSchema(),
      uiSchema: getMinimalUiSchema(),
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
      uiSchema: getMinimalUiSchema(),
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
      uiSchema: getMinimalUiSchema(),
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
      uiSchema: getMinimalUiSchema(),
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
      uiSchema: getMinimalUiSchema(),
    };

    const elementOptions: OptionsDefinition = {
      schema: getMinimalSchema(),
      uiSchema: getMinimalUiSchema(),
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

describe("buildRecipe", () => {
  test("Clean extension referencing extensionPoint registry package", async () => {
    const extension = extensionFactory({
      apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    }) as UnresolvedExtension;

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: [extension],
      dirtyRecipeElements: [],
    });

    expect(newRecipe.extensionPoints).toHaveLength(1);
    expect(newRecipe.extensionPoints[0].id).toBe(extension.extensionPointId);
  });

  test("Dirty extension with services", async () => {
    const serviceId = validateRegistryId("@pixiebrix/api");
    const outputKey = validateOutputKey("pixiebrix");

    // Load the adapter for this extension
    const extensionPoint = extensionPointDefinitionFactory();

    const extension = extensionFactory({
      apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      services: [{ id: serviceId, outputKey, config: null }],
      extensionPointId: extensionPoint.metadata.id,
    }) as UnresolvedExtension;

    const adapter = ADAPTERS.get(extensionPoint.definition.type);

    // Mock this lookup for the adapter call that follows
    (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);

    // Use the adapter to convert to FormState
    const element = (await adapter.fromExtension(extension)) as FormState;

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: [],
      dirtyRecipeElements: [element],
    });

    expect(newRecipe.extensionPoints).toHaveLength(1);
    expect(newRecipe.extensionPoints[0].id).toBe(extension.extensionPointId);
    expect(newRecipe.extensionPoints[0].services).toStrictEqual({
      [outputKey]: serviceId,
    });
  });

  test("Preserve distinct extensionPoint definitions", async () => {
    // Load the adapter for this extension
    const extensionPoints = [
      extensionPointDefinitionFactory().definition,
      extensionPointDefinitionFactory().definition,
    ];

    const extensions = extensionPoints.map((extensionPoint) => {
      const extension = extensionFactory({
        apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      }) as UnresolvedExtension;

      extension.definitions = {
        extensionPoint: {
          kind: "extensionPoint",
          definition: extensionPoint,
        },
      };

      extension.extensionPointId = "extensionPoint" as InnerDefinitionRef;

      return extension;
    });

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: extensions,
      dirtyRecipeElements: [],
    });

    expect(Object.keys(newRecipe.definitions)).toStrictEqual([
      "extensionPoint",
      "extensionPoint2",
    ]);
    expect(newRecipe.extensionPoints).toHaveLength(2);
    expect(newRecipe.extensionPoints[0].id).toBe("extensionPoint");
    expect(newRecipe.extensionPoints[1].id).toBe("extensionPoint2");
  });

  test("Coalesce duplicate extensionPoint definitions", async () => {
    // Load the adapter for this extension
    const extensionPoint = extensionPointDefinitionFactory().definition;

    const extensions = range(0, 2).map(() => {
      const extension = extensionFactory({
        apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      }) as UnresolvedExtension;

      extension.definitions = {
        extensionPoint: {
          kind: "extensionPoint",
          definition: extensionPoint,
        },
      };

      extension.extensionPointId = "extensionPoint" as InnerDefinitionRef;

      return extension;
    });

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: extensions,
      dirtyRecipeElements: [],
    });

    expect(Object.keys(newRecipe.definitions)).toStrictEqual([
      "extensionPoint",
    ]);
    expect(newRecipe.extensionPoints).toHaveLength(extensions.length);
    expect(uniq(newRecipe.extensionPoints.map((x) => x.id))).toStrictEqual([
      "extensionPoint",
    ]);
  });

  test.each`
    cleanExtensionCount | dirtyExtensionCount
    ${1}                | ${0}
    ${2}                | ${0}
    ${3}                | ${0}
    ${0}                | ${1}
    ${0}                | ${2}
    ${0}                | ${3}
    ${1}                | ${1}
    ${2}                | ${1}
    ${1}                | ${2}
    ${2}                | ${2}
  `(
    "Test recipe with $cleanExtensionCount clean, and $dirtyExtensionCount changed/dirty extensions",
    async ({
      cleanExtensionCount,
      dirtyExtensionCount,
    }: {
      cleanExtensionCount: number;
      dirtyExtensionCount: number;
    }) => {
      const extensionCount = cleanExtensionCount + dirtyExtensionCount;

      // Create a recipe
      const recipe = versionedRecipeWithResolvedExtensions(extensionCount)();

      // Install the recipe
      const state = extensionsSlice.reducer(
        { extensions: [] },
        extensionsSlice.actions.installRecipe({
          recipe,
          services: {},
          extensionPoints: recipe.extensionPoints,
        })
      );

      // Collect the dirty form states for any changed extensions
      const elements: FormState[] = [];

      if (dirtyExtensionCount > 0) {
        const extensionPoints = selectExtensionPoints(recipe);

        for (let i = 0; i < dirtyExtensionCount; i++) {
          const extensionPoint = extensionPoints[i];
          // Mock this lookup for the adapter call that follows
          (lookupExtensionPoint as jest.Mock).mockResolvedValue(extensionPoint);

          // Recipe was installed, so get the extension from state
          const extension = state.extensions[i];

          // Load the adapter for this extension
          const adapter = ADAPTERS.get(extensionPoint.definition.type);

          // Use the adapter to convert to FormState
          // eslint-disable-next-line no-await-in-loop -- This is much easier to read than a large Promise.all() block
          const element = (await adapter.fromExtension(extension)) as FormState;

          // Edit the label
          element.label = `New Label ${i}`;

          elements.push(element);
        }
      }

      // Call the function under test
      const newRecipe = buildRecipe({
        sourceRecipe: recipe,
        // Only pass in the unchanged clean extensions
        cleanRecipeExtensions: state.extensions.slice(dirtyExtensionCount),
        dirtyRecipeElements: elements,
      });

      // Update the source recipe with the expected label changes
      const updated = produce(recipe, (draft) => {
        for (const [index, extensionPoint] of draft.extensionPoints
          .slice(0, dirtyExtensionCount)
          .entries()) {
          extensionPoint.label = `New Label ${index}`;
        }
      });

      // Compare results
      expect(newRecipe).toStrictEqual(updated);
    }
  );
});
