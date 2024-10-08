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

import {
  buildNewMod,
  generateScopeBrickId,
  replaceModComponent,
} from "@/pageEditor/panes/save/saveHelpers";
import { normalizeSemVerString, validateRegistryId } from "@/types/helpers";
import brickModComponentAdapter from "@/pageEditor/starterBricks/button";
import {
  internalStarterBrickMetaFactory,
  lookupStarterBrick,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
} from "@/pageEditor/starterBricks/base";
import { castDraft, produce } from "immer";
import { calculateInnerRegistryId } from "@/registry/hydrateInnerDefinitions";
import { cloneDeep, range, uniq } from "lodash";
import { type ButtonDefinition } from "@/starterBricks/button/buttonStarterBrickTypes";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import {
  type StarterBrickDefinitionLike,
  type StarterBrickDefinitionProp,
} from "@/starterBricks/types";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import {
  DefinitionKinds,
  type InnerDefinitionRef,
} from "@/types/registryTypes";
import {
  type ModOptionsDefinition,
  type ModVariablesDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { type SerializedModComponent } from "@/types/modComponentTypes";
import {
  modComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import {
  defaultModDefinitionFactory,
  innerStarterBrickModDefinitionFactory,
  modComponentDefinitionFactory,
  modDefinitionWithVersionedStarterBrickFactory,
  starterBrickDefinitionFactory,
  starterBrickInnerDefinitionFactory,
  versionedModDefinitionWithHydratedModComponents,
} from "@/testUtils/factories/modDefinitionFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { minimalUiSchemaFactory } from "@/utils/schemaUtils";
import {
  emptyModOptionsDefinitionFactory,
  emptyModVariablesDefinitionFactory,
  normalizeModDefinition,
} from "@/utils/modUtils";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { adapter } from "@/pageEditor/starterBricks/adapter";

jest.mock("@/pageEditor/starterBricks/base", () => ({
  ...jest.requireActual("@/pageEditor/starterBricks/base"),
  lookupStarterBrick: jest.fn(),
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

describe("replaceModComponent round trip", () => {
  test("single mod component with versioned starter brick", async () => {
    const starterBrick = starterBrickDefinitionFactory();
    const modDefinition = modDefinitionWithVersionedStarterBrickFactory({
      extensionPointId: starterBrick.metadata!.id,
    })();

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue(starterBrick);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        state.activatedModComponents[0]!,
      );
    modComponentFormState.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    const newMod = replaceModComponent(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.activatedModComponents,
      modComponentFormState,
    );

    expect(newMod).toStrictEqual(
      produce(modDefinition, (draft) => {
        castDraft(draft.metadata).id = newId;
        draft.extensionPoints[0]!.label = "New Label";

        // `variableDefinition` is required on mod component form state, so it gets populated on the mod definition
        draft.variables = emptyModVariablesDefinitionFactory();
      }),
    );
  });

  test("does not modify other starter brick", async () => {
    const starterBrick = starterBrickDefinitionFactory();

    const modDefinition = modDefinitionWithVersionedStarterBrickFactory({
      extensionPointId: starterBrick.metadata!.id,
    })();

    modDefinition.extensionPoints.push({
      ...modDefinition.extensionPoints[0]!,
      label: "Other Mod Component",
    });

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue(starterBrick);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        state.activatedModComponents[0]!,
      );
    modComponentFormState.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    const newMod = replaceModComponent(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.activatedModComponents,
      modComponentFormState,
    );

    expect(newMod).toStrictEqual(
      produce(modDefinition, (draft) => {
        castDraft(draft.metadata).id = newId;
        draft.extensionPoints[0]!.label = "New Label";

        // `variableDefinition` is required on mod component form state, so it gets populated on the mod definition
        draft.variables = emptyModVariablesDefinitionFactory();
      }),
    );
  });

  test("single starter brick with innerDefinition", async () => {
    const modDefinition = innerStarterBrickModDefinitionFactory()();

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue({
      ...modDefinition.definitions!.extensionPoint!,
      metadata: {
        id: calculateInnerRegistryId(
          modDefinition.definitions!.extensionPoint!,
        ),
        name: "Internal Starter Brick",
        version: normalizeSemVerString("1.0.0"),
      },
    } as any);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        state.activatedModComponents[0]!,
      );

    modComponentFormState.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);

    const newMod = replaceModComponent(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.activatedModComponents,
      modComponentFormState,
    );

    const target = produce(modDefinition, (draft) => {
      castDraft(draft.metadata).id = newId;
      draft.extensionPoints[0]!.label = "New Label";
    });

    expect(normalizeModDefinition(newMod)).toStrictEqual(
      normalizeModDefinition(target),
    );
  });

  test("remove excess starter brick definitions", async () => {
    const modDefinition = innerStarterBrickModDefinitionFactory()();
    const originalId = Object.keys(modDefinition.definitions!)[0];
    modDefinition.definitions!.excess = starterBrickInnerDefinitionFactory();

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue({
      ...modDefinition.definitions!.extensionPoint!,
      metadata: {
        id: calculateInnerRegistryId(
          modDefinition.definitions!.extensionPoint!,
        ),
        name: "Internal Starter Brick",
        version: normalizeSemVerString("1.0.0"),
      },
    } as any);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        state.activatedModComponents[0]!,
      );

    modComponentFormState.label = "New Label";

    const newMod = replaceModComponent(
      modDefinition,
      { ...modDefinition.metadata, id: registryIdFactory() },
      state.activatedModComponents,
      modComponentFormState,
    );

    // Expect the excess definition was removed
    expect(Object.keys(newMod.definitions!)).toStrictEqual([originalId]);
  });

  test("generate fresh identifier definition changed", async () => {
    const modDefinition = innerStarterBrickModDefinitionFactory()();

    modDefinition.extensionPoints.push({
      ...modDefinition.extensionPoints[0]!,
      label: "Other Mod Component",
    });

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue({
      ...modDefinition.definitions!.extensionPoint!,
      metadata: {
        id: calculateInnerRegistryId(
          modDefinition.definitions!.extensionPoint!,
        ),
        name: "Internal Starter Brick",
        version: normalizeSemVerString("1.0.0"),
      },
    } as any);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        state.activatedModComponents[0]!,
      );

    modComponentFormState.label = "New Label";
    const newTemplate = '<input value="Click Me!"/>';
    modComponentFormState.starterBrick.definition.template = newTemplate;

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);

    const newMod = replaceModComponent(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.activatedModComponents,
      modComponentFormState,
    );

    const target = produce(modDefinition, (draft) => {
      castDraft(draft.metadata).id = newId;

      draft.definitions!.extensionPoint2 = cloneDeep(
        modDefinition.definitions!.extensionPoint!,
      );
      (
        draft.definitions!.extensionPoint2.definition as ButtonDefinition
      ).template = newTemplate;
      draft.extensionPoints[0]!.id = "extensionPoint2" as InnerDefinitionRef;
      draft.extensionPoints[0]!.label = "New Label";
    });

    expect(normalizeModDefinition(newMod)).toStrictEqual(
      normalizeModDefinition(target),
    );
  });

  test("reuse identifier definition for multiple if starter brick not modified", async () => {
    const modDefinition = innerStarterBrickModDefinitionFactory()();

    modDefinition.extensionPoints.push({
      ...modDefinition.extensionPoints[0]!,
      label: "Other Mod Component",
    });

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue({
      ...modDefinition.definitions!.extensionPoint!,
      metadata: modMetadataFactory({
        id: calculateInnerRegistryId(
          modDefinition.definitions!.extensionPoint!,
        ),
        name: "Internal Starter Brick",
      }),
    } as any);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        state.activatedModComponents[0]!,
      );

    modComponentFormState.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);

    const newMod = replaceModComponent(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.activatedModComponents,
      modComponentFormState,
    );

    expect(newMod).toStrictEqual(
      produce(modDefinition, (draft) => {
        castDraft(draft.metadata).id = newId;
        draft.extensionPoints[0]!.label = "New Label";

        // `variableDefinition` is required on mod component form state, so it gets populated on the mod definition
        draft.variables = emptyModVariablesDefinitionFactory();
      }),
    );
  });

  test("updates Mod API version with single mod component", async () => {
    const starterBrick = starterBrickDefinitionFactory({
      apiVersion: "v2",
    });

    const starterBrickId = starterBrick.metadata!.id;
    const modDefinition = innerStarterBrickModDefinitionFactory({
      extensionPointRef: starterBrickId as any,
    })({
      apiVersion: "v2",
      definitions: {
        [starterBrickId]: starterBrick,
      } as any,
    });

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue(starterBrick);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent({
        ...state.activatedModComponents[0]!,
        apiVersion: "v3",
      });
    modComponentFormState.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    const newMod = replaceModComponent(
      modDefinition,
      { ...modDefinition.metadata, id: newId },
      state.activatedModComponents,
      modComponentFormState,
    );

    expect(newMod).toStrictEqual(
      produce(modDefinition, (draft) => {
        draft.apiVersion = "v3";
        castDraft(draft.metadata).id = newId;
        draft.definitions![starterBrick.metadata!.id]!.apiVersion = "v3";
        draft.extensionPoints[0]!.label = "New Label";

        // `variableDefinition` is required on mod component form state, so it gets populated on the mod definition
        draft.variables = emptyModVariablesDefinitionFactory();
      }),
    );
  });

  test("throws when API version mismatch and cannot update mod", async () => {
    const starterBrick = starterBrickDefinitionFactory();
    const modDefinition = modDefinitionWithVersionedStarterBrickFactory({
      extensionPointId: starterBrick.metadata!.id,
    })({
      apiVersion: "v2",
      extensionPoints: [
        modComponentDefinitionFactory({
          id: starterBrick.metadata!.id,
        }),
        modComponentDefinitionFactory(),
      ],
    });

    const state = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    jest.mocked(lookupStarterBrick).mockResolvedValue(starterBrick);

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent({
        ...state.activatedModComponents[0]!,
        apiVersion: "v3",
      });
    modComponentFormState.label = "New Label";

    const newId = generateScopeBrickId("@test", modDefinition.metadata.id);
    expect(() =>
      replaceModComponent(
        modDefinition,
        { ...modDefinition.metadata, id: newId },
        state.activatedModComponents,
        modComponentFormState,
      ),
    ).toThrow();
  });
});

