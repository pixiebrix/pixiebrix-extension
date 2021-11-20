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

import { loadBrickYaml } from "@/runtime/brickYaml";
import { waitForEffect } from "@/tests/testHelpers";
import { render } from "@testing-library/react";
import React from "react";
import { getComponent } from "./documentView";

const renderDocument = (config: any) => {
  const { Component, props } = getComponent(config);
  return render(<Component {...props} />);
};

test.each`
  type          | tagName
  ${"header_1"} | ${"h1"}
  ${"header_2"} | ${"h2"}
  ${"header_3"} | ${"h3"}
`(
  "renders $tagName for $type",
  ({ type, tagName }: { type: string; tagName: string }) => {
    const config = {
      type,
      config: {
        title: "Test Header",
        className: "test-class",
      },
    };
    const rendered = renderDocument(config);

    expect(
      rendered.container.querySelector(`${tagName}.test-class`)
    ).toHaveTextContent("Test Header");
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

describe("card", () => {
  test("renders text body", () => {
    const config = {
      type: "card",
      config: {
        className: "test-class",
        heading: "Test Heading of Card",
        body: "Test body of card",
      },
    };
    const rendered = renderDocument(config);
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  // FIXME This one fails to render the pipeline, see the snapshot
  test("renders pipeline body", async () => {
    const yamlConfig = `
type: card
config:
  className: test-class
  heading: Test Heading of Card
  body: !pipeline
    - id: "@pixiebrix/markdown"
      config:
        markdown: Pipeline text for card test.`;
    const config = loadBrickYaml(yamlConfig);
    const rendered = renderDocument(config);
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
