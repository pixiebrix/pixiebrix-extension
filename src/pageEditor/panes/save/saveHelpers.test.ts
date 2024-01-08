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
  buildRecipe,
  findMaxIntegrationDependencyApiVersion,
  generateScopeBrickId,
  isRecipeEditable,
  replaceRecipeExtension,
  selectExtensionPointIntegrations,
} from "@/pageEditor/panes/save/saveHelpers";
import { validateRegistryId, validateSemVerString } from "@/types/helpers";
import menuItemExtensionAdapter from "@/pageEditor/starterBricks/menuItem";
import { type UnknownObject } from "@/types/objectTypes";
import {
  internalStarterBrickMetaFactory,
  lookupExtensionPoint,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
} from "@/pageEditor/starterBricks/base";
import { produce } from "immer";
import { makeInternalId } from "@/registry/internal";
import { cloneDeep, range, uniq } from "lodash";
import { type MenuDefinition } from "@/starterBricks/menuItemExtension";
import extensionsSlice from "@/store/extensionsSlice";
import {
  type StarterBrickConfig,
  type StarterBrickDefinition,
} from "@/starterBricks/types";
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { type InnerDefinitionRef } from "@/types/registryTypes";
import {
  type ModOptionsDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import {
  type ModComponentBase,
  type UnresolvedModComponent,
} from "@/types/modComponentTypes";
import { type EditablePackageMetadata } from "@/types/contract";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import {
  defaultModDefinitionFactory,
  innerStarterBrickModDefinitionFactory,
  modComponentDefinitionFactory,
  modDefinitionWithVersionedStarterBrickFactory,
  starterBrickConfigFactory,
  versionedModDefinitionWithResolvedModComponents,
} from "@/testUtils/factories/modDefinitionFactories";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { SERVICES_BASE_SCHEMA_URL } from "@/integrations/util/makeServiceContextFromDependencies";
import { minimalUiSchemaFactory } from "@/utils/schemaUtils";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";

jest.mock("@/background/contextMenus");

jest.mock("@/pageEditor/starterBricks/base", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Wrong
  ...(jest.requireActual("@/pageEditor/starterBricks/base") as UnknownObject),
  lookupExtensionPoint: jest.fn(),
}));

describe("generatePersonalBrickId", () => {
  test("replace other scope", () => {
    expect(
      generateScopeBrickId("@foo", validateRegistryId("@pixiebrix/baz")),
    ).toBe("@foo/baz");
  });

  test("add scope", () => {
    expect(generateScopeBrickId("@foo", validateRegistryId("baz"))).toBe(
      "@foo/baz",
    );
    expect(
      generateScopeBrickId("@foo", validateRegistryId("collection/baz")),
    ).toBe("@foo/collection/baz");
  });
});