describe("mod variables", () => {
  async function runReplaceModComponent(
    modVariablesDefinition: ModVariablesDefinition | undefined,
    modComponentModVariables: ModVariablesDefinition,
  ) {
    const modDefinition = defaultModDefinitionFactory({
      variables: modVariablesDefinition,
    });

    const modComponentState = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        modComponentState.activatedModComponents[0]!,
      );

    modComponentFormState.variablesDefinition = modComponentModVariables;

    return replaceModComponent(
      modDefinition,
      modDefinition.metadata,
      modComponentState.activatedModComponents,
      modComponentFormState,
    );
  }

  test("adds empty schema when mod options is empty", async () => {
    const emptyVariables = emptyModVariablesDefinitionFactory();

    const updatedModDefinition = await runReplaceModComponent(
      undefined,
      emptyVariables,
    );

    expect(updatedModDefinition.variables).toStrictEqual(
      emptyModVariablesDefinitionFactory(),
    );
  });

  test("creates mod variables", async () => {
    const modVariablesDefinition: ModVariablesDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
    };

    const updatedModDefinition = await runReplaceModComponent(
      undefined,
      modVariablesDefinition,
    );

    expect(updatedModDefinition.variables).toBe(modVariablesDefinition);
  });

  test("updates mod variables", async () => {
    const modVariablesDefinition: ModVariablesDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
    };

    const modComponentModVariables: ModVariablesDefinition = {
      schema: {
        type: "object",
        properties: {
          credentials: {
            type: "string",
          },
        },
      },
    };

    const updatedModDefinition = await runReplaceModComponent(
      modVariablesDefinition,
      modComponentModVariables,
    );

    expect(updatedModDefinition.variables).toBe(modComponentModVariables);
  });

  test("preserves mod variables", async () => {
    const modVariablesDefinition: ModVariablesDefinition = {
      schema: {
        type: "object",
        properties: {
          channels: {
            type: "string",
            title: "Channels",
          },
        },
      },
    };

    const modComponentModVariables: ModVariablesDefinition =
      emptyModVariablesDefinitionFactory();

    const updatedMod = await runReplaceModComponent(
      modVariablesDefinition,
      modComponentModVariables,
    );

    expect(updatedMod.variables).toStrictEqual(
      emptyModVariablesDefinitionFactory(),
    );
  });
});

