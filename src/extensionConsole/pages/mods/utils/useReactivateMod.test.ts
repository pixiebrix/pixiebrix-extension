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
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import { deactivateMod } from "@/store/deactivateModHelpers";
import { type ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { act } from "@testing-library/react-hooks";

beforeEach(() => {
  jest.clearAllMocks();
});

test("deactivates mod components", async () => {
  const modDefinition = defaultModDefinitionFactory();

  const {
    result: { current: reactivateMod },
    getReduxStore,
  } = renderHook(() => useReactivateMod(), {
    setupRedux(dispatch) {
      dispatch(
        modComponentActions.activateMod({
          modDefinition,
          screen: "extensionConsole",
          isReactivate: true,
        }),
      );
    },
  });

  const expectedModComponent = selectActivatedModComponents(
    getReduxStore().getState() as ModComponentsRootState,
  )[0];

  await act(async () => reactivateMod(modDefinition));

  expect(deactivateMod).toHaveBeenCalledWith(modDefinition.metadata.id, [
    expectedModComponent!.id,
  ]);
});

test("dispatches activate mod action", async () => {
  jest.spyOn(modComponentActions, "activateMod");

  const modDefinition = defaultModDefinitionFactory();

  const {
    result: { current: reactivateMod },
  } = renderHook(() => useReactivateMod(), {
    setupRedux(dispatch) {
      dispatch(
        modComponentActions.activateMod({
          modDefinition,
          screen: "extensionConsole",
          isReactivate: true,
        }),
      );
    },
  });

  await act(async () => reactivateMod(modDefinition));

  expect(modComponentActions.activateMod).toHaveBeenCalled();
});