describe("replaceRecipeExtension round trip", () => {
  test("single extension with versioned extensionPoint", async () => {
    const starterBrick = starterBrickConfigFactory();
    const modDefinition = modDefinitionWithVersionedStarterBrickFactory({
      extensionPointId: starterBrick.metadata.id,
    })();

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    jest.mocked(lookupExtensionPoint).mockResolvedValue(starterBrick);

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0],
    );
    element.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    const newRecipe = replaceRecipeExtension(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.extensions,
      element,
    );

    expect(newRecipe).toStrictEqual(
      produce(modDefinition, (draft) => {
        draft.metadata.id = newId;
        draft.extensionPoints[0].label = "New Label";
      }),
    );
  });

  test("does not modify other starter brick", async () => {
    const starterBrick = starterBrickConfigFactory();

    const modDefinition = modDefinitionWithVersionedStarterBrickFactory({
      extensionPointId: starterBrick.metadata.id,
    })();

    modDefinition.extensionPoints.push({
      ...modDefinition.extensionPoints[0],
      label: "Other Extension",
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    jest.mocked(lookupExtensionPoint).mockResolvedValue(starterBrick);

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0],
    );
    element.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    const newRecipe = replaceRecipeExtension(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.extensions,
      element,
    );

    expect(newRecipe).toStrictEqual(
      produce(modDefinition, (draft) => {
        draft.metadata.id = newId;
        draft.extensionPoints[0].label = "New Label";
      }),
    );
  });

  test("single starter brick with innerDefinition", async () => {
    const modDefinition = innerStarterBrickModDefinitionFactory()();

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    jest.mocked(lookupExtensionPoint).mockResolvedValue({
      ...modDefinition.definitions.extensionPoint,
      metadata: {
        id: makeInternalId(modDefinition.definitions.extensionPoint),
        name: "Internal Starter Brick",
        version: validateSemVerString("1.0.0"),
      },
    } as any);

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0],
    );

    element.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);

    const newRecipe = replaceRecipeExtension(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.extensions,
      element,
    );

    expect(newRecipe).toStrictEqual(
      produce(modDefinition, (draft) => {
        draft.metadata.id = newId;
        draft.extensionPoints[0].label = "New Label";
      }),
    );
  });

  test("generate fresh identifier definition changed", async () => {
    const modDefinition = innerStarterBrickModDefinitionFactory()();

    modDefinition.extensionPoints.push({
      ...modDefinition.extensionPoints[0],
      label: "Other Extension",
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    jest.mocked(lookupExtensionPoint).mockResolvedValue({
      ...modDefinition.definitions.extensionPoint,
      metadata: {
        id: makeInternalId(modDefinition.definitions.extensionPoint),
        name: "Internal Starter Brick",
        version: validateSemVerString("1.0.0"),
      },
    } as any);

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0],
    );

    element.label = "New Label";
    const newTemplate = '<input value="Click Me!"/>';
    element.extensionPoint.definition.template = newTemplate;

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);

    const newRecipe = replaceRecipeExtension(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.extensions,
      element,
    );

    expect(newRecipe).toStrictEqual(
      produce(modDefinition, (draft) => {
        draft.metadata.id = newId;

        draft.definitions.extensionPoint2 = cloneDeep(
          modDefinition.definitions.extensionPoint,
        );
        (
          draft.definitions.extensionPoint2.definition as MenuDefinition
        ).template = newTemplate;
        draft.extensionPoints[0].id = "extensionPoint2" as InnerDefinitionRef;
        draft.extensionPoints[0].label = "New Label";
      }),
    );
  });

  test("reuse identifier definition for multiple if extensionPoint not modified", async () => {
    const modDefinition = innerStarterBrickModDefinitionFactory()();

    modDefinition.extensionPoints.push({
      ...modDefinition.extensionPoints[0],
      label: "Other Extension",
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    // Mimic what would come back via internal.ts:resolveRecipe
    jest.mocked(lookupExtensionPoint).mockResolvedValue({
      ...modDefinition.definitions.extensionPoint,
      metadata: {
        id: makeInternalId(modDefinition.definitions.extensionPoint),
        name: "Internal Starter Brick",
        version: validateSemVerString("1.0.0"),
      },
    } as any);

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0],
    );

    element.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);

    const newRecipe = replaceRecipeExtension(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.extensions,
      element,
    );

    expect(newRecipe).toStrictEqual(
      produce(modDefinition, (draft) => {
        draft.metadata.id = newId;
        draft.extensionPoints[0].label = "New Label";
      }),
    );
  });

  test("updates Recipe API version with single mod component", async () => {
    const starterBrick = starterBrickConfigFactory({
      apiVersion: "v2",
    });

    const extensionPointId = starterBrick.metadata.id;
    const modDefinition = innerStarterBrickModDefinitionFactory({
      extensionPointRef: extensionPointId as any,
    })({
      apiVersion: "v2",
      definitions: {
        [extensionPointId]: starterBrick,
      } as any,
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    jest.mocked(lookupExtensionPoint).mockResolvedValue(starterBrick);

    const element = await menuItemExtensionAdapter.fromExtension({
      ...state.extensions[0],
      apiVersion: "v3",
    });
    element.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    const newRecipe = replaceRecipeExtension(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.extensions,
      element,
    );

    expect(newRecipe).toStrictEqual(
      produce(modDefinition, (draft) => {
        draft.apiVersion = "v3";
        draft.metadata.id = newId;
        draft.definitions[starterBrick.metadata.id].apiVersion = "v3";
        draft.extensionPoints[0].label = "New Label";
      }),
    );
  });

  test("throws when API version mismatch and cannot update recipe", async () => {
    const starterBrick = starterBrickConfigFactory();
    const modDefinition = modDefinitionWithVersionedStarterBrickFactory({
      extensionPointId: starterBrick.metadata.id,
    })({
      apiVersion: "v2",
      extensionPoints: [
        modComponentDefinitionFactory({
          id: starterBrick.metadata.id,
        }),
        modComponentDefinitionFactory(),
      ],
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    jest.mocked(lookupExtensionPoint).mockResolvedValue(starterBrick);

    const element = await menuItemExtensionAdapter.fromExtension({
      ...state.extensions[0],
      apiVersion: "v3",
    });
    element.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    expect(() =>
      replaceRecipeExtension(
        modDefinition,
        { ...modDefinition.metadata, id: newId },
        state.extensions,
        element,
      ),
    ).toThrow();
  });
});

describe("blueprint options", () => {
  async function runReplaceRecipeExtensions(
    recipeOptions: ModOptionsDefinition,
    elementOptions: ModOptionsDefinition,
  ) {
    const modDefinition = defaultModDefinitionFactory({
      options: recipeOptions,
    });

    const state = extensionsSlice.reducer(
      { extensions: [] },
      extensionsSlice.actions.installMod({
        modDefinition,
        screen: "pageEditor",
        isReinstall: false,
      }),
    );

    const element = await menuItemExtensionAdapter.fromExtension(
      state.extensions[0],
    );

    element.optionsDefinition = elementOptions;

    return replaceRecipeExtension(
      modDefinition,
      modDefinition.metadata,
      state.extensions,
      element,
    );
  }

  test("doesn't add empty schema when blueprint options is empty", async () => {
    const emptyOptions = emptyModOptionsDefinitionFactory();

    const updatedRecipe = await runReplaceRecipeExtensions(
      undefined,
      emptyOptions,
    );

    expect(updatedRecipe.options).toBeUndefined();
  });

  test("creates blueprint options", async () => {
    const elementOptions: ModOptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
      uiSchema: minimalUiSchemaFactory(),
    };

    const updatedRecipe = await runReplaceRecipeExtensions(
      undefined,
      elementOptions,
    );

    expect(updatedRecipe.options).toBe(elementOptions);
  });

  test("updates blueprint options", async () => {
    const blueprintOptions: ModOptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
      uiSchema: minimalUiSchemaFactory(),
    };

    const elementOptions: ModOptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          credentials: {
            type: "string",
          },
        },
      },
      uiSchema: minimalUiSchemaFactory(),
    };

    const updatedRecipe = await runReplaceRecipeExtensions(
      blueprintOptions,
      elementOptions,
    );

    expect(updatedRecipe.options).toBe(elementOptions);
  });

  test("removes blueprint options", async () => {
    const blueprintOptions: ModOptionsDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
      uiSchema: minimalUiSchemaFactory(),
    };

    const elementOptions: ModOptionsDefinition =
      emptyModOptionsDefinitionFactory();

    const updatedRecipe = await runReplaceRecipeExtensions(
      blueprintOptions,
      elementOptions,
    );

    expect(updatedRecipe.options).toBeUndefined();
  });
});

