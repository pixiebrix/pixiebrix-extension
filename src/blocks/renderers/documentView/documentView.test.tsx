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

import { render } from "@testing-library/react";
import React from "react";
import { getComponent } from "./documentView";

const renderDocument = (config: any) => {
  const { Component, props } = getComponent(config);
  return render(<Component {...props} />);
};

test.each(["header_1", "header_2", "header_3"])(
  "renders header, %s",
  (headerType: string) => {
    const config = {
      type: headerType,
      config: {
        title: "Test Header",
        className: "test-class",
      },
    };
    const rendered = renderDocument(config);
    expect(rendered.asFragment()).toMatchSnapshot();
  }
);

test("renders paragraph text", () => {
  const config = {
    type: "text",
    config: {
      text: "Test Paragraph",
      className: "test-class",
    },
  };
  const rendered = renderDocument(config);
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("renders unknown type", () => {
  const config = {
    type: "TheTypeForWhichAComponentIsNotDefined",
    className: "test-class",
  };
  const rendered = renderDocument(config);
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("renders grid", () => {
  const config = {
    type: "container",
    config: {
      className: "text-primary",
    },
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
                  title: "Header",
                },
              },
            ],
          },
        ],
      },
      {
        type: "row",
        config: {
          className: "mt-5",
        },
        children: [
          {
            type: "column",
            config: {
              className: "p-3",
            },
            children: [
              {
                type: "text",
                config: {
                  text: "left column",
                },
              },
            ],
          },
          {
            type: "column",
            config: {
              className: "p-5",
            },
            children: [
              {
                type: "text",
                config: {
                  text: "right column",
                },
              },
            ],
          },
        ],
      },
    ],
  };

  const rendered = renderDocument(config);
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("renders button", () => {
  const config = {
    type: "button",
    config: {
      title: "Button under test",
      variant: "primary",
      onClick: {
        __type__: "pipeline",
        __value__: jest.fn(),
      },
    },
  };
  const rendered = renderDocument(config);
  expect(rendered.asFragment()).toMatchSnapshot();
});
