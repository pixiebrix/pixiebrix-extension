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

import React from "react";
import TextAreaWidget from "@/components/formBuilder/TextAreaWidget";
import { render, screen } from "@/sidebar/testHelpers";
import RjsfSubmitContext from "@/components/formBuilder/RjsfSubmitContext";
import userEvent from "@testing-library/user-event";

describe("TextAreaWidget", () => {
  const defaultProps = {
    id: "rjsf-textarea",
    name: "rjsf-textarea",
    label: "RJSF Textarea",
    placeholder: "",
    value: "",
    options: {},
    schema: {},
    uiSchema: {},
    required: false,
    disabled: false,
    readonly: false,
    autofocus: false,
    multiple: false,
    onChange: jest.fn(),
    onBlur: jest.fn(),
    onFocus: jest.fn(),
    WidgetProps: {},
    formContext: {},
    registry: {} as any,
  };

  test("renders the textarea--label provided by FieldTemplate", () => {
    render(<TextAreaWidget {...defaultProps} />, {
      wrapper: ({ children }) => (
        <RjsfSubmitContext.Provider
          value={{
            async submitForm() {
              jest.fn();
            },
          }}
        >
          {children}
        </RjsfSubmitContext.Provider>
      ),
    });

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.label)).not.toBeInTheDocument();
  });

  test("it submits the form when enter key is pressed", async () => {
    const submitForm = jest.fn();
    render(
      <TextAreaWidget {...defaultProps} options={{ submitOnEnter: true }} />,
      {
        wrapper: ({ children }) => (
          <RjsfSubmitContext.Provider value={{ submitForm }}>
            {children}
          </RjsfSubmitContext.Provider>
        ),
      },
    );

    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "Some text");
    await userEvent.keyboard("{Enter}");
    expect(submitForm).toHaveBeenCalledOnce();
  });

  test("it does not submit the form when enter key is pressed alongside a modifier key", async () => {
    const submitForm = jest.fn();
    render(
      <TextAreaWidget {...defaultProps} options={{ submitOnEnter: true }} />,
      {
        wrapper: ({ children }) => (
          <RjsfSubmitContext.Provider value={{ submitForm }}>
            {children}
          </RjsfSubmitContext.Provider>
        ),
      },
    );

    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "Some text");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    await userEvent.keyboard("{Alt>}{Enter}{/Alt}");
    expect(submitForm).not.toHaveBeenCalled();
  });
});