describe("mod options", () => {
  async function runReplaceModComponent(
    modOptionsDefinition: ModOptionsDefinition,
    modComponentModOptions: ModOptionsDefinition,
  ) {
    const modDefinition = defaultModDefinitionFactory({
      options: modOptionsDefinition,
    });

    const modComponentState = modComponentSlice.reducer(
      { activatedModComponents: [] },
      modComponentSlice.actions.activateMod({
        modDefinition,
        screen: "pageEditor",
        isReactivate: false,
      }),
    );

    const modComponentFormState =
      await brickModComponentAdapter.fromModComponent(
        modComponentState.activatedModComponents[0]!,
      );

    modComponentFormState.optionsDefinition = modComponentModOptions;

    return replaceModComponent(
      modDefinition,
      modDefinition.metadata,
      modComponentState.activatedModComponents,
      modComponentFormState,
    );
  }

  test("adds empty schema when mod options is empty", async () => {
    const emptyOptions = emptyModOptionsDefinitionFactory();

    const updatedModDefinition = await runReplaceModComponent(
      {} as ModOptionsDefinition,
      emptyOptions,
    );

    expect(updatedModDefinition.options).toStrictEqual(
      emptyModOptionsDefinitionFactory(),
    );
  });

  test("creates mod options", async () => {
    const modOptionsDefinition: ModOptionsDefinition = {
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

    const updatedModDefinition = await runReplaceModComponent(
      {} as ModOptionsDefinition,
      modOptionsDefinition,
    );

    expect(updatedModDefinition.options).toBe(modOptionsDefinition);
  });

  test("updates mod options", async () => {
    const modOptionsDefinition: ModOptionsDefinition = {
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

    const modComponentModOptions: ModOptionsDefinition = {
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

    const updatedModDefinition = await runReplaceModComponent(
      modOptionsDefinition,
      modComponentModOptions,
    );

    expect(updatedModDefinition.options).toBe(modComponentModOptions);
  });

  test("preserves mod options", async () => {
    const modOptionsDefinition: ModOptionsDefinition = {
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

    const modComponentModOptions: ModOptionsDefinition =
      emptyModOptionsDefinitionFactory();

    const updatedMod = await runReplaceModComponent(
      modOptionsDefinition,
      modComponentModOptions,
    );

    expect(updatedMod.options).toStrictEqual(
      emptyModOptionsDefinitionFactory(),
    );
  });
});

function selectStarterBricks(
  modDefinition: UnsavedModDefinition,
): StarterBrickDefinitionLike[] {
  return modDefinition.extensionPoints.map(({ id }) => {
    const definition = modDefinition.definitions![id]!
      .definition as StarterBrickDefinitionProp;
    return {
      apiVersion: modDefinition.apiVersion,
      metadata: internalStarterBrickMetaFactory(),
      definition,
      kind: DefinitionKinds.STARTER_BRICK,
    };
  });
}

describe("buildNewMod", () => {
  test("Clean mod component referencing starter brick registry package", async () => {
    const modComponent = modComponentFactory({
      apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    }) as SerializedModComponent;

    // Call the function under test
    const newMod = buildNewMod({
      sourceMod: undefined,
      cleanModComponents: [modComponent],
      dirtyModComponentFormStates: [],
    });

    expect(newMod.extensionPoints).toHaveLength(1);
    expect(newMod.extensionPoints[0]!.id).toBe(modComponent.extensionPointId);
  });

  test("Dirty mod component with integrations", async () => {
    const integrationId = validateRegistryId("@pixiebrix/api");
    const outputKey = validateOutputKey("pixiebrix");

    // Load the adapter for this mod component
    const starterBrick = starterBrickDefinitionFactory();

    const modComponent = modComponentFactory({
      apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      integrationDependencies: [
        integrationDependencyFactory({ integrationId, outputKey }),
      ],
      extensionPointId: starterBrick.metadata!.id,
    }) as SerializedModComponent;

    const { fromModComponent } = adapter(starterBrick.definition.type);

    // Mock this lookup for the adapter call that follows
    jest.mocked(lookupStarterBrick).mockResolvedValue(starterBrick);

    // Use the adapter to convert to ModComponentFormState
    const modComponentFormState = (await fromModComponent(
      modComponent,
    )) as ModComponentFormState;

    // Call the function under test
    const newMod = buildNewMod({
      sourceMod: undefined,
      cleanModComponents: [],
      dirtyModComponentFormStates: [modComponentFormState],
    });

    expect(newMod.extensionPoints).toHaveLength(1);
    expect(newMod.extensionPoints[0]!.id).toBe(modComponent.extensionPointId);
    expect(newMod.extensionPoints[0]!.services).toStrictEqual({
      [outputKey]: integrationId,
    });
  });

  test("Preserve distinct starter brick definitions", async () => {
    // Load the adapter for this mod component
    const starterBricks = [
      starterBrickDefinitionFactory().definition,
      starterBrickDefinitionFactory().definition,
    ];

    const modComponents = starterBricks.map((starterBrick) => {
      const modComponent = modComponentFactory({
        apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      }) as SerializedModComponent;

      modComponent.definitions = {
        extensionPoint: {
          kind: DefinitionKinds.STARTER_BRICK,
          definition: starterBrick,
        },
      };

      modComponent.extensionPointId = "extensionPoint" as InnerDefinitionRef;

      return modComponent;
    });

    // Call the function under test
    const newMod = buildNewMod({
      sourceMod: undefined,
      cleanModComponents: modComponents,
      dirtyModComponentFormStates: [],
    });

    expect(Object.keys(newMod.definitions!)).toStrictEqual([
      "extensionPoint",
      "extensionPoint2",
    ]);
    expect(newMod.extensionPoints).toHaveLength(2);
    expect(newMod.extensionPoints[0]!.id).toBe("extensionPoint");
    expect(newMod.extensionPoints[1]!.id).toBe("extensionPoint2");
  });

  test("Delete excess starter brick definitions", async () => {
    // Load the adapter for this mod component
    const starterBricks = [
      starterBrickInnerDefinitionFactory(),
      starterBrickInnerDefinitionFactory(),
      // Excess
      starterBrickInnerDefinitionFactory(),
    ];

    const modComponents = starterBricks.slice(0, 2).map((starterBrick) => {
      const modComponent = modComponentFactory({
        apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      }) as SerializedModComponent;

      modComponent.definitions = {
        extensionPoint: starterBrick,
      };

      modComponent.extensionPointId = "extensionPoint" as InnerDefinitionRef;

      return modComponent;
    });

    // Call the function under test
    const newMod = buildNewMod({
      sourceMod: undefined,
      cleanModComponents: modComponents,
      dirtyModComponentFormStates: [],
    });

    expect(Object.keys(newMod.definitions!)).toStrictEqual([
      "extensionPoint",
      "extensionPoint2",
    ]);
  });

  test("Coalesce duplicate starter brick definitions", async () => {
    // Load the adapter for this mod component
    const starterBrick = starterBrickDefinitionFactory().definition;

    const modComponents = range(0, 2).map(() => {
      const modComponent = modComponentFactory({
        apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      }) as SerializedModComponent;

      modComponent.definitions = {
        extensionPoint: {
          kind: DefinitionKinds.STARTER_BRICK,
          definition: starterBrick,
        },
      };

      modComponent.extensionPointId = "extensionPoint" as InnerDefinitionRef;

      return modComponent;
    });

    // Call the function under test
    const newMod = buildNewMod({
      sourceMod: undefined,
      cleanModComponents: modComponents,
      dirtyModComponentFormStates: [],
    });

    expect(Object.keys(newMod.definitions!)).toStrictEqual(["extensionPoint"]);
    expect(newMod.extensionPoints).toHaveLength(modComponents.length);
    expect(uniq(newMod.extensionPoints.map((x) => x.id))).toStrictEqual([
      "extensionPoint",
    ]);
  });

  test.each`
    cleanModComponentCount | dirtyModComponentCount
    ${1}                   | ${0}
    ${2}                   | ${0}
    ${3}                   | ${0}
    ${0}                   | ${1}
    ${0}                   | ${2}
    ${0}                   | ${3}
    ${1}                   | ${1}
    ${2}                   | ${1}
    ${1}                   | ${2}
    ${2}                   | ${2}
  `(
    "mod with $cleanModComponentCount clean, and $dirtyModComponentCount changed/dirty mod components",
    async ({
      cleanModComponentCount,
      dirtyModComponentCount,
    }: {
      cleanModComponentCount: number;
      dirtyModComponentCount: number;
    }) => {
      const totalModComponentCount =
        cleanModComponentCount + dirtyModComponentCount;

      // Create a mod
      const modDefinition = versionedModDefinitionWithHydratedModComponents(
        totalModComponentCount,
      )();

      // Activate the mod
      const state = modComponentSlice.reducer(
        { activatedModComponents: [] },
        modComponentSlice.actions.activateMod({
          modDefinition,
          screen: "pageEditor",
          isReactivate: false,
        }),
      );

      // Collect the dirty form states for any changed mod components
      const modComponentFormStates: ModComponentFormState[] = [];

      if (dirtyModComponentCount > 0) {
        const starterBricks = selectStarterBricks(modDefinition);

        for (let i = 0; i < dirtyModComponentCount; i++) {
          const starterBrick = starterBricks[i]!;
          // Mock this lookup for the adapter call that follows
          jest.mocked(lookupStarterBrick).mockResolvedValue(starterBrick);

          // Mod was activated, so get the mod component from state
          const modComponent = state.activatedModComponents[i]!;

          // Load the adapter for this mod component
          const { fromModComponent } = adapter(starterBrick.definition.type);

          // Use the adapter to convert to FormState
          // eslint-disable-next-line no-await-in-loop -- This is much easier to read than a large Promise.all() block
          const modComponentFormState = (await fromModComponent(
            modComponent,
          )) as ModComponentFormState;

          // Edit the label
          modComponentFormState.label = `New Label ${i}`;

          modComponentFormStates.push(modComponentFormState);
        }
      }

      // Call the function under test
      const newMod = buildNewMod({
        sourceMod: modDefinition,
        // Only pass in the unchanged clean mod components
        cleanModComponents: state.activatedModComponents.slice(
          dirtyModComponentCount,
        ),
        dirtyModComponentFormStates: modComponentFormStates,
      });

      // Update the source mod with the expected label changes
      const updatedMod = produce(modDefinition, (draft) => {
        for (const [index, starterBrick] of draft.extensionPoints
          .slice(0, dirtyModComponentCount)
          .entries()) {
          starterBrick.label = `New Label ${index}`;
        }
      });

      // Compare results
      expect(normalizeModDefinition(newMod)).toStrictEqual(
        normalizeModDefinition(updatedMod),
      );
    },
  );
});