describe("isRecipeEditable", () => {
  test("returns true if recipe is in editable packages", () => {
    const recipe = defaultModDefinitionFactory();
    const editablePackages: EditablePackageMetadata[] = [
      {
        id: null,
        name: validateRegistryId("test/recipe"),
      },
      {
        id: null,
        name: recipe.metadata.id,
      },
    ] as EditablePackageMetadata[];

    expect(isRecipeEditable(editablePackages, recipe)).toBe(true);
  });

  test("returns false if recipe is not in editable packages", () => {
    const recipe = defaultModDefinitionFactory();
    const editablePackages: EditablePackageMetadata[] = [
      {
        id: null,
        name: validateRegistryId("test/recipe"),
      },
    ] as EditablePackageMetadata[];

    expect(isRecipeEditable(editablePackages, recipe)).toBe(false);
  });

  test("returns false if recipe is null", () => {
    const editablePackages: EditablePackageMetadata[] = [
      {
        id: null,
        name: validateRegistryId("test/recipe"),
      },
    ] as EditablePackageMetadata[];

    expect(isRecipeEditable(editablePackages, null)).toBe(false);
  });
});

function selectExtensionPoints(
  recipe: UnsavedModDefinition,
): StarterBrickConfig[] {
  return recipe.extensionPoints.map(({ id }) => {
    const definition = recipe.definitions[id]
      .definition as StarterBrickDefinition;
    return {
      apiVersion: recipe.apiVersion,
      metadata: internalStarterBrickMetaFactory(),
      definition,
      kind: "extensionPoint",
    };
  });
}

