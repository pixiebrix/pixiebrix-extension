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

import CodeEditorWidget from "@/components/fields/schemaFields/widgets/CodeEditorWidget";
import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@/pageEditor/testHelpers";
import { userEvent } from "@testing-library/user-event";
import { type JSONSchema7 } from "json-schema";
import React from "react";

describe("CodeEditorWidget", () => {
  const schema: JSONSchema7 = {
    title: "Function",
    type: "string",
    description: "The Javascript function",
  };

  const onSubmitMock = jest.fn();

  beforeEach(() => {
    onSubmitMock.mockReset();
  });

  test("renders the AceEditor", async () => {
    const { asFragment } = render(
      <CodeEditorWidget name={"function"} schema={schema} />,
      {
        initialValues: {
          function: "",
        },
      },
    );

    await waitForElementToBeRemoved(() => screen.queryByText("Loading..."));

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- we want to verify the ace editor is rendered but do not have good selectors
    expect(screen.getByRole("textbox").parentElement).toHaveClass("ace-chrome");

    expect(asFragment()).toMatchSnapshot();
  });

  test("renders the AceEditor with default value", async () => {
    render(<CodeEditorWidget name={"function"} schema={schema} />, {
      initialValues: {
        function: "function() {}",
      },
      onSubmit: onSubmitMock,
    });

    await expect(screen.findByRole("textbox")).resolves.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    // We can't assert on the value of the AceEditor because it is not rendered in the DOM
    // So we're checking the value stored in formik
    expect(onSubmitMock).toHaveBeenCalledWith(
      { function: "function() {}" },
      expect.anything(),
    );
  });

  test("user can update the function", async () => {
    window.focus = jest.fn(); // Silencing error from clicking a non-interactive div

    const { container } = render(
      <CodeEditorWidget name={"function"} schema={schema} />,
      {
        initialValues: {
          function: "function() {}",
        },
        onSubmit: onSubmitMock,
      },
    );

    await expect(screen.findByRole("textbox")).resolves.toBeInTheDocument();
    /* eslint-disable-next-line testing-library/no-container, testing-library/no-node-access --
     * The element that holds the value is not the input itself, but a div
     * TODO: use better selector method */
    const editorInputField = container.querySelector('[class="ace_content"]')!;
    expect(editorInputField).toHaveClass("ace_content");

    // Workaround to test modifying the AceEditor value
    // See: https://stackoverflow.com/a/73642625
    await userEvent.click(editorInputField);
    await userEvent.paste("abc");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    // We can't assert on the value of the AceEditor because it is not rendered in the DOM
    // So we're checking the value stored in formik
    expect(onSubmitMock).toHaveBeenCalledWith(
      { function: "abcfunction() {}" },
      expect.anything(),
    );
  });
});
