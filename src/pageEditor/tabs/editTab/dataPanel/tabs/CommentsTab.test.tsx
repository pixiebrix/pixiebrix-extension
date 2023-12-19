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

import React from "react";
import CommentsTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/CommentsTab";
import { render, screen } from "@/pageEditor/testHelpers";
// eslint-disable-next-line no-restricted-imports -- used for testing purposes
import { Formik } from "formik";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import userEvent from "@testing-library/user-event";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";

const reportEventMock = jest.mocked(reportEvent);

const commentsFieldName = "extension.blockPipeline.0.comments";
const initialComments = "Hello world!";
const formStateWithComments = menuItemFormStateFactory({}, [
  brickConfigFactory({
    comments: initialComments,
  }),
]);

const formStateWithNoComments = menuItemFormStateFactory();
const renderCommentsTab = (formState = formStateWithComments) =>
  render(
    <Formik onSubmit={jest.fn()} initialValues={formState}>
      <CommentsTab brickCommentsFieldName={commentsFieldName} />
    </Formik>,
  );

describe("CommentsTab", () => {
  it("renders comments", () => {
    renderCommentsTab();
    expect(screen.getByText(initialComments)).toBeInTheDocument();
  });

  it("renders editable empty text area", async () => {
    renderCommentsTab(formStateWithNoComments);
    const textArea = screen.getByTestId(
      `comments-text-area-${commentsFieldName}`,
    );
    expect(textArea).toBeInTheDocument();

    expect(textArea).toHaveValue("");

    const newComments = "I am a comment!";
    await userEvent.type(textArea, newComments);

    expect(textArea).toHaveValue(newComments);

    // Trigger onBlur event for the textarea
    await userEvent.click(screen.getByTestId("comments-tab-pane"));

    expect(reportEventMock).toHaveBeenCalledWith(Events.BRICK_COMMENTS_UPDATE, {
      commentsLength: newComments.length,
    });
  });
});