describe("buildRecipe", () => {
  test("Clean extension referencing extensionPoint registry package", async () => {
    const modComponent = modComponentFactory({
      apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    }) as UnresolvedModComponent;

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: [modComponent],
      dirtyRecipeElements: [],
    });

    expect(newRecipe.extensionPoints).toHaveLength(1);
    expect(newRecipe.extensionPoints[0].id).toBe(modComponent.extensionPointId);
  });

  test("Dirty extension with services", async () => {
    const integrationId = validateRegistryId("@pixiebrix/api");
    const outputKey = validateOutputKey("pixiebrix");

    // Load the adapter for this mod component
    const starterBrick = starterBrickConfigFactory();

    const modComponent = modComponentFactory({
      apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      integrationDependencies: [
        integrationDependencyFactory({ integrationId, outputKey }),
      ],
      extensionPointId: starterBrick.metadata.id,
    }) as UnresolvedModComponent;

    const adapter = ADAPTERS.get(starterBrick.definition.type);

    // Mock this lookup for the adapter call that follows
    jest.mocked(lookupExtensionPoint).mockResolvedValue(starterBrick);

    // Use the adapter to convert to FormState
    const element = (await adapter.fromExtension(
      modComponent,
    )) as ModComponentFormState;

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: [],
      dirtyRecipeElements: [element],
    });

    expect(newRecipe.extensionPoints).toHaveLength(1);
    expect(newRecipe.extensionPoints[0].id).toBe(modComponent.extensionPointId);
    expect(newRecipe.extensionPoints[0].services).toStrictEqual({
      [outputKey]: integrationId,
    });
  });

  test("Preserve distinct starter brick definitions", async () => {
    // Load the adapter for this mod component
    const starterBricks = [
      starterBrickConfigFactory().definition,
      starterBrickConfigFactory().definition,
    ];

    const modComponents = starterBricks.map((extensionPoint) => {
      const modComponent = modComponentFactory({
        apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      }) as UnresolvedModComponent;

      modComponent.definitions = {
        extensionPoint: {
          kind: "extensionPoint",
          definition: extensionPoint,
        },
      };

      modComponent.extensionPointId = "extensionPoint" as InnerDefinitionRef;

      return modComponent;
    });

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: modComponents,
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

  test("Coalesce duplicate starter brick definitions", async () => {
    // Load the adapter for this mod component
    const starterBrick = starterBrickConfigFactory().definition;

    const modComponents = range(0, 2).map(() => {
      const modComponent = modComponentFactory({
        apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      }) as UnresolvedModComponent;

      modComponent.definitions = {
        extensionPoint: {
          kind: "extensionPoint",
          definition: starterBrick,
        },
      };

      modComponent.extensionPointId = "extensionPoint" as InnerDefinitionRef;

      return modComponent;
    });

    // Call the function under test
    const newRecipe = buildRecipe({
      sourceRecipe: null,
      cleanRecipeExtensions: modComponents,
      dirtyRecipeElements: [],
    });

    expect(Object.keys(newRecipe.definitions)).toStrictEqual([
      "extensionPoint",
    ]);
    expect(newRecipe.extensionPoints).toHaveLength(modComponents.length);
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
    "recipe with $cleanExtensionCount clean, and $dirtyExtensionCount changed/dirty extensions",
    async ({
      cleanExtensionCount,
      dirtyExtensionCount,
    }: {
      cleanExtensionCount: number;
      dirtyExtensionCount: number;
    }) => {
      const extensionCount = cleanExtensionCount + dirtyExtensionCount;

      // Create a recipe
      const modDefinition =
        versionedModDefinitionWithResolvedModComponents(extensionCount)();

      // Install the recipe
      const state = extensionsSlice.reducer(
        { extensions: [] },
        extensionsSlice.actions.installMod({
          modDefinition,
          screen: "pageEditor",
          isReinstall: false,
        }),
      );

      // Collect the dirty form states for any changed extensions
      const elements: ModComponentFormState[] = [];

      if (dirtyExtensionCount > 0) {
        const extensionPoints = selectExtensionPoints(modDefinition);

        for (let i = 0; i < dirtyExtensionCount; i++) {
          const extensionPoint = extensionPoints[i];
          // Mock this lookup for the adapter call that follows
          jest.mocked(lookupExtensionPoint).mockResolvedValue(extensionPoint);

          // Recipe was installed, so get the extension from state
          const extension = state.extensions[i];

          // Load the adapter for this extension
          const adapter = ADAPTERS.get(extensionPoint.definition.type);

          // Use the adapter to convert to FormState
          // eslint-disable-next-line no-await-in-loop -- This is much easier to read than a large Promise.all() block
          const element = (await adapter.fromExtension(
            extension,
          )) as ModComponentFormState;

          // Edit the label
          element.label = `New Label ${i}`;

          elements.push(element);
        }
      }

      // Call the function under test
      const newRecipe = buildRecipe({
        sourceRecipe: modDefinition,
        // Only pass in the unchanged clean extensions
        cleanRecipeExtensions: state.extensions.slice(dirtyExtensionCount),
        dirtyRecipeElements: elements,
      });

      // Update the source recipe with the expected label changes
      const updated = produce(modDefinition, (draft) => {
        for (const [index, extensionPoint] of draft.extensionPoints
          .slice(0, dirtyExtensionCount)
          .entries()) {
          extensionPoint.label = `New Label ${index}`;
        }
      });

      // Compare results
      expect(newRecipe).toStrictEqual(updated);
    },
  );
});

describe("findMaxServicesDependencyApiVersion", () => {
  it("returns v1 for v1 dependencies", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {
        apiVersion: "v1",
      },
      {
        apiVersion: "v1",
      },
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v1");
  });

  it("returns v2 for v2 dependencies", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {
        apiVersion: "v2",
      },
      {
        apiVersion: "v2",
      },
      {
        apiVersion: "v2",
      },
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v2");
  });

  it("works with undefined version", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {},
      {},
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v1");
  });

  it("works with mixed dependencies", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {
        apiVersion: "v1",
      },
      {
        apiVersion: "v2",
      },
      {
        apiVersion: "v1",
      },
      {},
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v2");
  });
});

