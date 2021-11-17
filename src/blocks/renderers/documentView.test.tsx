/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { render, screen } from "@testing-library/react";
import React from "react";
import { getComponent } from "./documentView";

// ToDo write proper tests
test("basic test for dev purposes", () => {
  const config = {
    type: "container",
    children: [
      {
        type: "row",
        children: [
          {
            type: "column",
            children: [
              {
                type: "header_1",
                config: {
                  title: "My document",
                },
              },
              {
                type: "header_2",
                config: {
                  title: "Testing the doc",
                },
              },
            ],
          },
        ],
      },
    ],
  };

  const { Component, props } = getComponent(config);

  const { container } = render(<Component {...props} />);
  screen.debug();

  expect(container).not.toBeNull();
});
