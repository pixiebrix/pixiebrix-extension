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
import useSaveMod from "@/pageEditor/hooks/useSaveMod";
import { appApiMock } from "@/testUtils/appApiMock";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { createNewUnsavedModMetadata } from "@/utils/modUtils";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { act } from "@testing-library/react";

jest.mock("@/utils/notify");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useSaveMod", () => {
  it("opens the create mod modal if save is called with a temporary, internal mod", async () => {
    appApiMock.reset();

    const temporaryModMetadata = createNewUnsavedModMetadata({
      modName: "Test Mod",
    });

    const { result, getReduxStore } = renderHook(() => useSaveMod(), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");

        dispatch(
          editorActions.addModComponentFormState(
            formStateFactory({
              formStateConfig: {
                modMetadata: temporaryModMetadata,
              },
            }),
          ),
        );
      },
    });

    await act(async () => {
      await result.current(temporaryModMetadata.id);
    });

    const { dispatch } = getReduxStore();
    expect(dispatch).toHaveBeenCalledWith(
      editorActions.showCreateModModal({
        keepLocalCopy: false,
        sourceModId: temporaryModMetadata.id,
      }),
    );
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });
});