describe("selectExtensionPointServices", () => {
  it("works for v1 services", () => {
    const extension: Pick<ModComponentBase, "integrationDependencies"> = {
      integrationDependencies: [
        integrationDependencyFactory(),
        integrationDependencyFactory({
          isOptional: undefined,
          apiVersion: undefined,
        }),
      ],
    };
    expect(selectExtensionPointIntegrations(extension)).toStrictEqual({
      [extension.integrationDependencies[0].outputKey]:
        extension.integrationDependencies[0].integrationId,
      [extension.integrationDependencies[1].outputKey]:
        extension.integrationDependencies[1].integrationId,
    });
  });

  it("works for v2 services", () => {
    const extension: Pick<ModComponentBase, "integrationDependencies"> = {
      integrationDependencies: [
        integrationDependencyFactory({
          apiVersion: "v2",
          isOptional: true,
        }),
        integrationDependencyFactory({
          apiVersion: "v2",
          isOptional: false,
        }),
        integrationDependencyFactory({
          apiVersion: "v2",
          isOptional: true,
        }),
      ],
    };
    expect(selectExtensionPointIntegrations(extension)).toStrictEqual({
      properties: {
        [extension.integrationDependencies[0].outputKey]: {
          $ref: `${SERVICES_BASE_SCHEMA_URL}${extension.integrationDependencies[0].integrationId}`,
        },
        [extension.integrationDependencies[1].outputKey]: {
          $ref: `${SERVICES_BASE_SCHEMA_URL}${extension.integrationDependencies[1].integrationId}`,
        },
        [extension.integrationDependencies[2].outputKey]: {
          $ref: `${SERVICES_BASE_SCHEMA_URL}${extension.integrationDependencies[2].integrationId}`,
        },
      },
      required: [extension.integrationDependencies[1].outputKey],
    });
  });
});
