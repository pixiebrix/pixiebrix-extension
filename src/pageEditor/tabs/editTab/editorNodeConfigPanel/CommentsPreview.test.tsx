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

import { render, screen } from "@/pageEditor/testHelpers";
import CommentsPreview from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/CommentsPreview";
import React from "react";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions } from "@/pageEditor/slices/editorSlice";

const renderCommentsPreview = (comments: string) => {
  const formState = formStateFactory();
  render(<CommentsPreview comments={comments} />, {
    setupRedux(dispatch) {
      dispatch(actions.addElement(formState));
      dispatch(actions.selectElement(formState.uuid));
      dispatch(
        actions.setElementActiveNodeId(
          formState.extension.blockPipeline[0].instanceId,
        ),
      );
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
});
