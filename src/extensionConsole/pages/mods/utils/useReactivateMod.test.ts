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

import { renderHook } from "@/extensionConsole/testHelpers";
import useReactivateMod from "./useReactivateMod";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { deactivateMod } from "@/store/deactivateUtils";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { standaloneModDefinitionFactory } from "@/testUtils/factories/modComponentFactories";

beforeEach(() => {
  jest.resetAllMocks();
});

test("deactivates mod components", async () => {
  const modDefinition = defaultModDefinitionFactory();
  const standaloneModDefinition = standaloneModDefinitionFactory({
    _recipe: {
      id: modDefinition.metadata.id,
    } as any,
  });

  const anotherStandaloneModDefinition = standaloneModDefinitionFactory();

  const {
    result: { current: reinstall },
    act,
    getReduxStore,
  } = renderHook(() => useReactivateMod(), {
    setupRedux(dispatch) {
      dispatch(
        extensionActions.activateStandaloneModDefinition(
          standaloneModDefinition,
        ),
      );
      dispatch(
        extensionActions.activateStandaloneModDefinition(
          anotherStandaloneModDefinition,
        ),
      );
    },
  });

  const expectedExtension = (
    getReduxStore().getState() as ModComponentsRootState
  ).options.extensions[0];

  await act(async () => reinstall(modDefinition));

  expect(deactivateMod).toHaveBeenCalledWith(
    modDefinition.metadata.id,
    [expectedExtension],
    expect.any(Function),
  );
});

test("dispatches activate mod action", async () => {
  jest.spyOn(extensionActions, "activateMod");

  const modDefinition = defaultModDefinitionFactory();
  const standaloneModDefinition = standaloneModDefinitionFactory({
    _recipe: {
      id: modDefinition.metadata.id,
    } as any,
  });

  const {
    result: { current: reinstall },
    act,
  } = renderHook(() => useReactivateMod(), {
    setupRedux(dispatch) {
      dispatch(
        extensionActions.activateStandaloneModDefinition(
          standaloneModDefinition,
        ),
      );
    },
  });

  await act(async () => reinstall(modDefinition));

  expect(extensionActions.activateMod).toHaveBeenCalled();
});
