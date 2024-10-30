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
} from "@/pageEditor/panes/save/saveHelpers";
import { validateRegistryId } from "@/types/helpers";
import {
  internalStarterBrickMetaFactory,
  lookupStarterBrick,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
} from "@/pageEditor/starterBricks/base";
import { produce } from "immer";
import { range, uniq } from "lodash";
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
import { type UnsavedModDefinition } from "@/types/modDefinitionTypes";
import { type SerializedModComponent } from "@/types/modComponentTypes";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import {
  starterBrickDefinitionFactory,
  starterBrickInnerDefinitionFactory,
  versionedModDefinitionWithHydratedModComponents,
} from "@/testUtils/factories/modDefinitionFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { normalizeModDefinition } from "@/utils/modUtils";
import { adapter } from "@/pageEditor/starterBricks/adapter";
import { array } from "cooky-cutter";

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
      sourceModDefinition: undefined,
      draftModComponents: [modComponent],
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
      sourceModDefinition: undefined,
      draftModComponents: [modComponentFormState],
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
      sourceModDefinition: undefined,
      draftModComponents: modComponents,
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
    const starterBricks = array(starterBrickInnerDefinitionFactory, 3)();

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
      sourceModDefinition: undefined,
      draftModComponents: modComponents,
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
      sourceModDefinition: undefined,
      draftModComponents: modComponents,
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

      const starterBricks = selectStarterBricks(modDefinition);

      // Collect the dirty form states for any changed mod components
      const dirtyModComponentFormStates: ModComponentFormState[] = [];

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

        dirtyModComponentFormStates.push(modComponentFormState);
      }

      const actualModDefinition = buildNewMod({
        sourceModDefinition: modDefinition,
        draftModComponents: [
          // `buildAndValidate` now preserves mod component order. So order of dirty vs. clean must match the
          // construction for expectedModDefinition
          ...dirtyModComponentFormStates,
          // Only pass in the unchanged clean mod components
          ...state.activatedModComponents.slice(dirtyModComponentCount),
        ],
      });

      // Directly update the source mod with the expected label changes
      const expectedModDefinition = produce(modDefinition, (draft) => {
        for (const [index, starterBrick] of draft.extensionPoints
          .slice(0, dirtyModComponentCount)
          .entries()) {
          starterBrick.label = `New Label ${index}`;
        }
      });

      // Compare results
      expect(normalizeModDefinition(actualModDefinition)).toStrictEqual(
        normalizeModDefinition(expectedModDefinition),
      );
    },
  );
});
