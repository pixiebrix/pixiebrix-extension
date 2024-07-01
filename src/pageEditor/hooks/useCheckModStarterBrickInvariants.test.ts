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

import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import {
  modComponentDefinitionFactory,
  modDefinitionFactory,
  starterBrickDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import {
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { getActivatedModComponentFromDefinition } from "@/activation/getActivatedModComponentFromDefinition";
import { modComponentToFormState } from "@/pageEditor/starterBricks/adapter";
import { take } from "lodash";
import { renderHook } from "@/pageEditor/testHelpers";
import useCheckModStarterBrickInvariants from "@/pageEditor/hooks/useCheckModStarterBrickInvariants";
import { actions as modComponentsActions } from "@/store/extensionsSlice";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  DefinitionKinds,
} from "@/types/registryTypes";

let starterBrickCount = 0;
function newStarterBrickId(): InnerDefinitionRef {
  // eslint-disable-next-line no-constant-binary-expression -- false positive
  return `starterBrick${starterBrickCount++ ?? ""}` as InnerDefinitionRef;
}

describe("useCheckModStarterBrickInvariants", () => {
  test.each`
    cleanCount | dirtyCount | newCount | modCleanCount | modDirtyCount | modNewCount | expectedResult
    ${1}       | ${0}       | ${0}     | ${1}          | ${0}          | ${0}        | ${true}
    ${0}       | ${1}       | ${0}     | ${0}          | ${1}          | ${0}        | ${true}
    ${0}       | ${0}       | ${1}     | ${0}          | ${0}          | ${1}        | ${true}
    ${1}       | ${0}       | ${1}     | ${1}          | ${0}          | ${1}        | ${true}
    ${0}       | ${1}       | ${1}     | ${0}          | ${1}          | ${1}        | ${true}
    ${1}       | ${1}       | ${1}     | ${1}          | ${1}          | ${1}        | ${true}
    ${3}       | ${2}       | ${0}     | ${3}          | ${2}          | ${0}        | ${true}
    ${1}       | ${0}       | ${5}     | ${1}          | ${0}          | ${5}        | ${true}
    ${0}       | ${5}       | ${1}     | ${0}          | ${5}          | ${1}        | ${true}
    ${1}       | ${0}       | ${0}     | ${0}          | ${0}          | ${0}        | ${false}
    ${0}       | ${1}       | ${0}     | ${0}          | ${0}          | ${0}        | ${false}
    ${0}       | ${0}       | ${1}     | ${0}          | ${0}          | ${0}        | ${false}
    ${3}       | ${4}       | ${5}     | ${0}          | ${0}          | ${0}        | ${false}
    ${3}       | ${0}       | ${0}     | ${2}          | ${0}          | ${0}        | ${false}
    ${3}       | ${0}       | ${2}     | ${2}          | ${0}          | ${2}        | ${false}
    ${3}       | ${1}       | ${0}     | ${2}          | ${1}          | ${0}        | ${false}
    ${4}       | ${2}       | ${5}     | ${2}          | ${2}          | ${5}        | ${false}
    ${0}       | ${3}       | ${0}     | ${0}          | ${2}          | ${0}        | ${false}
    ${0}       | ${3}       | ${2}     | ${0}          | ${2}          | ${2}        | ${false}
    ${1}       | ${3}       | ${0}     | ${1}          | ${2}          | ${0}        | ${false}
    ${2}       | ${4}       | ${5}     | ${2}          | ${2}          | ${5}        | ${false}
    ${0}       | ${0}       | ${3}     | ${0}          | ${0}          | ${2}        | ${false}
    ${1}       | ${0}       | ${3}     | ${1}          | ${0}          | ${2}        | ${false}
    ${0}       | ${1}       | ${3}     | ${0}          | ${1}          | ${2}        | ${false}
    ${2}       | ${2}       | ${5}     | ${2}          | ${2}          | ${3}        | ${false}
  `(
    "given $cleanCount clean component(s) $dirtyCount dirty components(s) $newCount new components(s) and mod definition contains $modCleanCount clean $modDirtyCount dirty $modNewCount new, when called, should return $expectedResult",
    async ({
      cleanCount,
      dirtyCount,
      newCount,
      modCleanCount,
      modDirtyCount,
      modNewCount,
      expectedResult,
    }: {
      cleanCount: number;
      dirtyCount: number;
      newCount: number;
      modCleanCount: number;
      modDirtyCount: number;
      modNewCount: number;
      expectedResult: boolean;
    }) => {
      const modMetadata = modMetadataFactory();
      let installedModDefinition: ModDefinition | null = null;
      const installedFormStates: ModComponentFormState[] = [];
      const newFormStates: ModComponentFormState[] = [];

      const cleanModComponentDefinitions: ModComponentDefinition[] = [];
      const dirtyModComponentDefinitions: ModComponentDefinition[] = [];
      const newModComponentDefinitions: ModComponentDefinition[] = [];

      const cleanModInnerDefinitions: InnerDefinitions = {};
      const dirtyModInnerDefinitions: InnerDefinitions = {};
      const newModInnerDefinitions: InnerDefinitions = {};

      if (cleanCount + dirtyCount) {
        for (let i = 0; i < cleanCount; i++) {
          const starterBrickId = newStarterBrickId();
          const modComponentDefinition = modComponentDefinitionFactory({
            id: starterBrickId,
          });
          cleanModComponentDefinitions.push(modComponentDefinition);
          cleanModInnerDefinitions[starterBrickId] = {
            kind: DefinitionKinds.STARTER_BRICK,
            definition: starterBrickDefinitionFactory().definition,
          };
        }

        for (let i = 0; i < dirtyCount; i++) {
          const starterBrickId = newStarterBrickId();
          const modComponentDefinition = modComponentDefinitionFactory({
            id: starterBrickId,
          });
          dirtyModComponentDefinitions.push(modComponentDefinition);
          dirtyModInnerDefinitions[starterBrickId] = {
            kind: DefinitionKinds.STARTER_BRICK,
            definition: starterBrickDefinitionFactory().definition,
          };
        }

        installedModDefinition = modDefinitionFactory({
          metadata: modMetadata,
          definitions: {
            ...cleanModInnerDefinitions,
            ...dirtyModInnerDefinitions,
          },
          extensionPoints: [
            ...cleanModComponentDefinitions,
            ...dirtyModComponentDefinitions,
          ],
        });
      }

      for (const modComponentDefinition of dirtyModComponentDefinitions) {
        const activatedModComponent = getActivatedModComponentFromDefinition({
          modComponentDefinition,
          modDefinition: installedModDefinition,
          optionsArgs: {},
          integrationDependencies: [],
        });
        // eslint-disable-next-line no-await-in-loop -- we control the loop count to be low here
        const formState = await modComponentToFormState(activatedModComponent);
        installedFormStates.push(formState);
      }

      for (let i = 0; i < newCount; i++) {
        const starterBrickId = newStarterBrickId();
        const modComponentDefinition = modComponentDefinitionFactory({
          id: starterBrickId,
        });
        newModComponentDefinitions.push(modComponentDefinition);
        newModInnerDefinitions[starterBrickId] = {
          kind: DefinitionKinds.STARTER_BRICK,
          definition: starterBrickDefinitionFactory().definition,
        };
      }

      if (newCount) {
        const modDefinitionForNewComponents = modDefinitionFactory({
          metadata: modMetadata,
          definitions: newModInnerDefinitions,
          extensionPoints: newModComponentDefinitions,
        });
        for (const modComponentDefinition of newModComponentDefinitions) {
          const activatedModComponent = getActivatedModComponentFromDefinition({
            modComponentDefinition,
            modDefinition: modDefinitionForNewComponents,
            optionsArgs: {},
            integrationDependencies: [],
          });
          // eslint-disable-next-line no-await-in-loop -- we control the loop count to be low here
          const formState = await modComponentToFormState(
            activatedModComponent,
          );
          newFormStates.push(formState);
        }
      }

      const starterBricks: ModComponentDefinition[] = [
        ...take(cleanModComponentDefinitions, modCleanCount),
        ...take(dirtyModComponentDefinitions, modDirtyCount),
        ...take(newModComponentDefinitions, modNewCount),
      ];
      const definitions: InnerDefinitions = Object.fromEntries([
        ...Object.entries(cleanModInnerDefinitions).slice(0, modCleanCount),
        ...Object.entries(dirtyModInnerDefinitions).slice(0, modDirtyCount),
        ...Object.entries(newModInnerDefinitions).slice(0, modNewCount),
      ]);
      const resultModDefinition: ModDefinition = modDefinitionFactory({
        metadata: modMetadata,
        extensionPoints: starterBricks,
        definitions,
      });

      const { result } = renderHook(() => useCheckModStarterBrickInvariants(), {
        setupRedux(dispatch) {
          if (installedModDefinition) {
            dispatch(
              modComponentsActions.activateMod({
                modDefinition: installedModDefinition,
                screen: "pageEditor",
                isReactivate: false,
              }),
            );
          }

          for (const formState of installedFormStates) {
            dispatch(editorActions.selectInstalled(formState));
            dispatch(editorActions.syncModComponentFormState(formState));
          }

          for (const formState of newFormStates) {
            dispatch(editorActions.addModComponentFormState(formState));
          }
        },
      });

      const checkModStarterBrickInvariants = result.current;
      const actualResult = await checkModStarterBrickInvariants(
        resultModDefinition,
        { sourceModDefinition: installedModDefinition },
      );
      expect(actualResult).toBe(expectedResult);
    },
  );

  it("should return true for one new mod component and matching component in mod definition", async () => {
    const modMetadata = modMetadataFactory();

    const modInnerDefinitions: InnerDefinitions = {};

    const starterBrickId = newStarterBrickId();
    const modComponentDefinition = modComponentDefinitionFactory({
      id: starterBrickId,
    });
    modInnerDefinitions[starterBrickId] = {
      kind: DefinitionKinds.STARTER_BRICK,
      definition: starterBrickDefinitionFactory().definition,
    };

    const resultModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      definitions: modInnerDefinitions,
      extensionPoints: [modComponentDefinition],
    });

    const activatedModComponent = getActivatedModComponentFromDefinition({
      modComponentDefinition,
      modDefinition: resultModDefinition,
      optionsArgs: {},
      integrationDependencies: [],
    });
    const formState = await modComponentToFormState(activatedModComponent);

    const { result } = renderHook(() => useCheckModStarterBrickInvariants(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    const checkModStarterBrickInvariants = result.current;
    const actualResult = await checkModStarterBrickInvariants(
      resultModDefinition,
      { newModComponentFormState: formState },
    );
    expect(actualResult).toBe(true);
  });

  it("should return false for one new mod component and no matching component in mod definition", async () => {
    const modMetadata = modMetadataFactory();
    const modInnerDefinitions: InnerDefinitions = {};
    const starterBrickId = newStarterBrickId();
    const modComponentDefinition = modComponentDefinitionFactory({
      id: starterBrickId,
    });
    modInnerDefinitions[starterBrickId] = {
      kind: DefinitionKinds.STARTER_BRICK,
      definition: starterBrickDefinitionFactory().definition,
    };
    const modForComponent = modDefinitionFactory({
      metadata: modMetadata,
      definitions: modInnerDefinitions,
      extensionPoints: [modComponentDefinition],
    });
    const activatedModComponent = getActivatedModComponentFromDefinition({
      modComponentDefinition,
      modDefinition: modForComponent,
      optionsArgs: {},
      integrationDependencies: [],
    });
    const formState = await modComponentToFormState(activatedModComponent);
    delete formState.mod;

    const { result } = renderHook(() => useCheckModStarterBrickInvariants(), {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });
    const checkModStarterBrickInvariants = result.current;

    const resultModDefinition = modDefinitionFactory({
      metadata: modMetadata,
      definitions: {},
      extensionPoints: [],
    });

    const actualResult = await checkModStarterBrickInvariants(
      resultModDefinition,
      { newModComponentFormState: formState },
    );
    expect(actualResult).toBe(false);
  });
});
