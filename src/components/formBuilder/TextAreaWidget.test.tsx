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
import TextAreaWidget from "@/components/formBuilder/TextAreaWidget";
import { render, screen } from "@/sidebar/testHelpers";
import RjsfSubmitContext from "@/components/formBuilder/RjsfSubmitContext";
import { type WidgetProps } from "@rjsf/core";

describe("TextAreaWidget", () => {
  const defaultProps: WidgetProps = {
    id: "rjsf-textarea",
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
    rawErrors: [],
    WidgetProps: {},
    formContext: {},
    registry: {
      fields: {},
      widgets: {},
      definitions: {},
      formContext: {},
      rootSchema: {},
    },
  };

  test("renders the textarea with a label", () => {
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

    expect(screen.getByLabelText("RJSF Textarea")).toBeInTheDocument();
  });
});
