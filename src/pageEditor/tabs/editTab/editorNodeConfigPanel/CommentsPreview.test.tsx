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

import { render, screen } from "@/pageEditor/testHelpers";
import CommentsPreview from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/CommentsPreview";
import React from "react";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { selectNodeDataPanelTabSelected } from "@/pageEditor/store/editor/editorSelectors";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { type EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";

const renderCommentsPreview = (comments: string) => {
  const formState = formStateFactory();
  return render(<CommentsPreview comments={comments} />, {
    setupRedux(dispatch) {
      dispatch(actions.addModComponentFormState(formState));
      dispatch(actions.setActiveModComponentId(formState.uuid));
      dispatch(
        actions.setActiveNodeId(
          formState.modComponent.brickPipeline[0]!.instanceId!,
        ),
      );
      dispatch(actions.setNodeDataPanelTabSelected(DataPanelTabKey.Input));
    },
  });
};

describe("CommentsPreview", () => {
  it("renders comments with 'View Brick Comments' button", () => {
    const expectedComments = "This is a comment";
    renderCommentsPreview(expectedComments);
    expect(screen.getByRole("note")).toHaveTextContent(expectedComments);
    expect(screen.getByRole("button")).toHaveTextContent("View Brick Comments");
  });

  it("sets the DataPanel tab to 'Comments' when button is clicked", () => {
    const expectedComments = "This is a comment";
    const { getReduxStore } = renderCommentsPreview(expectedComments);
    const store = getReduxStore();

    const dataPanelTabBefore = selectNodeDataPanelTabSelected(
      store.getState() as EditorRootState,
    );
    expect(dataPanelTabBefore).not.toBe("comments");

    screen.getByRole("button").click();
    const dataPanelTab = selectNodeDataPanelTabSelected(
      store.getState() as EditorRootState,
    );
    expect(dataPanelTab).toBe(DataPanelTabKey.Comments);
  });

  it("opens the DataPanel tab when button is clicked", () => {
    function getDataPanelExtended(state: UnknownObject) {
      return (state as EditorRootState).editor.isDataPanelExpanded;
    }

    const expectedComments = "This is a comment";
    const { getReduxStore } = renderCommentsPreview(expectedComments);
    const store = getReduxStore();

    store.dispatch(actions.setDataPanelExpanded({ isExpanded: false }));

    expect(getDataPanelExtended(store.getState())).toBeFalse();

    screen.getByRole("button").click();
    expect(getDataPanelExtended(store.getState())).toBeTrue();
  });
});
