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
import useDeleteDraftModComponent from "./useDeleteDraftModComponent";
import {
  actions,
  actions as editorActions,
} from "@/pageEditor/store/editor/editorSlice";
import { removeDraftModComponents } from "@/contentScript/messenger/api";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";

beforeEach(() => {
  jest.resetAllMocks();
});

describe("useDeleteModComponent", () => {
  it("deletes one component from mod", async () => {
    const modMetadata = modMetadataFactory();

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });

    const { uuid: modComponentId } = formState;

    const {
      result: { current: deleteDraftModComponent },
      getReduxStore,
    } = renderHook(() => useDeleteDraftModComponent(), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
        // Add another so they can be deleted
        dispatch(
          actions.addModComponentFormState(
            formStateFactory({
              formStateConfig: {
                modMetadata,
              },
            }),
          ),
        );

        dispatch(actions.addModComponentFormState(formState));
      },
    });

    await deleteDraftModComponent({
      modComponentId,
    });

    const { dispatch } = getReduxStore();

    expect(dispatch).toHaveBeenCalledWith(
      editorActions.markModComponentFormStateAsDeleted(modComponentId),
    );

    expect(removeDraftModComponents).toHaveBeenCalledWith(
      expect.any(Object),
      modComponentId,
    );
  });

  it("does not delete last mod component in mod", async () => {
    const formState = formStateFactory();
    const { uuid: modComponentId } = formState;

    const {
      result: { current: deleteDraftModComponent },
      getReduxStore,
    } = renderHook(() => useDeleteDraftModComponent(), {
      setupRedux(dispatch, { store }) {
        jest.spyOn(store, "dispatch");
        dispatch(actions.addModComponentFormState(formState));
      },
    });

    await deleteDraftModComponent({
      modComponentId,
    });

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalledWith(
      editorActions.markModComponentFormStateAsDeleted(modComponentId),
    );

    expect(removeDraftModComponents).not.toHaveBeenCalled();
  });
});
