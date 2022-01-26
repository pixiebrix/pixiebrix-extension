/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { render, screen } from "@testing-library/react";
import OptionsBody from "@/options/pages/marketplace/OptionsBody";
import { MemoryRouter } from "react-router";
import { Formik } from "formik";

describe("Marketplace Activate Wizard OptionsBody", () => {
  test("renders text field", async () => {
    const rendered = render(
      <MemoryRouter>
        <Formik initialValues={{ optionsArgs: {} }} onSubmit={jest.fn()}>
          <OptionsBody
            blueprint={{
              options: {
                schema: {
                  properties: {
                    textField: {
                      title: "Text Field",
                      type: "string",
                    },
                  },
                },
              },
            }}
          />
        </Formik>
      </MemoryRouter>
    );

    expect(screen.queryByText("Text Field")).not.toBeNull();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
