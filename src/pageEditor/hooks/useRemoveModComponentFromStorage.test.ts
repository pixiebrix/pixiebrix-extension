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

import { renderHook } from "@/pageEditor/testHelpers";
import { removeModComponentsFromAllTabs } from "@/store/uninstallUtils";
import { useRemoveModComponentFromStorage } from "./useRemoveModComponentFromStorage";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { actions as extensionsActions } from "@/store/extensionsSlice";
import { removeDraftModComponents } from "@/contentScript/messenger/api";

import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";

beforeEach(() => {
  jest.resetAllMocks();
});

test("useRemoveModComponentFromStorage", async () => {
  const modComponentId = autoUUIDSequence();

  const {
    result: { current: removeExtension },
    getReduxStore,
  } = renderHook(() => useRemoveModComponentFromStorage(), {
    setupRedux(dispatch, { store }) {
      jest.spyOn(store, "dispatch");
    },
  });

  await removeExtension({
    modComponentId,
  });

  const { dispatch } = getReduxStore();

  expect(dispatch).toHaveBeenCalledWith(
    editorActions.removeModComponentFormState(modComponentId),
  );
  expect(dispatch).toHaveBeenCalledWith(
    extensionsActions.removeModComponent({ modComponentId }),
  );
  expect(removeDraftModComponents).toHaveBeenCalledWith(
    expect.any(Object),
    modComponentId,
  );
  expect(removeModComponentsFromAllTabs).toHaveBeenCalledWith([modComponentId]);
});
