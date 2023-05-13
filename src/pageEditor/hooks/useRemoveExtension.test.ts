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

import { renderHook } from "@/pageEditor/testHelpers";
import { removeExtensionsFromAllTabs } from "@/store/uninstallUtils";
import useRemoveExtension from "./useRemoveExtension";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { actions as extensionsActions } from "@/store/extensionsSlice";
import { clearDynamicElements } from "@/contentScript/messenger/api";

import { uuidSequence } from "@/testUtils/factories/stringFactories";

beforeEach(() => {
  jest.resetAllMocks();
});

test("useRemoveExtension", async () => {
  const extensionId = uuidSequence(1);

  const {
    result: { current: removeExtension },
    getReduxStore,
  } = renderHook(() => useRemoveExtension(), {
    setupRedux(dispatch, { store }) {
      jest.spyOn(store, "dispatch");
    },
  });

  await removeExtension({
    extensionId,
    shouldShowConfirmation: false,
  });

  const { dispatch } = getReduxStore();

  expect(dispatch).toHaveBeenCalledWith(
    editorActions.removeElement(extensionId)
  );
  expect(dispatch).toHaveBeenCalledWith(
    extensionsActions.removeExtension({ extensionId })
  );
  expect(clearDynamicElements).toHaveBeenCalledWith(expect.any(Object), {
    uuid: extensionId,
  });
  expect(removeExtensionsFromAllTabs).toHaveBeenCalledWith([extensionId]);
});
