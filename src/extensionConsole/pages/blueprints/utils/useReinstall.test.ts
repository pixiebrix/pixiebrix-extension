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

import { renderHook } from "@/extensionConsole/testHelpers";
import {
  cloudExtensionFactory,
  recipeDefinitionFactory,
} from "@/testUtils/factories";
import useReinstall from "./useReinstall";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { uninstallRecipe } from "@/store/uninstallUtils";
import {
  type ExtensionOptionsState,
  type ExtensionsRootState,
} from "@/store/extensionsTypes";

beforeEach(() => {
  jest.resetAllMocks();
});

test("uninstalls recipe extensions", async () => {
  const recipe = recipeDefinitionFactory();
  const recipeExtension = cloudExtensionFactory({
    _recipe: {
      id: recipe.metadata.id,
    } as any,
  });

  const anotherExtension = cloudExtensionFactory();

  const {
    result: { current: reinstall },
    act,
    getReduxStore,
  } = renderHook(() => useReinstall(), {
    setupRedux(dispatch) {
      dispatch(
        extensionActions.installCloudExtension({ extension: recipeExtension })
      );
      dispatch(
        extensionActions.installCloudExtension({ extension: anotherExtension })
      );
    },
  });

  const expectedExtension = (
    (getReduxStore().getState() as ExtensionsRootState)
      .options as ExtensionOptionsState
  ).extensions[0];

  await act(async () => reinstall(recipe));

  expect(uninstallRecipe).toHaveBeenCalledWith(
    recipe.metadata.id,
    [expectedExtension],
    expect.any(Function)
  );
});

test("dispatches install recipe action", async () => {
  jest.spyOn(extensionActions, "installRecipe");

  const recipe = recipeDefinitionFactory();
  const recipeExtension = cloudExtensionFactory({
    _recipe: {
      id: recipe.metadata.id,
    } as any,
  });

  const {
    result: { current: reinstall },
    act,
  } = renderHook(() => useReinstall(), {
    setupRedux(dispatch) {
      dispatch(
        extensionActions.installCloudExtension({ extension: recipeExtension })
      );
    },
  });

  await act(async () => reinstall(recipe));

  expect(extensionActions.installRecipe).toHaveBeenCalled();
});
