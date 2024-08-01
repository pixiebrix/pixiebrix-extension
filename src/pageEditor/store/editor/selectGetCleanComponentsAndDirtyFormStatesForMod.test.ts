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

import { type EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { initialState as editorInitialState } from "@/pageEditor/store/editor/editorSlice";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { modComponentToFormState } from "@/pageEditor/starterBricks/adapter";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import {
  type InnerDefinitionRef,
  DefinitionKinds,
} from "@/types/registryTypes";
import { starterBrickDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";

let starterBrickCount = 0;
function newStarterBrickId(): InnerDefinitionRef {
  // eslint-disable-next-line no-constant-binary-expression -- false positive
  return `starterBrick${starterBrickCount++ ?? ""}` as InnerDefinitionRef;
}

describe("selectGetCleanComponentsAndDirtyFormStatesForMod", () => {
  test.each`
    cleanCount | cleanFormCount | dirtyCount | newCount | deletedCount | extraClean | extraDirty | extraNew | testId
    // 1 mod with 1 component
    ${1}       | ${0}           | ${0}       | ${0}     | ${0}         | ${0}       | ${0}       | ${0}     | ${1}
    ${0}       | ${1}           | ${0}       | ${0}     | ${0}         | ${0}       | ${0}       | ${0}     | ${2}
    ${0}       | ${0}           | ${1}       | ${0}     | ${0}         | ${0}       | ${0}       | ${0}     | ${3}
    ${1}       | ${0}           | ${0}       | ${0}     | ${1}         | ${0}       | ${0}       | ${0}     | ${4}
    ${0}       | ${1}           | ${0}       | ${0}     | ${2}         | ${0}       | ${0}       | ${0}     | ${5}
    ${0}       | ${0}           | ${1}       | ${0}     | ${3}         | ${0}       | ${0}       | ${0}     | ${6}
    ${1}       | ${1}           | ${0}       | ${0}     | ${0}         | ${0}       | ${0}       | ${0}     | ${7}
    ${1}       | ${0}           | ${1}       | ${0}     | ${0}         | ${0}       | ${0}       | ${0}     | ${8}
    ${1}       | ${0}           | ${0}       | ${1}     | ${0}         | ${0}       | ${0}       | ${0}     | ${9}
    ${1}       | ${0}           | ${0}       | ${1}     | ${1}         | ${0}       | ${0}       | ${0}     | ${10}
    ${1}       | ${0}           | ${1}       | ${0}     | ${2}         | ${0}       | ${0}       | ${0}     | ${11}
    ${1}       | ${1}           | ${0}       | ${0}     | ${3}         | ${0}       | ${0}       | ${0}     | ${12}
    ${0}       | ${1}           | ${0}       | ${1}     | ${1}         | ${0}       | ${0}       | ${0}     | ${13}
    ${0}       | ${0}           | ${1}       | ${1}     | ${2}         | ${0}       | ${0}       | ${0}     | ${14}
    ${0}       | ${0}           | ${0}       | ${1}     | ${3}         | ${0}       | ${0}       | ${0}     | ${15}
    ${4}       | ${1}           | ${0}       | ${1}     | ${0}         | ${4}       | ${0}       | ${0}     | ${16}
    ${3}       | ${0}           | ${1}       | ${2}     | ${1}         | ${3}       | ${0}       | ${1}     | ${17}
    ${2}       | ${1}           | ${0}       | ${3}     | ${2}         | ${2}       | ${0}       | ${0}     | ${18}
    ${1}       | ${0}           | ${1}       | ${4}     | ${3}         | ${1}       | ${0}       | ${1}     | ${19}
    ${4}       | ${1}           | ${0}       | ${1}     | ${0}         | ${4}       | ${4}       | ${0}     | ${20}
    ${3}       | ${0}           | ${1}       | ${2}     | ${1}         | ${3}       | ${5}       | ${1}     | ${21}
    ${2}       | ${1}           | ${0}       | ${3}     | ${2}         | ${2}       | ${6}       | ${0}     | ${22}
    ${1}       | ${0}           | ${1}       | ${4}     | ${3}         | ${1}       | ${7}       | ${1}     | ${23}
    ${4}       | ${1}           | ${2}       | ${1}     | ${0}         | ${4}       | ${0}       | ${0}     | ${24}
    ${3}       | ${2}           | ${1}       | ${2}     | ${1}         | ${3}       | ${0}       | ${1}     | ${25}
    ${2}       | ${1}           | ${2}       | ${3}     | ${2}         | ${2}       | ${0}       | ${0}     | ${26}
    ${1}       | ${2}           | ${1}       | ${4}     | ${3}         | ${1}       | ${0}       | ${1}     | ${27}
    ${7}       | ${2}           | ${3}       | ${1}     | ${2}         | ${13}      | ${0}       | ${0}     | ${28}
    ${7}       | ${3}           | ${0}       | ${4}     | ${2}         | ${13}      | ${2}       | ${2}     | ${29}
    ${9}       | ${2}           | ${3}       | ${1}     | ${2}         | ${3}       | ${6}       | ${7}     | ${30}
    ${7}       | ${0}           | ${13}      | ${0}     | ${0}         | ${3}       | ${16}      | ${3}     | ${31}
    ${11}      | ${2}           | ${1}       | ${3}     | ${9}         | ${4}       | ${1}       | ${2}     | ${32}
  `(
    "[case $testId]: called with mod components state of counts [cleanMods, cleanForms, dirty, new, deleted, extraClean, extraDirty, extraNew] = [$cleanCount, $cleanFormCount, $dirtyCount, $newCount, $deletedCount, $extraClean, $extraDirty, $extraNew]",
    async ({
      cleanCount,
      cleanFormCount,
      dirtyCount,
      newCount,
      deletedCount,
      extraClean,
      extraDirty,
      extraNew,
    }: {
      cleanCount: number;
      cleanFormCount: number;
      dirtyCount: number;
      newCount: number;
      deletedCount: number;
      extraClean: number;
      extraDirty: number;
      extraNew: number;
    }) => {
      const primaryModMetadata = modMetadataFactory();

      const cleanModComponents: ActivatedModComponent[] = [];
      for (let i = 0; i < cleanCount; i++) {
        const starterBrickId = newStarterBrickId();
        const activatedModComponent = activatedModComponentFactory({
          _recipe: primaryModMetadata,
          extensionPointId: starterBrickId,
          definitions: {
            [starterBrickId]: {
              kind: DefinitionKinds.STARTER_BRICK,
              definition: starterBrickDefinitionFactory().definition,
            },
          },
        });
        cleanModComponents.push(activatedModComponent);
      }

      // Have been edited, but also reset/saved previously so not marked "dirty"
      const cleanFormModComponents: ActivatedModComponent[] = [];
      const cleanFormStates: ModComponentFormState[] = [];
      for (let i = 0; i < cleanFormCount; i++) {
        const starterBrickId = newStarterBrickId();
        const activatedModComponent = activatedModComponentFactory({
          _recipe: primaryModMetadata,
          extensionPointId: starterBrickId,
          definitions: {
            [starterBrickId]: {
              kind: DefinitionKinds.STARTER_BRICK,
              definition: starterBrickDefinitionFactory().definition,
            },
          },
        });
        cleanFormModComponents.push(activatedModComponent);
        // eslint-disable-next-line no-await-in-loop -- we control the loop count to be low here
        const formState = await modComponentToFormState(activatedModComponent);
        cleanFormStates.push(formState);
      }

      const dirtyModComponents: ActivatedModComponent[] = [];
      const dirtyFormStates: ModComponentFormState[] = [];
      for (let i = 0; i < dirtyCount; i++) {
        const starterBrickId = newStarterBrickId();
        const activatedModComponent = activatedModComponentFactory({
          _recipe: primaryModMetadata,
          extensionPointId: starterBrickId,
          definitions: {
            [starterBrickId]: {
              kind: DefinitionKinds.STARTER_BRICK,
              definition: starterBrickDefinitionFactory().definition,
            },
          },
        });
        dirtyModComponents.push(activatedModComponent);
        // eslint-disable-next-line no-await-in-loop -- we control the loop count to be low here
        const formState = await modComponentToFormState(activatedModComponent);
        dirtyFormStates.push(formState);
      }

      const deletedDirtyModComponents: ActivatedModComponent[] = [];
      const deletedDirtyFormStates: ModComponentFormState[] = [];
      for (let i = 0; i < deletedCount; i++) {
        const starterBrickId = newStarterBrickId();
        const activatedModComponent = activatedModComponentFactory({
          _recipe: primaryModMetadata,
          extensionPointId: starterBrickId,
          definitions: {
            [starterBrickId]: {
              kind: DefinitionKinds.STARTER_BRICK,
              definition: starterBrickDefinitionFactory().definition,
            },
          },
        });
        deletedDirtyModComponents.push(activatedModComponent);
        // eslint-disable-next-line no-await-in-loop -- we control the loop count to be low here
        const formState = await modComponentToFormState(activatedModComponent);
        deletedDirtyFormStates.push(formState);
      }

      const newFormStates: ModComponentFormState[] = [];
      for (let i = 0; i < newCount; i++) {
        const formState = formStateFactory({
          formStateConfig: {
            modMetadata: primaryModMetadata,
          },
        });
        newFormStates.push(formState);
      }

      const otherModMetadata = modMetadataFactory();

      const extraCleanModComponents: ActivatedModComponent[] = [];
      for (let i = 0; i < extraClean; i++) {
        const activatedModComponent = activatedModComponentFactory({
          _recipe: otherModMetadata,
        });
        extraCleanModComponents.push(activatedModComponent);
      }

      const extraDirtyModComponents: ActivatedModComponent[] = [];
      const extraDirtyFormStates: ModComponentFormState[] = [];
      for (let i = 0; i < extraDirty; i++) {
        const starterBrickId = newStarterBrickId();
        const activatedModComponent = activatedModComponentFactory({
          _recipe: otherModMetadata,
          extensionPointId: starterBrickId,
          definitions: {
            [starterBrickId]: {
              kind: DefinitionKinds.STARTER_BRICK,
              definition: starterBrickDefinitionFactory().definition,
            },
          },
        });
        extraDirtyModComponents.push(activatedModComponent);
        // eslint-disable-next-line no-await-in-loop -- we control the loop count to be low here
        const formState = await modComponentToFormState(activatedModComponent);
        extraDirtyFormStates.push(formState);
      }

      const extraNewFormStates: ModComponentFormState[] = [];
      for (let i = 0; i < extraNew; i++) {
        const formState = formStateFactory({
          formStateConfig: {
            modMetadata: otherModMetadata,
          },
        });
        extraNewFormStates.push(formState);
      }

      const state: EditorRootState & ModComponentsRootState = {
        editor: {
          ...editorInitialState,
          modComponentFormStates: [
            ...cleanFormStates,
            ...dirtyFormStates,
            ...newFormStates,
            ...deletedDirtyFormStates,
            ...extraDirtyFormStates,
            ...extraNewFormStates,
          ],
          dirty: Object.fromEntries(
            [
              ...dirtyFormStates,
              ...newFormStates,
              ...deletedDirtyFormStates,
              ...extraDirtyFormStates,
              ...extraNewFormStates,
            ].map((formState) => [formState.uuid, true]),
          ),
          deletedModComponentFormStatesByModId: {
            [primaryModMetadata.id]: deletedDirtyFormStates,
          },
        },
        options: {
          extensions: [
            ...cleanModComponents,
            ...cleanFormModComponents,
            ...dirtyModComponents,
            ...deletedDirtyModComponents,
            ...extraCleanModComponents,
            ...extraDirtyModComponents,
          ],
        },
      };

      const getCleanComponentsAndDirtyFormStatesForMod =
        selectGetCleanComponentsAndDirtyFormStatesForMod(state);
      expect(
        getCleanComponentsAndDirtyFormStatesForMod(primaryModMetadata.id),
      ).toEqual({
        cleanModComponents: [...cleanModComponents, ...cleanFormModComponents],
        dirtyModComponentFormStates: [...dirtyFormStates, ...newFormStates],
      });
    },
  );
});
