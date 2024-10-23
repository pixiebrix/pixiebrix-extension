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

import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import {
  internalStarterBrickMetaFactory,
  lookupStarterBrick,
} from "@/pageEditor/starterBricks/base";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { hookAct, renderHook } from "@/pageEditor/testHelpers";
import {
  type StarterBrickDefinitionLike,
  type StarterBrickDefinitionProp,
} from "@/starterBricks/types";
import modComponentSlice, {
  actions as modComponentActions,
} from "@/store/modComponents/modComponentSlice";
import {
  modComponentDefinitionFactory,
  modDefinitionFactory,
  versionedModDefinitionWithHydratedModComponents,
} from "@/testUtils/factories/modDefinitionFactories";
import { type UnsavedModDefinition } from "@/types/modDefinitionTypes";
import produce from "immer";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { array } from "cooky-cutter";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { normalizeModDefinition } from "@/utils/modUtils";
import { DefinitionKinds } from "@/types/registryTypes";
import { adapter } from "@/pageEditor/starterBricks/adapter";

jest.mock("@/pageEditor/starterBricks/base", () => ({
  ...jest.requireActual("@/pageEditor/starterBricks/base"),
  lookupStarterBrick: jest.fn(),
}));

describe("useBuildAndValidateMod", () => {
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

  it.each`
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
        modComponentActions.activateMod({
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

      const { result } = renderHook(() => useBuildAndValidateMod(), {
        setupRedux(dispatch) {
          dispatch(
            modComponentActions.activateMod({
              modDefinition,
              screen: "pageEditor",
              isReactivate: false,
            }),
          );
        },
      });

      await hookAct(async () => {
        const actualModDefinition = await result.current.buildAndValidateMod({
          sourceModDefinition: modDefinition,
          draftModComponents: [
            // `buildAndValidate` now preserves mod component order. So order of dirty vs. clean must match the
            // construction for expectedModDefinition
            ...dirtyModComponentFormStates,
            // Only pass in the unchanged clean mod components
            ...state.activatedModComponents.slice(dirtyModComponentCount),
          ],
        });

        // Update the source mod with the expected label changes
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
      });
    },
  );

  it("built mod has the wrong number of mod components", async () => {
    const modMetadata = modMetadataFactory();
    const activatedModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: array(modComponentDefinitionFactory, 1),
    });

    const dirtyFormState1 = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { result, getReduxStore } = renderHook(
      () => useBuildAndValidateMod(),
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentActions.activateMod({
              modDefinition: activatedModDefinition,
              screen: "pageEditor",
              isReactivate: false,
            }),
          );
          dispatch(editorActions.addModComponentFormState(dirtyFormState1));
        },
      },
    );

    const state = getReduxStore().getState().options as ModComponentState;

    await hookAct(async () => {
      await expect(
        result.current.buildAndValidateMod({
          sourceModDefinition: activatedModDefinition,
          draftModComponents: [
            ...state.activatedModComponents.slice(1),
            dirtyFormState1,
          ],
        }),
      ).rejects.toThrow("Mod save failed due to data integrity error");
    });
  });
});
